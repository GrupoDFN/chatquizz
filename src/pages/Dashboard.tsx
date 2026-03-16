import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, LogOut, MoreVertical, Pencil, Eye, Copy, Share2, Trash2, BarChart3, Link } from "lucide-react";
import chatFunnelLogo from "@/assets/logo-chatfunnel.png";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { getUserQuizzes, createQuiz, deleteQuiz, duplicateQuiz } from "@/lib/quiz-api";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import ShareDialog from "@/components/ShareDialog";

interface QuizRow {
  id: string;
  title: string;
  created_at: string;
  isShared?: boolean;
  isCopy?: boolean;
  permission?: string;
}

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [shareQuiz, setShareQuiz] = useState<{ id: string; title: string } | null>(null);
  const fulfillingRef = useRef(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const loadQuizzes = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);

      // Fulfill pending copy shares — use a ref guard to prevent concurrent runs
      if (!fulfillingRef.current) {
        fulfillingRef.current = true;
        try {
          const { data: pendingCopies } = await (supabase
            .from("quiz_shares")
            .select("id, quiz_id")
            .eq("shared_with_user_id", user.id)
            .eq("permission", "copy") as any)
            .eq("fulfilled", false);

          if (pendingCopies && pendingCopies.length > 0) {
            for (const share of pendingCopies) {
              try {
                await duplicateQuiz(share.quiz_id, user.id, true);
                // Remove pending share after successful duplication
                await supabase.from("quiz_shares").delete().eq("id", share.id);
              } catch {
                // keep pending share to retry later
              }
            }
          }
        } finally {
          fulfillingRef.current = false;
        }
      }

      // Own quizzes (includes newly duplicated ones)
      const ownData = await getUserQuizzes();
      const ownQuizzes: QuizRow[] = ownData.map((q: any) => ({
        ...q,
        isShared: false,
        isCopy: q.is_copy === true,
      }));

      // Shared quizzes (edit mode only)
      const { data: shares } = await supabase
        .from("quiz_shares")
        .select("quiz_id, permission")
        .eq("shared_with_user_id", user.id)
        .eq("permission", "edit");

      let sharedQuizzes: QuizRow[] = [];
      if (shares && shares.length > 0) {
        const sharedIds = shares.map((s: any) => s.quiz_id);
        const { data: sharedData } = await supabase
          .from("quizzes")
          .select("id, title, created_at")
          .in("id", sharedIds);
        sharedQuizzes = (sharedData ?? []).map((q) => ({
          ...q,
          isShared: true,
          permission: "edit",
        }));
      }

      setQuizzes([...ownQuizzes, ...sharedQuizzes]);
    } catch (err: any) {
      toast({ title: "Erro ao carregar quizzes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadQuizzes();
  }, [loadQuizzes]);

  const handleCreate = async () => {
    if (!newTitle.trim() || !user) return;
    setCreating(true);
    try {
      const quiz = await createQuiz(newTitle.trim(), user.id);
      setNewTitle("");
      setShowNewDialog(false);
      toast({ title: "Quiz criado!" });
      navigate(`/builder/${quiz.id}`);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, title: string, isShared?: boolean) => {
    try {
      if (isShared && user) {
        // Remove the share entry, not the quiz itself
        await supabase.from("quiz_shares").delete().eq("quiz_id", id).eq("shared_with_user_id", user.id);
      } else {
        await deleteQuiz(id);
      }
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast({ title: isShared ? "Quiz removido do seu painel" : "Quiz excluído", description: `"${title}" foi removido.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDuplicate = async (id: string) => {
    if (!user) return;
    try {
      const newQuiz = await duplicateQuiz(id, user.id);
      setQuizzes((prev) => [newQuiz, ...prev]);
      toast({ title: "Quiz duplicado!", description: `"${newQuiz.title}" foi criado.` });
    } catch (err: any) {
      toast({ title: "Erro ao duplicar", description: err.message, variant: "destructive" });
    }
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/quiz/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <img src={chatFunnelLogo} alt="ChatFunnel" style={{ height: '130px', marginTop: '-35px', marginBottom: '-35px' }} />
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-xs text-muted-foreground sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
            <Button onClick={() => setShowNewDialog(true)} size="sm">
              <Plus className="h-4 w-4" />
              Novo Quiz
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-lg font-medium text-foreground">Seus Quizzes</h2>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-card bg-card p-12 shadow-card">
            <img src={chatFunnelLogo} alt="ChatFunnel" className="mb-4 h-12 opacity-40" />
            <p className="mb-2 text-base font-medium text-foreground">Nenhum quiz ainda</p>
            <p className="mb-6 text-sm text-muted-foreground">Crie seu primeiro quiz conversacional</p>
            <Button onClick={() => setShowNewDialog(true)}>
              <Plus className="h-4 w-4" />
              Criar Quiz
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {quizzes.map((quiz) => (
              <div
                key={quiz.id}
                className="group rounded-card bg-card p-6 shadow-card transition-shadow duration-200 hover:shadow-card-hover"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-base font-medium text-foreground truncate">{quiz.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs tabular-nums text-muted-foreground">
                        {new Date(quiz.created_at).toLocaleDateString("pt-BR")}
                      </p>
                      {quiz.isShared && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                          Compartilhado
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      {!quiz.isCopy && (
                        <DropdownMenuItem onClick={() => navigate(`/builder/${quiz.id}`)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => window.open(`/quiz/${quiz.id}`, "_blank")}>
                        <Eye className="mr-2 h-4 w-4" />
                        Visualizar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyLink(quiz.id)}>
                        <Link className="mr-2 h-4 w-4" />
                        Copiar Link do Funil
                      </DropdownMenuItem>
                      {!quiz.isCopy && (
                        <>
                          <DropdownMenuItem onClick={() => handleDuplicate(quiz.id)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setShareQuiz({ id: quiz.id, title: quiz.title })}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Compartilhar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/leads/${quiz.id}`)}>
                            <BarChart3 className="mr-2 h-4 w-4" />
                            Leads
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(quiz.id, quiz.title, quiz.isShared)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {quiz.isShared ? "Remover" : "Excluir"}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* New Quiz Dialog */}
      {showNewDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-card bg-card p-6 shadow-card-hover animate-message-in">
            <h3 className="mb-4 text-lg font-medium text-foreground">Novo Quiz</h3>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              placeholder="Nome do quiz..."
              autoFocus
              className="mb-4 w-full rounded-inner border-none bg-secondary px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setShowNewDialog(false); setNewTitle(""); }}>
                Cancelar
              </Button>
              <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim() || creating}>
                {creating ? "Criando..." : "Criar"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Share Dialog */}
      <ShareDialog
        quizId={shareQuiz?.id ?? ""}
        quizTitle={shareQuiz?.title ?? ""}
        open={!!shareQuiz}
        onClose={() => setShareQuiz(null)}
      />
    </div>
  );
};

export default Dashboard;
