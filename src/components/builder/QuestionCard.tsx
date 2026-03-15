import { Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface OptionData {
  id: string;
  label: string;
  next_question_id: string | null;
}

interface QuestionData {
  id: string;
  text: string;
  options: OptionData[];
}

interface QuestionCardProps {
  question: QuestionData;
  questionIndex: number;
  allQuestions: QuestionData[];
  onTextChange: (text: string) => void;
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
  onOptionLabelChange,
  onOptionNextChange,
  onAddOption,
  onDeleteOption,
  onDeleteQuestion,
  onClose,
}: QuestionCardProps) => {
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

      <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Texto da pergunta</label>
      <textarea
        value={question.text}
        onChange={(e) => onTextChange(e.target.value)}
        placeholder="Digite a pergunta..."
        rows={3}
        className="mb-5 w-full resize-none rounded-inner bg-secondary px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary"
      />

      <label className="mb-2 block text-xs font-medium text-muted-foreground">Opções de resposta</label>
      <div className="space-y-3">
        {question.options.map((option, optIdx) => (
          <div key={option.id} className="rounded-inner bg-secondary/50 p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[10px] font-medium text-muted-foreground uppercase">
                Opção {String.fromCharCode(65 + optIdx)}
              </span>
              <div className="flex-1" />
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

export default QuestionCard;
