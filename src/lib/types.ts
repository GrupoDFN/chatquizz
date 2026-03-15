export interface Quiz {
  id: string;
  title: string;
  createdAt: string;
  questions: Question[];
}

export interface Question {
  id: string;
  quizId: string;
  text: string;
  order: number;
  isStartNode?: boolean;
  options: Option[];
}

export interface Option {
  id: string;
  questionId: string;
  label: string;
  nextQuestionId: string | null; // null means end
}

export interface ChatMessage {
  id: string;
  type: "bot" | "user";
  text: string;
}
