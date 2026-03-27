interface OptionData {
  id: string;
  next_question_id: string | null;
}

interface QuestionData {
  id: string;
  options: OptionData[];
}

interface FlowConnectionsProps {
  question: QuestionData;
  allQuestions: QuestionData[];
  currentIndex: number;
}

const FlowConnections = ({ question, allQuestions, currentIndex }: FlowConnectionsProps) => {
  const hasConnectionToNext = question.options.some((o) => {
    if (!o.next_question_id) return false;
    const targetIdx = allQuestions.findIndex((q) => q.id === o.next_question_id);
    return targetIdx === currentIndex + 1;
  });

  const hasConnectionElsewhere = question.options.some((o) => {
    if (!o.next_question_id) return false;
    const targetIdx = allQuestions.findIndex((q) => q.id === o.next_question_id);
    return targetIdx !== currentIndex + 1;
  });

  const hasEnd = question.options.some((o) => !o.next_question_id);

  return (
    <div className="flex items-center justify-center py-1">
      <div className="flex flex-col items-center gap-0.5">
        <div className={`h-4 w-px ${hasConnectionToNext ? "bg-primary/40" : "border-l-2 border-dashed border-muted"}`} />
        <div className="flex gap-1.5">
          {hasConnectionElsewhere && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-medium text-primary">↗ ramificação</span>
          )}
          {hasEnd && (
            <span className="rounded-full bg-destructive/10 px-2 py-0.5 text-[9px] font-medium text-destructive/70">🏁 fim</span>
          )}
        </div>
        <div className={`h-4 w-px ${hasConnectionToNext ? "bg-primary/40" : "border-l-2 border-dashed border-muted"}`} />
      </div>
    </div>
  );
};

export default FlowConnections;
