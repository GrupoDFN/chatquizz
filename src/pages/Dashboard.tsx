import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ExternalLink, Pencil, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuizzes, createQuiz, deleteQuiz } from "@/lib/quiz-store";
import { Quiz } from "@/lib/types";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [showNewDialog, setShowNewDialog] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    setQuizzes(getQuizzes());
  }, []);

  const handleCreate = () => {
    if (!newTitle.trim()) return;
    const quiz = createQuiz(newTitle.trim());
    setQuizzes(getQuizzes());
    setNewTitle("");
    setShowNewDialog(false);
    toast({ title: "Quiz criado!", description: `"${quiz.title}" está pronto para edição.` });
    navigate(`/builder/${quiz.id}`);
  };

  const handleDelete = (id: string, title: string) => {
    deleteQuiz(id);
    setQuizzes(getQuizzes());
    toast({ title: "Quiz excluído", description: `"${title}" foi removido.` });
  };

  const handleCopyLink = (id: string) => {
    const url = `${window.location.origin}/quiz/${id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!", description: "O link do quiz foi copiado para a área de transferência." });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-semibold tracking-tight text-foreground">ChatQuiz</h1>
          </div>
          <Button onClick={() => setShowNewDialog(true)} size="sm">
            <Plus className="h-4 w-4" />
            Novo Quiz
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 sm:px-6">
        <h2 className="mb-6 text-lg font-medium text-foreground">Seus Quizzes</h2>

        {quizzes.length === 0 ? (
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
                    {new Date(quiz.createdAt).toLocaleDateString("pt-BR")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {quiz.questions.length} {quiz.questions.length === 1 ? "pergunta" : "perguntas"}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/builder/${quiz.id}`)}
                    className="text-xs"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyLink(quiz.id)}
                    className="text-xs"
                  >
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
              <Button size="sm" onClick={handleCreate} disabled={!newTitle.trim()}>
                Criar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
