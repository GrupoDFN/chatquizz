import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Eye, Users, MousePointerClick, TrendingUp, MessageSquare, RefreshCw, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuizFull, QuizWithQuestionsAndOptions } from "@/lib/quiz-api";
import { getQuizMetrics, QuizMetrics } from "@/lib/quiz-tracking";
import { toast } from "@/hooks/use-toast";

const QuizLeads = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizWithQuestionsAndOptions | null>(null);
  const [metrics, setMetrics] = useState<QuizMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [days, setDays] = useState(7);

  const loadData = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const [quizData, metricsData] = await Promise.all([
        getQuizFull(id),
        getQuizMetrics(id, days),
      ]);
      if (quizData) setQuiz(quizData);
      else navigate("/");
      setMetrics(metricsData);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [id, days, navigate]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleExportCSV = () => {
    if (!metrics || !quiz) return;
    const headers = ["ID", "Data", ...metrics.stepsData.map((s) => `Etapa ${s.stepOrder}`)];
    const rows = metrics.sessions.map((s) => {
      const cols = [s.sessionId, new Date(s.firstInteraction).toLocaleDateString("pt-BR")];
      metrics.stepsData.forEach((step) => {
        const resp = s.responses.find((r) => r.questionId === step.questionId);
        cols.push(resp?.optionLabel ?? "");
      });
      return cols;
    });
    const csv = [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-${quiz.title.replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!quiz || !metrics) return null;

  const statCards = [
    { icon: Eye, label: "Visitas e Acessos", value: metrics.totalViews, sub: "Visitantes que acessaram o funil" },
    { icon: Users, label: "Leads adquiridos", value: metrics.totalSessions, sub: "Iniciaram alguma interação" },
    { icon: MousePointerClick, label: "Taxa de interação", value: metrics.totalViews > 0 ? `${Math.round((metrics.totalSessions / metrics.totalViews) * 100)}%` : "0%", sub: "Visitantes que interagiram" },
    { icon: TrendingUp, label: "Fluxos completos", value: metrics.sessions.filter((s) => s.stepsCompleted >= metrics.stepsData.length).length, sub: "Passaram da última etapa" },
  ];

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card z-10">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/builder/${id}`)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-lg font-medium text-foreground">{quiz.title}</h1>
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Leads</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={loadData}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => (
            <div key={card.label} className="rounded-xl border border-border bg-card p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">{card.label}</span>
                <card.icon className="h-4 w-4 text-muted-foreground/50" />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-[11px] text-muted-foreground">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Time filter */}
        <div className="flex items-center justify-end gap-2">
          {[
            { label: "30 dias", value: 30 },
            { label: "7 dias", value: 7 },
            { label: "24 horas", value: 1 },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => setDays(opt.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                days === opt.value
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Funnel Table */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="sticky left-0 bg-muted/30 px-4 py-3 text-left font-medium text-muted-foreground min-w-[60px]">—</th>
                  <th className="sticky left-[60px] bg-muted/30 px-4 py-3 text-left font-medium text-muted-foreground min-w-[120px]">Entrada</th>
                  {metrics.stepsData.map((step, i) => (
                    <th key={step.questionId} className="px-4 py-3 text-left min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">{i + 1}</span>
                        <span className="font-medium text-foreground truncate max-w-[140px]">Etapa_{String(i + 1).padStart(2, "0")}</span>
                        <span className={`text-xs font-bold ${step.percentage >= 80 ? "text-green-500" : step.percentage >= 50 ? "text-yellow-500" : "text-red-500"}`}>
                          {step.percentage}%
                        </span>
                        {/* Mini ring */}
                        <svg className="h-5 w-5 -rotate-90" viewBox="0 0 20 20">
                          <circle cx="10" cy="10" r="8" fill="none" strokeWidth="2" className="stroke-muted" />
                          <circle
                            cx="10" cy="10" r="8" fill="none" strokeWidth="2"
                            className={step.percentage >= 80 ? "stroke-green-500" : step.percentage >= 50 ? "stroke-yellow-500" : "stroke-red-500"}
                            strokeDasharray={`${(step.percentage / 100) * 50.27} 50.27`}
                            strokeLinecap="round"
                          />
                        </svg>
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <MessageSquare className="h-3 w-3 text-muted-foreground/50" />
                        <span className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                          {step.questionText.length > 30 ? step.questionText.slice(0, 30) + "…" : step.questionText}
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {metrics.sessions.length === 0 ? (
                  <tr>
                    <td colSpan={metrics.stepsData.length + 2} className="px-4 py-12 text-center text-muted-foreground">
                      Nenhuma interação registrada ainda.
                    </td>
                  </tr>
                ) : (
                  metrics.sessions.slice(0, 50).map((session, rowIdx) => (
                    <tr key={session.sessionId} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="sticky left-0 bg-card px-4 py-3 text-xs text-muted-foreground font-mono">{rowIdx + 1}</td>
                      <td className="sticky left-[60px] bg-card px-4 py-3">
                        <div className="space-y-0.5">
                          <span className="text-xs font-mono font-medium text-primary">{session.sessionId}</span>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(session.firstInteraction).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      </td>
                      {metrics.stepsData.map((step) => {
                        const resp = session.responses.find((r) => r.questionId === step.questionId);
                        return (
                          <td key={step.questionId} className="px-4 py-3">
                            {resp ? (
                              <span className="inline-block rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary truncate max-w-[180px]">
                                {resp.optionLabel}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground/30">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {metrics.sessions.length > 50 && (
          <p className="text-center text-xs text-muted-foreground">
            Mostrando 50 de {metrics.sessions.length} sessões. Exporte o CSV para ver todas.
          </p>
        )}
      </div>
    </div>
  );
};

export default QuizLeads;
