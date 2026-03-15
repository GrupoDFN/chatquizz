import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getQuizFull, QuizWithQuestionsAndOptions } from "@/lib/quiz-api";
import { getThemeById, ChatTheme } from "@/lib/chat-themes";
import { getEndScreenTemplate } from "@/lib/end-screen-templates";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Database, Crown, Star, Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  type: "bot" | "user" | "analysis-card" | "congrats-card";
  text: string;
}

interface QuestionWithOptions {
  id: string;
  text: string;
  is_start_node: boolean;
  pre_messages: string[];
  options: { id: string; label: string; next_question_id: string | null }[];
}

const TypingIndicator = ({ theme }: { theme: ChatTheme }) => (
  <div className="flex items-start gap-3 self-start">
    <div className="h-9 w-9 shrink-0" />
    <div className={`flex items-center gap-1 rounded-2xl rounded-tl px-4 py-3 shadow-sm w-fit ${theme.styles.botBubble}`}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className={`block h-2 w-2 rounded-full ${theme.styles.typingDot}`}
          style={{ animation: "typing-bounce 1.4s infinite", animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  </div>
);

const BotBubble = ({ text, theme, showAvatar, avatarUrl }: { text: string; theme: ChatTheme; showAvatar: boolean; avatarUrl?: string | null }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    className="flex items-start gap-3 self-start max-w-[85%]"
  >
    <div className="h-9 w-9 shrink-0">
      {showAvatar && (
        <div className={`h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold overflow-hidden ${theme.styles.avatarBg} ${theme.styles.avatarText}`}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            "Q"
          )}
        </div>
      )}
    </div>
    <div className={`rounded-2xl rounded-tl px-4 py-3 text-[15px] leading-relaxed shadow-sm ${theme.styles.botBubble} ${theme.styles.botText}`}>
      {text}
    </div>
  </motion.div>
);

const UserBubble = ({ text, theme }: { text: string; theme: ChatTheme }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    className="max-w-[75%] self-end"
  >
    <div className={`rounded-2xl rounded-tr px-4 py-3 text-[15px] leading-relaxed ${theme.styles.userBubble} ${theme.styles.userText} border ${theme.styles.optionBorder}`}>
      {text}
    </div>
  </motion.div>
);

/* ── Analysis Card ── */
const AnalysisCard = () => {
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Iniciando análise...");

  useEffect(() => {
    const steps = [
      { at: 300, progress: 15, text: "Coletando respostas..." },
      { at: 800, progress: 35, text: "Processando dados..." },
      { at: 1400, progress: 60, text: "Processando dados..." },
      { at: 2000, progress: 85, text: "Finalizando análise..." },
      { at: 2600, progress: 100, text: "Processando dados..." },
    ];
    const timers = steps.map((s) =>
      setTimeout(() => {
        setProgress(s.progress);
        setStatusText(s.text);
      }, s.at)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4 }}
      className="mx-auto w-full max-w-[340px]"
    >
      <div className="rounded-2xl bg-[#1a2235] p-5 shadow-lg border border-white/5">
        <div className="flex items-center gap-3 mb-4">
          <div className="relative">
            <div className="h-10 w-10 rounded-lg bg-[#2a3550] flex items-center justify-center">
              <Database className="h-5 w-5 text-blue-400" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-blue-500 border-2 border-[#1a2235]" />
          </div>
          <div>
            <p className="text-sm font-bold text-white tracking-wide">ANALISANDO</p>
            <p className="text-[11px] text-white/50">Sistema em processamento</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-2 w-full rounded-full bg-[#0d1525] overflow-hidden mb-3">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-blue-400"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-[12px] text-white/50 font-mono">{statusText}</span>
          </div>
          <span className="text-[13px] font-bold text-blue-400 tabular-nums">{progress}%</span>
        </div>

        {/* Dots */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <motion.span
              key={i}
              className="h-2 w-2 rounded-full bg-blue-400/60"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, delay: i * 0.15, repeat: Infinity }}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
};

/* ── Congratulations Card ── */
const CongratsCard = ({ title, subtitle }: { title: string; subtitle: string }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.2, 0, 0, 1] }}
    className="mx-auto w-full max-w-[340px]"
  >
    <div className="relative rounded-2xl bg-gradient-to-b from-[#0a2e1a] to-[#0d3520] p-6 shadow-xl border border-emerald-500/30 overflow-hidden">
      {/* Decorative corners */}
      <div className="absolute top-3 left-3 text-yellow-400/70"><Star className="h-5 w-5" /></div>
      <div className="absolute top-3 right-3 text-emerald-300/50"><Sparkles className="h-5 w-5" /></div>

      {/* Crown + Check */}
      <div className="flex flex-col items-center mb-4">
        <Crown className="h-8 w-8 text-yellow-400 mb-1" />
        <div className="relative">
          <div className="h-14 w-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <CheckCircle2 className="h-8 w-8 text-white" />
          </div>
          <motion.span
            className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px]"
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ⭐
          </motion.span>
        </div>
      </div>

      {/* Text */}
      <div className="text-center space-y-2">
        <p className="text-2xl font-extrabold text-white">
          🎉 PARABÉNS! 🎉
        </p>
        <p className="text-lg font-bold text-white">{title}</p>
        <p className="text-sm text-emerald-300">{subtitle} ✨</p>
      </div>

      {/* Bottom decorative */}
      <div className="flex items-center justify-between mt-5 px-2">
        <Sparkles className="h-4 w-4 text-emerald-400/40" />
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-8 rounded-full bg-white/10" />
          <div className="h-2 w-2 rounded-full bg-emerald-400/50" />
          <div className="h-1.5 w-8 rounded-full bg-white/10" />
        </div>
        <span className="text-sm">🎊</span>
      </div>
    </div>
  </motion.div>
);

