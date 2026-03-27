import { Quiz, Question, Option } from "./types";
import { v4 as uuidv4 } from "uuid";

const STORAGE_KEY = "chatquiz_quizzes";

function loadQuizzes(): Quiz[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveQuizzes(quizzes: Quiz[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(quizzes));
}

export function getQuizzes(): Quiz[] {
  return loadQuizzes();
}

export function getQuiz(id: string): Quiz | undefined {
  return loadQuizzes().find((q) => q.id === id);
}

export function createQuiz(title: string): Quiz {
  const quizzes = loadQuizzes();
  const quizId = uuidv4();
  const questionId = uuidv4();
  const quiz: Quiz = {
    id: quizId,
    title,
    createdAt: new Date().toISOString(),
    questions: [
      {
        id: questionId,
        quizId,
        text: "Olá! Como posso ajudar?",
        order: 0,
        isStartNode: true,
        options: [
          { id: uuidv4(), questionId, label: "Opção A", nextQuestionId: null },
          { id: uuidv4(), questionId, label: "Opção B", nextQuestionId: null },
        ],
      },
    ],
  };
  quizzes.push(quiz);
  saveQuizzes(quizzes);
  return quiz;
}

export function updateQuiz(quiz: Quiz) {
  const quizzes = loadQuizzes();
  const idx = quizzes.findIndex((q) => q.id === quiz.id);
  if (idx !== -1) {
    quizzes[idx] = quiz;
    saveQuizzes(quizzes);
  }
}

export function deleteQuiz(id: string) {
  const quizzes = loadQuizzes().filter((q) => q.id !== id);
  saveQuizzes(quizzes);
}

export function addQuestion(quizId: string): Question {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) throw new Error("Quiz not found");
  const questionId = uuidv4();
  const question: Question = {
    id: questionId,
    quizId,
    text: "Nova pergunta",
    order: quiz.questions.length,
    options: [
      { id: uuidv4(), questionId, label: "Opção A", nextQuestionId: null },
    ],
  };
  quiz.questions.push(question);
  saveQuizzes(quizzes);
  return question;
}

export function addOption(quizId: string, questionId: string): Option {
  const quizzes = loadQuizzes();
  const quiz = quizzes.find((q) => q.id === quizId);
  if (!quiz) throw new Error("Quiz not found");
  const question = quiz.questions.find((q) => q.id === questionId);
  if (!question) throw new Error("Question not found");
  const option: Option = {
    id: uuidv4(),
    questionId,
    label: "Nova opção",
    nextQuestionId: null,
  };
  question.options.push(option);
  saveQuizzes(quizzes);
  return option;
}
