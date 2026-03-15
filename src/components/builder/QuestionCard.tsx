import { useRef, useState } from "react";
import { Plus, Trash2, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiButton from "./EmojiButton";

interface OptionData {
  id: string;
  label: string;
  next_question_id: string | null;
}

interface QuestionData {
  id: string;
  text: string;
  options: OptionData[];
  pre_messages?: string[];
}

interface QuestionCardProps {
  question: QuestionData;
  questionIndex: number;
  allQuestions: QuestionData[];
  onTextChange: (text: string) => void;
  onPreMessagesChange: (preMessages: string[]) => void;
  onOptionLabelChange: (optionId: string, label: string) => void;
  onOptionNextChange: (optionId: string, nextId: string | null) => void;
  onAddOption: () => void;
  onDeleteOption: (optionId: string) => void;
  onDeleteQuestion: () => void;
  onClose: () => void;
}

const QuestionCard = ({
  question,
  questionIndex,
  allQuestions,
  onTextChange,
  onPreMessagesChange,
  onOptionLabelChange,
  onOptionNextChange,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onClose,
}: QuestionCardProps) => {
  const preMessages = question.pre_messages || [];
  const questionTextRef = useRef<HTMLTextAreaElement>(null);

  const handleAddPreMessage = () => {
    onPreMessagesChange([...preMessages, ""]);
  };

  const handleUpdatePreMessage = (index: number, value: string) => {
    const updated = [...preMessages];
    updated[index] = value;
    onPreMessagesChange(updated);
  };

  const handleDeletePreMessage = (index: number) => {
    onPreMessagesChange(preMessages.filter((_, i) => i !== index));
  };

  const insertEmojiAtCursor = (ref: HTMLTextAreaElement | HTMLInputElement | null, emoji: string, onChange: (val: string) => void, currentValue: string) => {
    if (ref) {
      const start = ref.selectionStart || currentValue.length;
      const end = ref.selectionEnd || currentValue.length;
      const newVal = currentValue.slice(0, start) + emoji + currentValue.slice(end);
      onChange(newVal);
      setTimeout(() => {
        ref.focus();
        ref.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onChange(currentValue + emoji);
    }
  };

  return (
    <div className="p-5 animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-medium text-primary-foreground tabular-nums">
            {questionIndex + 1}
          </span>
          <h3 className="text-sm font-medium text-foreground">Editar Pergunta</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Pre-messages */}
      <div className="mb-5">
        <div className="mb-2 flex items-center justify-between">
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
            Mensagens antes da pergunta
          </label>
          <Button variant="ghost" size="sm" onClick={handleAddPreMessage} className="h-6 px-2 text-[10px] text-muted-foreground">
            <Plus className="h-3 w-3" />
            Adicionar
          </Button>
        </div>
        {preMessages.length > 0 && (
          <div className="space-y-2">
            {preMessages.map((msg, idx) => (
              <PreMessageRow
                key={idx}
                index={idx}
                value={msg}
                onChange={(val) => handleUpdatePreMessage(idx, val)}
                onDelete={() => handleDeletePreMessage(idx)}
              />
            ))}
          </div>
        )}
        {preMessages.length === 0 && (
          <p className="text-[11px] text-muted-foreground/60 italic">
            Nenhuma mensagem prévia. Adicione frases que o bot enviará antes desta pergunta.
          </p>
        )}
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Texto da pergunta</label>
        <EmojiButton onSelect={(emoji) => insertEmojiAtCursor(questionTextRef.current, emoji, onTextChange, question.text)} />
      </div>
      <textarea
        ref={questionTextRef}
        value={question.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Digite a pergunta..."
        rows={3}
        className="mb-5 w-full resize-none rounded-inner bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
      />

      <label className="mb-2 block text-xs font-medium text-muted-foreground">Opções de resposta</label>
      <div className="space-y-3">
        {question.options.map((option, optIdx) => (
          <OptionRow
            key={option.id}
            option={option}
            optIdx={optIdx}
            question={question}
            allQuestions={allQuestions}
            onOptionLabelChange={onOptionLabelChange}
            onOptionNextChange={onOptionNextChange}
            onDeleteOption={onDeleteOption}
          />
        ))}
      </div>

      <Button variant="ghost" size="sm" onClick={onAddOption} className="mt-3 w-full text-xs text-muted-foreground">
        <Plus className="h-3 w-3" />
        Adicionar opção
      </Button>

      <div className="mt-6 border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteQuestion}
          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" />
          Excluir pergunta
        </Button>
      </div>
    </div>
  );
};

// Sub-components to hold their own refs

const PreMessageRow = ({ index, value, onChange, onDelete }: { index: number; value: string; onChange: (val: string) => void; onDelete: () => void }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    if (el) {
      const start = el.selectionStart || value.length;
      const end = el.selectionEnd || value.length;
      const newVal = value.slice(0, start) + emoji + value.slice(end);
      onChange(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onChange(value + emoji);
    }
  };

  return (
    <div className="flex items-start gap-2">
      <span className="mt-2.5 text-[10px] font-medium text-muted-foreground shrink-0">{index + 1}.</span>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Digite uma mensagem..."
        className="flex-1 rounded-inner bg-secondary px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <EmojiButton onSelect={insertEmoji} />
      <Button
        variant="ghost"
        size="icon"
        onClick={onDelete}
        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3 w-3" />
      </Button>
    </div>
  );
};

const OptionRow = ({ option, optIdx, question, allQuestions, onOptionLabelChange, onOptionNextChange, onDeleteOption }: {
  option: { id: string; label: string; next_question_id: string | null };
  optIdx: number;
  question: { id: string };
  allQuestions: { id: string; text: string }[];
  onOptionLabelChange: (optionId: string, label: string) => void;
  onOptionNextChange: (optionId: string, nextId: string | null) => void;
  onDeleteOption: (optionId: string) => void;
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const insertEmoji = (emoji: string) => {
    const el = inputRef.current;
    const val = option.label;
    if (el) {
      const start = el.selectionStart || val.length;
      const end = el.selectionEnd || val.length;
      onOptionLabelChange(option.id, val.slice(0, start) + emoji + val.slice(end));
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onOptionLabelChange(option.id, val + emoji);
    }
  };

  return (
    <div className="rounded-inner bg-secondary/50 p-3">
      <div className="mb-2 flex items-center gap-2">
        <span className="text-[10px] font-medium text-muted-foreground uppercase">
          Opção {String.fromCharCode(65 + optIdx)}
        </span>
        <div className="flex-1" />
        <EmojiButton onSelect={insertEmoji} />
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onDeleteOption(option.id)}
          className="h-6 w-6 text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
      <input
        ref={inputRef}
        type="text"
        value={option.label}
        onChange={(e) => onOptionLabelChange(option.id, e.target.value)}
        placeholder="Texto da opção..."
        className="mb-2 w-full rounded-sm bg-card px-3 py-2 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">Ir para:</span>
        <select
          value={option.next_question_id || ""}
          onChange={(e) => onOptionNextChange(option.id, e.target.value || null)}
          className="w-full rounded-sm bg-card px-2 py-1.5 text-xs text-foreground outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">🏁 Fim do quiz</option>
          {allQuestions
            .filter((q) => q.id !== question.id)
            .map((q) => (
              <option key={q.id} value={q.id}>
                → Pergunta {allQuestions.indexOf(q) + 1}: {q.text.substring(0, 30)}
              </option>
            ))}
        </select>
      </div>
    </div>
  );
};

export default QuestionCard;