const QuizChat = () => {
  const { id } = useParams<{ id: string }>();
  const [quiz, setQuiz] = useState<QuizWithQuestionsAndOptions | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionWithOptions | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [isFinished, setIsFinished] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const msgCounter = useRef(0);
  const initiated = useRef(false);

  const theme = getThemeById(quiz?.theme || "dark-social");

  useEffect(() => {
    if (!id) return;
    getQuizFull(id).then((data) => {
      if (data) setQuiz(data);
      else setNotFound(true);
    }).catch(() => setNotFound(true));
  }, [id]);

  useEffect(() => {
    if (!quiz || initiated.current) return;
    initiated.current = true;
    const startQ = quiz.questions.find((q) => q.is_start_node) || quiz.questions[0];
    if (startQ) showBotMessage(startQ);
  }, [quiz]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, isTyping, showOptions]);

  const addMsg = useCallback((type: ChatMessage["type"], text: string) => {
    msgCounter.current += 1;
    const msg: ChatMessage = { id: `msg-${msgCounter.current}`, type, text };
    setMessages((prev) => [...prev, msg]);
    return msg;
  }, []);

  const showBotMessage = useCallback((question: QuestionWithOptions) => {
    setShowOptions(false);
    const preMessages = question.pre_messages?.filter((m) => m.trim()) || [];

    const sendMessagesSequentially = (msgs: string[], index: number, onDone: () => void) => {
      if (index >= msgs.length) {
        onDone();
        return;
      }
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMsg("bot", msgs[index]);
        setTimeout(() => sendMessagesSequentially(msgs, index + 1, onDone), 300);
      }, 600 + Math.random() * 400);
    };

    sendMessagesSequentially(preMessages, 0, () => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMsg("bot", question.text);
        setCurrentQuestion(question);
        setTimeout(() => setShowOptions(true), 200);
      }, 600 + Math.random() * 400);
    });
  }, [addMsg]);

  const showEndSequence = useCallback(() => {
    // 1. Typing then "Perfeito!" message
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMsg("bot", "Perfeito! ✅");

      // 2. Typing then "analyzing" message
      setTimeout(() => {
        setIsTyping(true);
        setTimeout(() => {
          setIsTyping(false);
          addMsg("bot", "Estamos analisando suas respostas aqui, aguarde alguns segundos… 🔍");

          // 3. Show analysis card after a beat
          setTimeout(() => {
            addMsg("analysis-card", "");

            // 4. After analysis completes (~3s), show congrats
            setTimeout(() => {
              addMsg("congrats-card", "");
              setIsFinished(true);
            }, 3200);
          }, 800);
        }, 700);
      }, 400);
    }, 600);
  }, [addMsg]);

  const handleOptionSelect = useCallback(
    (optionId: string, label: string) => {
      if (!currentQuestion || !quiz) return;
      setShowOptions(false);
      addMsg("user", label);

      const option = currentQuestion.options.find((o) => o.id === optionId);
      if (!option || !option.next_question_id) {
        setTimeout(() => showEndSequence(), 300);
        return;
      }

      const nextQ = quiz.questions.find((q) => q.id === option.next_question_id);
      if (nextQ) setTimeout(() => showBotMessage(nextQ), 300);
    },
    [currentQuestion, quiz, showBotMessage, showEndSequence, addMsg]
  );

  if (notFound) {
    return (
      <div className={`flex h-svh items-center justify-center ${theme.styles.bg}`}>
        <p className={theme.styles.headerSub}>Quiz não encontrado.</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className={`flex h-svh items-center justify-center ${theme.styles.bg}`}>
        <div className={`h-6 w-6 animate-spin rounded-full border-2 border-t-transparent ${theme.styles.avatarBg}`} />
      </div>
    );
  }

  return (
    <div className={`flex h-svh flex-col ${theme.styles.bg}`}>
      {/* Header */}
      <header className={`flex items-center gap-3 border-b px-4 py-3 ${theme.styles.header} ${theme.styles.borderColor}`}>
        <div className="relative">
          <div className={`h-11 w-11 rounded-full flex items-center justify-center font-bold text-sm overflow-hidden ${theme.styles.avatarBg} ${theme.styles.avatarText}`}>
            {quiz.avatar_url ? (
              <img src={quiz.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              "Q"
            )}
          </div>
          <span className={`absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 ${theme.styles.statusDot}`} />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <p className={`text-[15px] font-semibold ${theme.styles.headerText}`}>{quiz.title}</p>
            {quiz.show_verified_badge && (
              <CheckCircle2 className={`h-4 w-4 ${theme.styles.footerAccent}`} />
            )}
          </div>
          <p className={`text-[12px] ${theme.styles.headerSub}`}>Online agora</p>
        </div>
      </header>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-[500px] flex-col gap-3">
          <AnimatePresence>
            {messages.map((msg, idx) => {
              if (msg.type === "analysis-card") {
                return <AnalysisCard key={msg.id} />;
              }
              if (msg.type === "congrats-card") {
                return (
                  <CongratsCard
                    key={msg.id}
                    title="Você foi selecionada!"
                    subtitle="Sua vaga está garantida"
                  />
                );
              }
              const showAvatar = msg.type === "bot" && (idx === 0 || messages[idx - 1]?.type !== "bot");
              return msg.type === "bot" ? (
                <BotBubble key={msg.id} text={msg.text} theme={theme} showAvatar={showAvatar} avatarUrl={quiz.avatar_url} />
              ) : (
                <UserBubble key={msg.id} text={msg.text} theme={theme} />
              );
            })}
          </AnimatePresence>

          {isTyping && <TypingIndicator theme={theme} />}

          {showOptions && currentQuestion && !isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col gap-2 w-full mt-1"
            >
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id, opt.label)}
                  className={`w-full rounded-2xl px-4 py-4 text-center text-[14px] font-medium border transition-all duration-200 ease-out active:scale-[0.98] ${theme.styles.optionBg} ${theme.styles.optionText} ${theme.styles.optionBorder} ${theme.styles.optionHover}`}
                >
                  {opt.label}
                </button>
              ))}
            </motion.div>
          )}

          {isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.3 }}
              className="mt-4 text-center"
            >
              <button
                onClick={() => window.location.reload()}
                className={`rounded-2xl px-6 py-3 text-sm font-medium transition-all hover:brightness-110 ${theme.styles.avatarBg} ${theme.styles.avatarText}`}
              >
                Refazer quiz
              </button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Footer */}
      <footer className={`border-t px-4 py-3 text-center ${theme.styles.footerBg} ${theme.styles.borderColor}`}>
        <p className={`text-[11px] ${theme.styles.footerText}`}>
          Powered by <span className={`font-medium ${theme.styles.footerAccent}`}>ChatQuiz</span>
        </p>
      </footer>
    </div>
  );
};

export default QuizChat;
