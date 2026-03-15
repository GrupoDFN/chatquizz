import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Link as LinkIcon, Eye, ChevronRight, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getQuizFull, updateQuizTitle, updateQuizTheme, updateQuizAvatar, updateQuizVerifiedBadge, uploadAvatar, updateQuestionText, updateQuestionPreMessages, addQuestion, addOption, updateOption, deleteQuestion, deleteOption, QuizWithQuestionsAndOptions } from "@/lib/quiz-api";
import { toast } from "@/hooks/use-toast";
import ThemePicker from "@/components/builder/ThemePicker";
import QuestionCard from "@/components/builder/QuestionCard";
import FlowConnections from "@/components/builder/FlowConnections";

const QuizBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizWithQuestionsAndOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);

  const loadQuiz = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      const data = await getQuizFull(id);
      if (data) setQuiz(data);
      else navigate("/");
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
      navigate("/");
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!quiz) return null;

  const handleTitleChange = async (title: string) => {
    setQuiz({ ...quiz, title });
    try {
      await updateQuizTitle(quiz.id, title);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleThemeChange = async (theme: string) => {
    setQuiz({ ...quiz, theme });
    try {
      await updateQuizTheme(quiz.id, theme);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(quiz.id, file);
      await updateQuizAvatar(quiz.id, url);
      setQuiz({ ...quiz, avatar_url: url });
      toast({ title: "Avatar atualizado!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleVerifiedToggle = async () => {
    const newVal = !quiz.show_verified_badge;
    setQuiz({ ...quiz, show_verified_badge: newVal });
    try {
      await updateQuizVerifiedBadge(quiz.id, newVal);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleQuestionTextChange = async (questionId: string, text: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, text } : q)),
    });
    try {
      await updateQuestionText(questionId, text);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handlePreMessagesChange = async (questionId: string, preMessages: string[]) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, pre_messages: preMessages } : q)),
    });
    try {
      await updateQuestionPreMessages(questionId, preMessages);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleOptionLabelChange = async (questionId: string, optionId: string, label: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) }
          : q
      ),
    });
    try {
      await updateOption(optionId, { label });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleOptionNextChange = async (questionId: string, optionId: string, nextQuestionId: string | null) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId
          ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, next_question_id: nextQuestionId } : o)) }
          : q
      ),
    });
    try {
      await updateOption(optionId, { next_question_id: nextQuestionId });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAddQuestion = async () => {
    try {
      const newQ = await addQuestion(quiz.id, quiz.questions.length);
      await loadQuiz();
      setSelectedQuestionId(newQ.id);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleAddOption = async (questionId: string) => {
    try {
      await addOption(questionId);
      await loadQuiz();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (quiz.questions.length <= 1) {
      toast({ title: "Erro", description: "O quiz precisa ter pelo menos uma pergunta.", variant: "destructive" });
      return;
    }
    try {
      await deleteQuestion(questionId);
      if (selectedQuestionId === questionId) setSelectedQuestionId(null);
      await loadQuiz();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDeleteOption = async (questionId: string, optionId: string) => {
    const question = quiz.questions.find((q) => q.id === questionId);
    if (question && question.options.length <= 1) {
      toast({ title: "Erro", description: "Precisa ter pelo menos uma opção.", variant: "destructive" });
      return;
    }
    try {
      await deleteOption(optionId);
      await loadQuiz();
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
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

  const connections = quiz.questions.flatMap((q) =>
    q.options
      .filter((o) => o.next_question_id)
      .map((o) => ({ fromQuestionId: q.id, toQuestionId: o.next_question_id! }))
  );

  const selectedQuestion = quiz.questions.find((q) => q.id === selectedQuestionId);

  return (
    <div className="flex h-screen flex-col bg-background">
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
            <Button variant="ghost" size="sm" onClick={() => setShowThemePicker(!showThemePicker)}>
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Tema</span>
            </Button>
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

      <div className="flex flex-1 overflow-hidden">
        {/* Flow View */}
        <div className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-xl space-y-3">
            {showThemePicker && (
              <div className="mb-4 rounded-card bg-card p-4 shadow-card space-y-5">
                <div>
                  <h3 className="mb-3 text-sm font-medium text-foreground">Tema do Chat</h3>
                  <ThemePicker
                    selectedTheme={quiz.theme || "dark-social"}
                    onSelectTheme={handleThemeChange}
                  />
                </div>

                {/* Avatar & Badge */}
                <div className="border-t border-border pt-4">
                  <h3 className="mb-3 text-sm font-medium text-foreground">Avatar e Verificação</h3>
                  <div className="flex items-center gap-4">
                    <label className="group relative cursor-pointer">
                      <div className="h-14 w-14 rounded-full bg-muted flex items-center justify-center overflow-hidden ring-2 ring-border group-hover:ring-primary transition-colors">
                        {quiz.avatar_url ? (
                          <img src={quiz.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-xs text-muted-foreground">Foto</span>
                        )}
                      </div>
                      <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                      <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-[10px]">+</span>
                    </label>
                    <div className="flex-1 space-y-1">
                      <p className="text-xs text-muted-foreground">Clique para enviar uma foto de avatar</p>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={quiz.show_verified_badge}
                          onChange={handleVerifiedToggle}
                          className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-sm text-foreground">Mostrar selo de verificado ✓</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground">Fluxo do Quiz</h2>
              <span className="text-xs tabular-nums text-muted-foreground">
                {quiz.questions.length} {quiz.questions.length === 1 ? "pergunta" : "perguntas"}
              </span>
            </div>

            {quiz.questions.map((question, qIndex) => (
              <div key={question.id}>
                <button
                  onClick={() => setSelectedQuestionId(question.id === selectedQuestionId ? null : question.id)}
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
                        {question.is_start_node && (
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
                            <span className={`font-medium ${opt.next_question_id ? "text-primary" : "text-destructive/70"}`}>
                              {opt.next_question_id ? getQuestionLabel(opt.next_question_id) : "Fim"}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>

                {qIndex < quiz.questions.length - 1 && (
                  <FlowConnections
                    question={question}
                    allQuestions={quiz.questions}
                    currentIndex={qIndex}
                  />
                )}
              </div>
            ))}

            <div className="flex justify-center pt-2">
              <Button variant="outline" onClick={handleAddQuestion} className="rounded-card">
                <Plus className="h-4 w-4" />
                Adicionar pergunta
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Panel */}
        <div
          className={`border-l border-border bg-card transition-all duration-300 ease-out overflow-y-auto ${
            selectedQuestion ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
          }`}
        >
          {selectedQuestion && (
            <QuestionCard
              question={selectedQuestion}
              questionIndex={quiz.questions.indexOf(selectedQuestion)}
              allQuestions={quiz.questions.map((q) => ({
                id: q.id,
                text: q.text,
                options: q.options,
                pre_messages: q.pre_messages,
              }))}
              onTextChange={(text) => handleQuestionTextChange(selectedQuestion.id, text)}
              onPreMessagesChange={(preMessages) => handlePreMessagesChange(selectedQuestion.id, preMessages)}
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
