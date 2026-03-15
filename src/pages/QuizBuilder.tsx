import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Eye, ChevronRight, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuiz, updateQuiz } from "@/lib/quiz-store";
import { Quiz, Question } from "@/lib/types";
import { toast } from "@/hooks/use-toast";
import { v4 as uuidv4 } from "uuid";
import QuestionCard from "@/components/builder/QuestionCard";
import FlowConnections from "@/components/builder/FlowConnections";

const QuizBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [highlightedConnection, setHighlightedConnection] = useState<{ from: string; to: string } | null>(null);
  const flowContainerRef = useRef<HTMLDivElement>(null);

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
    save({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId ? { ...q, text } : q
      ),
    });
  };

  const handleOptionLabelChange = (questionId: string, optionId: string, label: string) => {
    save({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }
          : q
      ),
    });
  };

  const handleOptionNextChange = (questionId: string, optionId: string, nextQuestionId: string | null) => {
    save({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, nextQuestionId } : o)) }
          : q
      ),
    });
  };

  const handleAddQuestion = () => {
    const questionId = uuidv4();
    const newQuestion: Question = {
      id: questionId,
      quizId: quiz.id,
      text: "Nova pergunta",
      order: quiz.questions.length,
      options: [{ id: uuidv4(), questionId, label: "Opção A", nextQuestionId: null }],
    };
    save({ ...quiz, questions: [...quiz.questions, newQuestion] });
    setSelectedQuestionId(questionId);
  };

  const handleAddOption = (questionId: string) => {
    save({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: [...q.options, { id: uuidv4(), questionId, label: "Nova opção", nextQuestionId: null }] }
          : q
      ),
    });
  };

  const handleDeleteQuestion = (questionId: string) => {
    if (quiz.questions.length <= 1) {
      toast({ title: "Erro", description: "O quiz precisa ter pelo menos uma pergunta.", variant: "destructive" });
      return;
    }
    save({
      ...quiz,
      questions: quiz.questions
        .filter((q) => q.id !== questionId)
        .map((q) => ({
          ...q,
          options: q.options.map((o) => (o.nextQuestionId === questionId ? { ...o, nextQuestionId: null } : o)),
        })),
    });
    if (selectedQuestionId === questionId) setSelectedQuestionId(null);
  };

  const handleDeleteOption = (questionId: string, optionId: string) => {
    const question = quiz.questions.find((q) => q.id === questionId);
    if (question && question.options.length <= 1) {
      toast({ title: "Erro", description: "Precisa ter pelo menos uma opção.", variant: "destructive" });
      return;
    }
    save({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId ? { ...q, options: q.options.filter((o) => o.id !== optionId) } : q
      ),
    });
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const getQuestionLabel = (qId: string) => {
    const idx = quiz.questions.findIndex((q) => q.id === qId);
    return idx >= 0 ? `P${idx + 1}` : "?";
  };

  // Build connections for the flow visualization
  const connections = quiz.questions.flatMap((q) =>
    q.options
      .filter((o) => o.nextQuestionId)
      .map((o) => ({
        fromQuestionId: q.id,
        toQuestionId: o.nextQuestionId!,
        optionLabel: o.label,
      }))
  );

  const selectedQuestion = quiz.questions.find((q) => q.id === selectedQuestionId);

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <input
              type="text"
              value={quiz.title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="bg-transparent text-lg font-medium text-foreground outline-none border-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyLink}>
              <LinkIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Link</span>
            </Button>
            <Button size="sm" onClick={() => navigate(`/quiz/${quiz.id}`)}>
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">Preview</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content: Flow View + Editor Panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Flow View (Left) */}
        <div ref={flowContainerRef} className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-xl space-y-3">
            {/* Flow Map Header */}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Fluxo do Quiz</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {quiz.questions.length} {quiz.questions.length === 1 ? "pergunta" : "perguntas"}
              </span>
            </div>

            {/* Question Flow Cards */}
            {quiz.questions.map((question, qIndex) => (
              <div key={question.id}>
                <button
                  onClick={() => setSelectedQuestionId(question.id === selectedQuestionId ? null : question.id)}
                  onMouseEnter={() => {
                    // Highlight all connections from this question
                    const conn = connections.find((c) => c.fromQuestionId === question.id);
                    if (conn) setHighlightedConnection({ from: conn.fromQuestionId, to: conn.toQuestionId });
                  }}
                  onMouseLeave={() => setHighlightedConnection(null)}
                  className={`w-full text-left rounded-card p-4 transition-all duration-200 ${
                    selectedQuestionId === question.id
                      ? "bg-card shadow-card-hover ring-2 ring-primary"
                      : "bg-card shadow-card hover:shadow-card-hover"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
                      {qIndex + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{question.text}</p>
                        {qIndex === 0 && (
                          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                            Início
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {question.options.map((opt) => (
                          <span
                            key={opt.id}
                            className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] text-muted-foreground"
                          >
                            {opt.label}
                            <ChevronRight className="h-3 w-3" />
                            <span className={`font-medium ${opt.nextQuestionId ? "text-primary" : "text-destructive/70"}`}>
                              {opt.nextQuestionId ? getQuestionLabel(opt.nextQuestionId) : "Fim"}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                {/* Connection indicator */}
                {qIndex < quiz.questions.length - 1 && (
                  <FlowConnections
                    question={question}
                    allQuestions={quiz.questions}
                    currentIndex={qIndex}
                  />
                )}
              </div>
            ))}

            {/* Add Question Button */}
            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleAddQuestion} className="rounded-card">
                <Plus className="h-4 w-4" />
                Adicionar pergunta
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Panel (Right) */}
        <div
          className={`border-l border-border bg-card transition-all duration-300 ease-out overflow-y-auto ${
            selectedQuestion ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
          }`}
        >
          {selectedQuestion && (
            <QuestionCard
              question={selectedQuestion}
              questionIndex={quiz.questions.indexOf(selectedQuestion)}
              allQuestions={quiz.questions}
              onTextChange={(text) => handleQuestionTextChange(selectedQuestion.id, text)}
              onOptionLabelChange={(optionId, label) => handleOptionLabelChange(selectedQuestion.id, optionId, label)}
              onOptionNextChange={(optionId, nextId) => handleOptionNextChange(selectedQuestion.id, optionId, nextId)}
              onAddOption={() => handleAddOption(selectedQuestion.id)}
              onDeleteOption={(optionId) => handleDeleteOption(selectedQuestion.id, optionId)}
              onDeleteQuestion={() => handleDeleteQuestion(selectedQuestion.id)}
              onClose={() => setSelectedQuestionId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default QuizBuilder;
