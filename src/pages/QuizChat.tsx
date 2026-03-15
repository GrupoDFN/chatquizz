import { useState, useEffect, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { getQuizFull, QuizWithQuestionsAndOptions } from "@/lib/quiz-api";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquare } from "lucide-react";

interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
}

interface QuestionWithOptions {
  id: string;
  text: string;
  is_start_node: boolean;
  options: { id: string; label: string; next_question_id: string | null }[];
}

const TypingIndicator = () => (
  <div className="flex items-center gap-1 rounded-bubble rounded-tl-[4px] bg-card px-4 py-3 shadow-sm w-fit">
    {[0, 1, 2].map((i) => (
      <span
        key={i}
        className="block h-2 w-2 rounded-full bg-muted-foreground/40"
        style={{ animation: "typing-bounce 1.4s infinite", animationDelay: `${i * 0.15}s` }}
      />
    ))}
  </div>
);

const BotBubble = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    className="max-w-[80%] self-start"
  >
    <div className="rounded-bubble rounded-tl-[4px] bg-card px-4 py-3 text-[15px] leading-relaxed text-foreground shadow-sm">
      {text}
    </div>
  </motion.div>
);

const UserBubble = ({ text }: { text: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 10, scale: 0.95 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
    className="max-w-[80%] self-end"
  >
    <div className="rounded-bubble rounded-tr-[4px] bg-primary px-4 py-3 text-[15px] leading-relaxed text-primary-foreground">
      {text}
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

  const showBotMessage = useCallback((question: QuestionWithOptions) => {
    setShowOptions(false);
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      msgCounter.current += 1;
      setMessages((prev) => [...prev, { id: `msg-${msgCounter.current}`, type: "bot", text: question.text }]);
      setCurrentQuestion(question);
      setTimeout(() => setShowOptions(true), 200);
    }, 800 + Math.random() * 400);
  }, []);

  const handleOptionSelect = useCallback(
    (optionId: string, label: string) => {
      if (!currentQuestion || !quiz) return;
      setShowOptions(false);
      msgCounter.current += 1;
      setMessages((prev) => [...prev, { id: `msg-${msgCounter.current}`, type: "user", text: label }]);

      const option = currentQuestion.options.find((o) => o.id === optionId);
      if (!option || !option.next_question_id) {
        setTimeout(() => {
          setIsTyping(true);
          setTimeout(() => {
            setIsTyping(false);
            msgCounter.current += 1;
            setMessages((prev) => [
              ...prev,
              { id: `msg-${msgCounter.current}`, type: "bot", text: "Obrigado por responder! 🎉 Em breve você receberá mais informações." },
            ]);
            setIsFinished(true);
          }, 600);
        }, 300);
        return;
      }

      const nextQ = quiz.questions.find((q) => q.id === option.next_question_id);
      if (nextQ) setTimeout(() => showBotMessage(nextQ), 300);
    },
    [currentQuestion, quiz, showBotMessage]
  );

  if (notFound) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <p className="text-muted-foreground">Quiz não encontrado.</p>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="flex h-svh items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col bg-background">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary">
          <MessageSquare className="h-4 w-4 text-primary-foreground" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{quiz.title}</p>
          <p className="text-[11px] text-muted-foreground">Online agora</p>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto flex max-w-[500px] flex-col gap-3">
          <AnimatePresence>
            {messages.map((msg) =>
              msg.type === "bot" ? <BotBubble key={msg.id} text={msg.text} /> : <UserBubble key={msg.id} text={msg.text} />
            )}
          </AnimatePresence>

          {isTyping && <TypingIndicator />}

          {showOptions && currentQuestion && !isFinished && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="flex flex-col gap-2 w-full"
            >
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleOptionSelect(opt.id, opt.label)}
                  className="w-full rounded-inner bg-card px-4 py-3.5 text-left text-sm font-medium text-foreground shadow-card transition-all duration-200 ease-out hover:shadow-card-hover hover:bg-secondary active:scale-[0.98]"
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
                className="rounded-inner bg-card px-6 py-3 text-sm font-medium text-foreground shadow-card transition-all hover:shadow-card-hover"
              >
                Refazer quiz
              </button>
            </motion.div>
          )}
        </div>
      </div>

      <footer className="border-t border-border bg-card px-4 py-3 text-center">
        <p className="text-[11px] text-muted-foreground">
          Powered by <span className="font-medium text-primary">ChatQuiz</span>
        </p>
      </footer>
    </div>
  );
};

export default QuizChat;
