import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Link as LinkIcon, Eye, Palette, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  getQuizFull,
  updateQuizTitle,
  updateQuizTheme,
  updateQuizAvatar,
  updateQuizVerifiedBadge,
  updateQuizEndScreen,
  uploadAvatar,
  updateQuestionText,
  updateQuestionPreMessages,
  addQuestion,
  addOption,
  updateOption,
  deleteQuestion,
  deleteOption,
  QuizWithQuestionsAndOptions,
} from "@/lib/quiz-api";
import { toast } from "@/hooks/use-toast";
import ThemePicker from "@/components/builder/ThemePicker";
import QuestionCard from "@/components/builder/QuestionCard";
import EndScreenEditor from "@/components/builder/EndScreenEditor";
import FlowEditor from "@/components/builder/FlowEditor";
import TextCard from "@/components/builder/TextCard";

const QuizBuilder = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizWithQuestionsAndOptions | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [showEndScreenEditor, setShowEndScreenEditor] = useState(false);

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

  /* ── Handlers ── */
  const handleTitleChange = async (title: string) => {
    setQuiz({ ...quiz, title });
    try { await updateQuizTitle(quiz.id, title); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleThemeChange = async (theme: string) => {
    setQuiz({ ...quiz, theme });
    try { await updateQuizTheme(quiz.id, theme); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const url = await uploadAvatar(quiz.id, file);
      await updateQuizAvatar(quiz.id, url);
      setQuiz({ ...quiz, avatar_url: url });
      toast({ title: "Avatar atualizado!" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleVerifiedToggle = async () => {
    const newVal = !quiz.show_verified_badge;
    setQuiz({ ...quiz, show_verified_badge: newVal });
    try { await updateQuizVerifiedBadge(quiz.id, newVal); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleEndScreenChange = async (key: string, value: string | boolean) => {
    setQuiz({ ...quiz, [key]: value } as any);
    try { await updateQuizEndScreen(quiz.id, { [key]: value } as any); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleQuestionTextChange = async (questionId: string, text: string) => {
    setQuiz({ ...quiz, questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, text } : q)) });
    try { await updateQuestionText(questionId, text); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handlePreMessagesChange = async (questionId: string, preMessages: string[]) => {
    setQuiz({ ...quiz, questions: quiz.questions.map((q) => (q.id === questionId ? { ...q, pre_messages: preMessages } : q)) });
    try { await updateQuestionPreMessages(questionId, preMessages); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleOptionLabelChange = async (questionId: string, optionId: string, label: string) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, label } : o)) } : q
      ),
    });
    try { await updateOption(optionId, { label }); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleOptionNextChange = async (questionId: string, optionId: string, nextQuestionId: string | null) => {
    setQuiz({
      ...quiz,
      questions: quiz.questions.map((q) =>
        q.id === questionId ? { ...q, options: q.options.map((o) => (o.id === optionId ? { ...o, next_question_id: nextQuestionId } : o)) } : q
      ),
    });
    try { await updateOption(optionId, { next_question_id: nextQuestionId }); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleConnectionChange = async (optionId: string, nextQuestionId: string | null) => {
    // Find the question that owns this option
    const ownerQ = quiz.questions.find((q) => q.options.some((o) => o.id === optionId));
    if (ownerQ) {
      await handleOptionNextChange(ownerQ.id, optionId, nextQuestionId);
    }
  };

  const handleAddCard = async (type: "question" | "text") => {
    try {
      const newQ = await addQuestion(quiz.id, quiz.questions.length, type);
      await loadQuiz();
      setSelectedQuestionId(newQ.id);
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleAddOption = async (questionId: string) => {
    try { await addOption(questionId); await loadQuiz(); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
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
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleDeleteOption = async (questionId: string, optionId: string) => {
    const question = quiz.questions.find((q) => q.id === questionId);
    if (question && question.options.length <= 1) {
      toast({ title: "Erro", description: "Precisa ter pelo menos uma opção.", variant: "destructive" });
      return;
    }
    try { await deleteOption(optionId); await loadQuiz(); }
    catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
  };

  const handleCopyLink = () => {
    const url = `${window.location.origin}/quiz/${quiz.id}`;
    navigator.clipboard.writeText(url);
    toast({ title: "Link copiado!" });
  };

  const selectedQuestion = quiz.questions.find((q) => q.id === selectedQuestionId);

  /* ── Determine which overlay panel is open ── */
  const showSidePanel = selectedQuestion || showThemePicker || showEndScreenEditor;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="shrink-0 border-b border-border bg-card z-10">
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
            <Button
              variant={showThemePicker ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setShowThemePicker(!showThemePicker);
                setShowEndScreenEditor(false);
                setSelectedQuestionId(null);
              }}
            >
              <Palette className="h-4 w-4" />
              <span className="hidden sm:inline">Tema</span>
            </Button>
            <Button
              variant={showEndScreenEditor ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setShowEndScreenEditor(!showEndScreenEditor);
                setShowThemePicker(false);
                setSelectedQuestionId(null);
              }}
            >
              <PartyPopper className="h-4 w-4" />
              <span className="hidden sm:inline">Tela Final</span>
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
        {/* Flow Canvas */}
        <div className="flex-1">
          <FlowEditor
            questions={quiz.questions}
            selectedQuestionId={selectedQuestionId}
            onSelectQuestion={(id) => {
              setSelectedQuestionId(id);
              if (id) {
                setShowThemePicker(false);
                setShowEndScreenEditor(false);
              }
            }}
            onConnectionChange={handleConnectionChange}
            onAddCard={handleAddCard}
          />
        </div>

        {/* Side Panel */}
        <div
          className={`border-l border-border bg-card transition-all duration-300 ease-out overflow-y-auto ${
            showSidePanel ? "w-[400px] opacity-100" : "w-0 opacity-0 overflow-hidden"
          }`}
        >
          {showThemePicker && (
            <div className="p-5 space-y-5">
              <h3 className="text-sm font-medium text-foreground">Tema do Chat</h3>
              <ThemePicker selectedTheme={quiz.theme || "dark-social"} onSelectTheme={handleThemeChange} />
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
                      <input type="checkbox" checked={quiz.show_verified_badge} onChange={handleVerifiedToggle} className="h-4 w-4 rounded border-border text-primary focus:ring-primary" />
                      <span className="text-sm text-foreground">Mostrar selo de verificado ✓</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {showEndScreenEditor && (
            <div className="p-5">
              <h3 className="mb-3 text-sm font-medium text-foreground">Tela Final do Quiz</h3>
              <EndScreenEditor
                config={{
                  end_screen_template: quiz.end_screen_template || "congrats-green",
                  end_screen_title: quiz.end_screen_title || "Você foi selecionada!",
                  end_screen_subtitle: quiz.end_screen_subtitle || "Sua vaga está garantida",
                  analysis_title: quiz.analysis_title || "ANALISANDO",
                  analysis_subtitle: quiz.analysis_subtitle || "Sistema em processamento",
                  show_analysis_card: quiz.show_analysis_card ?? true,
                  show_congrats_card: quiz.show_congrats_card ?? true,
                }}
                onChange={handleEndScreenChange}
              />
            </div>
          )}

          {selectedQuestion && selectedQuestion.type === "text" ? (
            <TextCard
              questionId={selectedQuestion.id}
              text={selectedQuestion.text}
              questionIndex={quiz.questions.indexOf(selectedQuestion)}
              onTextChange={(text) => handleQuestionTextChange(selectedQuestion.id, text)}
              onDeleteQuestion={() => handleDeleteQuestion(selectedQuestion.id)}
              onClose={() => setSelectedQuestionId(null)}
            />
          ) : selectedQuestion ? (
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
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default QuizBuilder;
