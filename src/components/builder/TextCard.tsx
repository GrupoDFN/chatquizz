import { useRef } from "react";
import { Trash2, X, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmojiButton from "./EmojiButton";

interface TextCardProps {
  questionId: string;
  text: string;
  questionIndex: number;
  onTextChange: (text: string) => void;
  onDeleteQuestion: () => void;
  onClose: () => void;
}

const TextCard = ({
  text,
  questionIndex,
  onTextChange,
  onDeleteQuestion,
  onClose,
}: TextCardProps) => {
  const textRef = useRef<HTMLTextAreaElement>(null);

  const insertEmoji = (emoji: string) => {
    const el = textRef.current;
    if (el) {
      const start = el.selectionStart || text.length;
      const end = el.selectionEnd || text.length;
      const newVal = text.slice(0, start) + emoji + text.slice(end);
      onTextChange(newVal);
      setTimeout(() => {
        el.focus();
        el.setSelectionRange(start + emoji.length, start + emoji.length);
      }, 0);
    } else {
      onTextChange(text + emoji);
    }
  };

  return (
    <div className="p-5 animate-fade-in">
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent text-xs font-medium text-accent-foreground">
            <MessageSquare className="h-3.5 w-3.5" />
          </span>
          <h3 className="text-sm font-medium text-foreground">Editar Mensagem</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mb-1.5 flex items-center justify-between">
        <label className="text-xs font-medium text-muted-foreground">Texto da mensagem</label>
        <EmojiButton onSelect={insertEmoji} />
      </div>
      <textarea
        ref={textRef}
        value={text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Digite a mensagem que será enviada..."
        rows={4}
        className="mb-2 w-full resize-none rounded-inner bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
      />
      <p className="text-[11px] text-muted-foreground/60 italic mb-5">
        Esta mensagem será exibida como uma mensagem do bot no chat.
      </p>

      <div className="border-t border-border pt-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={onDeleteQuestion}
          className="w-full text-xs text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-3 w-3" />
          Excluir card
        </Button>
      </div>
    </div>
  );
};

export default TextCard;
