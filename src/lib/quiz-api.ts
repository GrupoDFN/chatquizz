import { supabase } from "@/integrations/supabase/client";

export interface QuizRow {
  id: string;
  title: string;
  user_id: string;
  theme: string;
  avatar_url: string | null;
  show_verified_badge: boolean;
  created_at: string;
}

export interface QuestionRow {
  id: string;
  quiz_id: string;
  text: string;
  order: number;
  is_start_node: boolean;
  created_at: string;
}

export interface OptionRow {
  id: string;
  question_id: string;
  label: string;
  next_question_id: string | null;
  created_at: string;
}

export interface QuizWithQuestionsAndOptions extends QuizRow {
  questions: (QuestionRow & { options: OptionRow[] })[];
}

// Fetch all quizzes for the current user
export async function getUserQuizzes(): Promise<QuizRow[]> {
  const { data, error } = await supabase
    .from("quizzes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// Fetch a single quiz with all questions and options
export async function getQuizFull(quizId: string): Promise<QuizWithQuestionsAndOptions | null> {
  const { data: quiz, error: qErr } = await supabase
    .from("quizzes")
    .select("*")
    .eq("id", quizId)
    .maybeSingle();
  if (qErr) throw qErr;
  if (!quiz) return null;

  const { data: questions, error: questErr } = await supabase
    .from("questions")
    .select("*")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });
  if (questErr) throw questErr;

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: OptionRow[] = [];
  if (questionIds.length > 0) {
    const { data: opts, error: optErr } = await supabase
      .from("options")
      .select("*")
      .in("question_id", questionIds);
    if (optErr) throw optErr;
    options = opts ?? [];
  }

  return {
    ...quiz,
    questions: (questions ?? []).map((q) => ({
      ...q,
      options: options.filter((o) => o.question_id === q.id),
    })),
  };
}

// Create a new quiz with a default first question
export async function createQuiz(title: string, userId: string): Promise<QuizRow> {
  const { data: quiz, error } = await supabase
    .from("quizzes")
    .insert({ title, user_id: userId })
    .select()
    .single();
  if (error) throw error;

  // Add default first question
  const { data: question, error: qErr } = await supabase
    .from("questions")
    .insert({ quiz_id: quiz.id, text: "Olá! Como posso ajudar?", order: 0, is_start_node: true })
    .select()
    .single();
  if (qErr) throw qErr;

  // Add default options
  await supabase.from("options").insert([
    { question_id: question.id, label: "Opção A", next_question_id: null },
    { question_id: question.id, label: "Opção B", next_question_id: null },
  ]);

  return quiz;
}

// Delete a quiz
export async function deleteQuiz(quizId: string): Promise<void> {
  const { error } = await supabase.from("quizzes").delete().eq("id", quizId);
  if (error) throw error;
}

// Update quiz title
export async function updateQuizTitle(quizId: string, title: string): Promise<void> {
  const { error } = await supabase.from("quizzes").update({ title }).eq("id", quizId);
  if (error) throw error;
}

// Update quiz theme
export async function updateQuizTheme(quizId: string, theme: string): Promise<void> {
  const { error } = await supabase.from("quizzes").update({ theme }).eq("id", quizId);
  if (error) throw error;
}

// Update quiz avatar
export async function updateQuizAvatar(quizId: string, avatarUrl: string | null): Promise<void> {
  const { error } = await supabase.from("quizzes").update({ avatar_url: avatarUrl }).eq("id", quizId);
  if (error) throw error;
}

// Update quiz verified badge
export async function updateQuizVerifiedBadge(quizId: string, show: boolean): Promise<void> {
  const { error } = await supabase.from("quizzes").update({ show_verified_badge: show }).eq("id", quizId);
  if (error) throw error;
}

// Upload avatar image
export async function uploadAvatar(quizId: string, file: File): Promise<string> {
  const ext = file.name.split(".").pop();
  const path = `${quizId}/avatar.${ext}`;
  const { error } = await supabase.storage.from("quiz-avatars").upload(path, file, { upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from("quiz-avatars").getPublicUrl(path);
  return data.publicUrl;
}

// Add a question to a quiz
export async function addQuestion(quizId: string, order: number): Promise<QuestionRow> {
  const { data, error } = await supabase
    .from("questions")
    .insert({ quiz_id: quizId, text: "Nova pergunta", order, is_start_node: false })
    .select()
    .single();
  if (error) throw error;

  // Add default option
  await supabase.from("options").insert({ question_id: data.id, label: "Opção A", next_question_id: null });

  return data;
}

// Update question text
export async function updateQuestionText(questionId: string, text: string): Promise<void> {
  const { error } = await supabase.from("questions").update({ text }).eq("id", questionId);
  if (error) throw error;
}

// Delete a question
export async function deleteQuestion(questionId: string): Promise<void> {
  // Clear references to this question in other options
  await supabase.from("options").update({ next_question_id: null }).eq("next_question_id", questionId);
  const { error } = await supabase.from("questions").delete().eq("id", questionId);
  if (error) throw error;
}

// Add option to a question
export async function addOption(questionId: string, label: string = "Nova opção"): Promise<OptionRow> {
  const { data, error } = await supabase
    .from("options")
    .insert({ question_id: questionId, label, next_question_id: null })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Update option
export async function updateOption(optionId: string, updates: { label?: string; next_question_id?: string | null }): Promise<void> {
  const { error } = await supabase.from("options").update(updates).eq("id", optionId);
  if (error) throw error;
}

// Delete option
export async function deleteOption(optionId: string): Promise<void> {
  const { error } = await supabase.from("options").delete().eq("id", optionId);
  if (error) throw error;
}
