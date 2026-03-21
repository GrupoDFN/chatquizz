import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getQuizFull, resolveQuizId, QuizWithQuestionsAndOptions } from "@/lib/quiz-api";
import { trackQuizView, trackQuizResponse } from "@/lib/quiz-tracking";
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
const AnalysisCard = ({ title, subtitle }: { title: string; subtitle: string }) => {
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
            <p className="text-sm font-bold text-white tracking-wide">{title}</p>
            <p className="text-[11px] text-white/50">{subtitle}</p>
          </div>
        </div>

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
const CongratsCard = ({ title, subtitle, templateId }: { title: string; subtitle: string; templateId: string }) => {
  const tmpl = getEndScreenTemplate(templateId);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowConfetti(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.6, y: 40, rotateX: 15 }}
      animate={{ opacity: 1, scale: 1, y: 0, rotateX: 0 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto w-full max-w-[340px] perspective-[800px]"
    >
      <motion.div
        className={`relative rounded-2xl p-6 shadow-xl border overflow-hidden ${tmpl.styles.cardBg} ${tmpl.styles.cardBorder}`}
        animate={{ boxShadow: ["0 0 0px rgba(59,130,246,0)", "0 0 30px rgba(59,130,246,0.3)", "0 0 0px rgba(59,130,246,0)"] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Floating particles */}
        {showConfetti && (
          <>
            {["🎊", "✨", "⭐", "🎉", "💫", "🌟"].map((emoji, i) => (
              <motion.span
                key={i}
                className="absolute text-sm pointer-events-none"
                initial={{
                  opacity: 0,
                  x: 140 + (i % 2 === 0 ? -20 : 20),
                  y: 120,
                  scale: 0,
                }}
                animate={{
                  opacity: [0, 1, 1, 0],
                  x: 140 + Math.cos((i / 6) * Math.PI * 2) * 120,
                  y: -20 + Math.sin((i / 6) * Math.PI * 2) * 30,
                  scale: [0, 1.2, 1, 0.5],
                  rotate: [0, i % 2 === 0 ? 180 : -180],
                }}
                transition={{
                  duration: 1.8,
                  delay: 0.1 * i,
                  ease: "easeOut",
                }}
              >
                {emoji}
              </motion.span>
            ))}
          </>
        )}

        {/* Corner decorations */}
        <motion.div
          className={`absolute top-3 left-3 ${tmpl.styles.accentColor}`}
          animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        >
          <Star className="h-5 w-5" />
        </motion.div>
        <motion.div
          className={`absolute top-3 right-3 ${tmpl.styles.decorColor}`}
          animate={{ rotate: [0, -20, 20, 0], scale: [1, 1.3, 0.9, 1] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        >
          <Sparkles className="h-5 w-5" />
        </motion.div>

        {/* Icon section */}
        <div className="flex flex-col items-center mb-4">
          <motion.div
            animate={{ y: [0, -6, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <Crown className={`h-8 w-8 ${tmpl.styles.accentColor} mb-1`} />
          </motion.div>
          <div className="relative">
            <motion.div
              className={`h-14 w-14 rounded-full flex items-center justify-center shadow-lg ${tmpl.styles.iconBg}`}
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: 0.3, duration: 0.6, type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className={`h-8 w-8 ${tmpl.styles.iconColor}`} />
            </motion.div>
            <motion.span
              className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-yellow-400 flex items-center justify-center text-[10px]"
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.4, 1], rotate: [0, 20, -20, 0] }}
              transition={{ delay: 0.6, duration: 0.5, type: "spring" }}
            >
              ⭐
            </motion.span>
          </div>
        </div>

        {/* Text content */}
        <div className="text-center space-y-2">
          <motion.p
            className={`text-2xl font-extrabold ${tmpl.styles.titleColor}`}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: [0.5, 1.1, 1] }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            🎉 PARABÉNS! 🎉
          </motion.p>
          <motion.p
            className={`text-lg font-bold ${tmpl.styles.titleColor}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            {title}
          </motion.p>
          <motion.p
            className={`text-sm ${tmpl.styles.subtitleColor}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.4 }}
          >
            {subtitle} ✨
          </motion.p>
        </div>

        {/* Bottom decoration */}
        <motion.div
          className="flex items-center justify-between mt-5 px-2"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.4 }}
        >
          <motion.div
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
          >
            <Sparkles className={`h-4 w-4 ${tmpl.styles.decorColor}`} />
          </motion.div>
          <div className="flex items-center gap-2">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="h-1.5 w-6 rounded-full bg-white/10"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.5, delay: i * 0.3, repeat: Infinity }}
              />
            ))}
          </div>
          <motion.span
            className="text-sm"
            animate={{ scale: [1, 1.3, 1], rotate: [0, 15, -15, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: 1 }}
          >
            🎊
          </motion.span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

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
  const stepCounter = useRef(0);
  const sessionId = useRef<string>("");

  const theme = getThemeById(quiz?.theme || "dark-social");

  useEffect(() => {
    if (!id) return;

    const loadQuiz = async () => {
      try {
        const resolvedId = await resolveQuizId(id);
        if (!resolvedId) { setNotFound(true); return; }

        const storageKey = `quiz_session_${resolvedId}`;
        let sid = sessionStorage.getItem(storageKey);
        if (!sid) {
          sid = crypto.randomUUID().slice(0, 8).toUpperCase();
          sessionStorage.setItem(storageKey, sid);
        }
        sessionId.current = sid;

        const data = await getQuizFull(resolvedId);
        if (data) {
          setQuiz(data);
          trackQuizView(resolvedId, sid);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      }
    };

    loadQuiz();
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
    const delay = quiz?.response_delay ?? 1000;
    const jitter = delay * 0.3;

    const sendMessagesSequentially = (msgs: string[], index: number, onDone: () => void) => {
      if (index >= msgs.length) {
        onDone();
        return;
      }
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMsg("bot", msgs[index]);
        setTimeout(() => sendMessagesSequentially(msgs, index + 1, onDone), Math.max(200, delay * 0.3));
      }, delay + Math.random() * jitter);
    };

    sendMessagesSequentially(preMessages, 0, () => {
      setIsTyping(true);
      setTimeout(() => {
        setIsTyping(false);
        addMsg("bot", question.text);

        if (question.options.length === 0) {
          setTimeout(() => showEndSequence(), delay * 0.8);
        } else {
          setCurrentQuestion(question);
          setTimeout(() => setShowOptions(true), 200);
        }
      }, delay + Math.random() * jitter);
    });
  }, [addMsg, quiz]);

  const showEndSequence = useCallback(() => {
    const showAnalysis = quiz?.show_analysis_card ?? true;
    const showCongrats = quiz?.show_congrats_card ?? true;

    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      addMsg("bot", "Perfeito! ✅");

      if (showAnalysis) {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            addMsg("bot", "Estamos analisando suas respostas aqui, aguarde alguns segundos… 🔍");
            setTimeout(() => {
              addMsg("analysis-card", "");
              setTimeout(() => {
                if (showCongrats) addMsg("congrats-card", "");
                setIsFinished(true);
              }, 3200);
            }, 800);
          }, 700);
        }, 400);
      } else if (showCongrats) {
        setTimeout(() => {
          addMsg("congrats-card", "");
          setIsFinished(true);
        }, 600);
      } else {
        setTimeout(() => {
          addMsg("bot", "Obrigado por responder! 🎉");
          setIsFinished(true);
        }, 400);
      }
    }, 600);
  }, [addMsg, quiz]);

  const handleOptionSelect = useCallback(
    (optionId: string, label: string) => {
      if (!currentQuestion || !quiz) return;
      setShowOptions(false);
      addMsg("user", label);

      // Track this response
      stepCounter.current += 1;
      trackQuizResponse(quiz.id, sessionId.current, currentQuestion.id, optionId, stepCounter.current);

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
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 py-6"
        style={theme.styles.bgPattern ? {
          backgroundImage: theme.styles.bgPattern,
          backgroundSize: "20px 20px",
        } : undefined}
      >
        <div className="mx-auto flex max-w-[500px] flex-col gap-3">
          <AnimatePresence>
            {messages.map((msg, idx) => {
              if (msg.type === "analysis-card") {
                return <AnalysisCard key={msg.id} title={quiz.analysis_title || "ANALISANDO"} subtitle={quiz.analysis_subtitle || "Sistema em processamento"} />;
              }
              if (msg.type === "congrats-card") {
                return (
                  <CongratsCard
                    key={msg.id}
                    title={quiz.end_screen_title || "Você foi selecionada!"}
                    subtitle={quiz.end_screen_subtitle || "Sua vaga está garantida"}
                    templateId={quiz.end_screen_template || "congrats-green"}
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
          Powered by <span className={`font-medium ${theme.styles.footerAccent}`}>ChatFunnel</span>
        </p>
      </footer>
    </div>
  );
};

export default QuizChat;
