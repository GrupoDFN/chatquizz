import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, GripVertical, Link as LinkIcon, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuiz, updateQuiz, addQuestion, addOption } from "@/lib/quiz-store";
import { Quiz, Question, Option } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";

const QuizBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);

  useEffect(() => {
    if (id) {
      const q = getQuiz(id);
      if (q) setQuiz(q);
      else navigate("/");
    }
  }, [id, navigate]);

  if (!quiz) return null;

  const save = (updated: Quiz) => {
    setQuiz(updated);
    updateQuiz(updated);
  };

  const handleTitleChange = (title: string) => {
    save({ ...quiz, title });
  };

  const handleQuestionTextChange = (questionId: string, text: string) => {
    const updated = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId ? { ...q, text } : q
      ),
    };
    save(updated);
  };

  const handleOptionLabelChange = (questionId: string, optionId: string, label: string) => {
    const updated = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, label } : o
              ),
            }
          : q
      ),
    };
    save(updated);
  };

  const handleOptionNextChange = (questionId: string, optionId: string, nextQuestionId: string | null) => {
    const updated = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, nextQuestionId } : o
              ),
            }
          : q
      ),
    };
    save(updated);
  };

  const handleAddQuestion = () => {
    const questionId = uuidv4();
    const newQuestion: Question = {
      id: questionId,
      quizId: quiz.id,
      text: "Nova pergunta",
      order: quiz.questions.length,
      options: [
        { id: uuidv4(), questionId, label: "Opção A", nextQuestionId: null },
      ],
    };
    save({ ...quiz, questions: [...quiz.questions, newQuestion] });
  };

  const handleAddOption = (questionId: string) => {
    const updated = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: uuidv4(), questionId, label: "Nova opção", nextQuestionId: null },
              ],
            }
          : q
      ),
    };
    save(updated);
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (quiz.questions.length <= 1) {
      toast({ title: "Erro", description: "O quiz precisa ter pelo menos uma pergunta.", variant: "destructive" });
      return;
    }
    const updated = {
      ...quiz,
      questions: quiz.questions
        .filter((q) => q.id !== questionId)
        .map((q) => ({
          ...q,
          options: q.options.map((o) =>
            o.nextQuestionId === questionId ? { ...o, nextQuestionId: null } : o
          ),
        })),
    };
    save(updated);
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    const question = quiz.questions.find((q) => q.id === questionId);
    if (question && question.options.length <= 1) {
      toast({ title: "Erro", description: "A pergunta precisa ter pelo menos uma opção.", variant: "destructive" });
      return;
    }
    const updated = {
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.filter((o) => o.id !== optionId) }
          : q
      ),
    };
    save(updated);
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b border-border bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-transparent text-lg font-medium text-foreground outline-none border-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              <LinkIcon className="h-4 w-4" />
              Link
            </Button>
            <Button size="sm" onClick={() => navigate(`/quiz/${quiz.id}`)}>
              Preview
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-2xl px-4 py-8 sm:px-6">
        <div className="space-y-4">
          {quiz.questions.map((question, qIndex) => (
            <div
              key={question.id}
              className="rounded-card bg-card p-5 shadow-card animate-fade-in"
            >
              {/* Question Header */}
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
                    {qIndex + 1}
                  </span>
                  {qIndex === 0 && (
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                      Início
                    </span>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteQuestion(question.id)}
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Question Text */}
              <textarea
                value={question.text}
                onChange={(e) => handleQuestionTextChange(question.id, e.target.value)}
                placeholder="Texto da pergunta..."
                rows={2}
                className="mb-4 w-full resize-none rounded-inner bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
              />

              {/* Options */}
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground mb-2">Opções de resposta</p>
                {question.options.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={option.label}
                      onChange={(e) => handleOptionLabelChange(question.id, option.id, e.target.value)}
                      className="flex-1 rounded-inner bg-secondary px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                      value={option.nextQuestionId || ""}
                      onChange={(e) =>
                        handleOptionNextChange(question.id, option.id, e.target.value || null)
                      }
                      className="w-36 rounded-inner bg-secondary px-2 py-2 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option value="">Fim do quiz</option>
                      {quiz.questions
                        .filter((q) => q.id !== question.id)
                        .map((q, i) => (
                          <option key={q.id} value={q.id}>
                            → Pergunta {quiz.questions.indexOf(q) + 1}
                          </option>
                        ))}
                    </select>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteOption(question.id, option.id)}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleAddOption(question.id)}
                  className="mt-1 text-xs text-muted-foreground"
                >
                  <Plus className="h-3 w-3" />
                  Adicionar opção
                </Button>
              </div>

              {/* Connection line */}
              {qIndex < quiz.questions.length - 1 && (
                <div className="mt-4 flex justify-center">
                  <div className="h-6 w-px border-l-2 border-dashed border-primary/30" />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add Question */}
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={handleAddQuestion} className="rounded-card">
            <Plus className="h-4 w-4" />
            Adicionar pergunta
          </Button>
        </div>
      </main>
    </div>
  );
};

export default QuizBuilder;
