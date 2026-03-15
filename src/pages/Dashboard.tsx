import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Pencil, Trash2, MessageSquare, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { getUserQuizzes, createQuiz, deleteQuiz } from "@/lib/quiz-api";
import { toast } from "@/hooks/use-toast";

interface QuizRow {
  id: string;
  title: string;
  created_at: string;
}

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState<QuizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { user, signOut } = useAuth();

  const loadQuizzes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getUserQuizzes();
      setQuizzes(data);
    } catch (err: any) {
      toast({ title: "Erro ao carregar quizzes", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, []);

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

  const handleDelete = async (id: string, title: string) => {
    try {
      await deleteQuiz(id);
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
      toast({ title: "Quiz excluído", description: `"${title}" foi removido.` });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
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
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">ChatQuiz</h1>
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
            <MessageSquare className="mb-4 h-12 w-12 text-muted-foreground/40" />
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
                <div className="mb-4">
                  <h3 className="text-base font-medium text-foreground truncate">{quiz.title}</h3>
                  <p className="mt-1 text-xs tabular-nums text-muted-foreground">
                    {new Date(quiz.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate(`/builder/${quiz.id}`)} className="text-xs">
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleCopyLink(quiz.id)} className="text-xs">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Link
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(quiz.id, quiz.title)}
                    className="text-xs text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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
    </div>
  );
};

export default Dashboard;
