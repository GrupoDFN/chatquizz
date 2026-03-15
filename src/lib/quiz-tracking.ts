import { supabase } from "@/integrations/supabase/client";

export async function trackQuizView(quizId: string, sessionId: string) {
  try {
    await supabase.from("quiz_views" as any).insert({ quiz_id: quizId, session_id: sessionId });
  } catch (e) {
    console.warn("Failed to track view:", e);
  }
}

export async function trackQuizResponse(
  quizId: string,
  sessionId: string,
  questionId: string,
  optionId: string,
  stepOrder: number
) {
  try {
    await supabase.from("quiz_responses" as any).insert({
      quiz_id: quizId,
      session_id: sessionId,
      question_id: questionId,
      option_id: optionId,
      step_order: stepOrder,
    });
  } catch (e) {
    console.warn("Failed to track response:", e);
  }
}

export interface QuizMetrics {
  totalViews: number;
  totalSessions: number; // sessions that answered at least 1 question
  completionRate: number;
  stepsData: StepData[];
  sessions: SessionRow[];
}

export interface StepData {
  questionId: string;
  questionText: string;
  stepOrder: number;
  totalResponses: number;
  percentage: number; // relative to first step
  options: { optionId: string; label: string; count: number }[];
}

export interface SessionRow {
  sessionId: string;
  firstInteraction: string;
  stepsCompleted: number;
  responses: { questionId: string; optionLabel: string; stepOrder: number }[];
}

export async function getQuizMetrics(quizId: string, days: number = 7): Promise<QuizMetrics> {
  const since = new Date(Date.now() - days * 86400000).toISOString();

  // Fetch views
  const { data: views } = await supabase
    .from("quiz_views" as any)
    .select("session_id, created_at")
    .eq("quiz_id", quizId)
    .gte("created_at", since);

  // Fetch responses with question and option info
  const { data: responses } = await supabase
    .from("quiz_responses" as any)
    .select("session_id, question_id, option_id, step_order, created_at")
    .eq("quiz_id", quizId)
    .gte("created_at", since)
    .order("step_order", { ascending: true });

  // Fetch questions and options for labels
  const { data: questions } = await supabase
    .from("questions")
    .select("id, text, order")
    .eq("quiz_id", quizId)
    .order("order", { ascending: true });

  const questionIds = (questions ?? []).map((q) => q.id);
  let options: any[] = [];
  if (questionIds.length > 0) {
    const { data } = await supabase.from("options").select("id, label, question_id").in("question_id", questionIds);
    options = data ?? [];
  }

  const viewsList = (views ?? []) as any[];
  const responsesList = (responses ?? []) as any[];

  const uniqueViewSessions = new Set(viewsList.map((v: any) => v.session_id));
  const totalViews = uniqueViewSessions.size;

  // Group responses by session
  const sessionMap = new Map<string, any[]>();
  for (const r of responsesList) {
    if (!sessionMap.has(r.session_id)) sessionMap.set(r.session_id, []);
    sessionMap.get(r.session_id)!.push(r);
  }

  const totalSessions = sessionMap.size;

  // Find max step to determine "completion"
  const maxPossibleSteps = (questions ?? []).length;

  // Build steps data
  const questionMap = new Map((questions ?? []).map((q) => [q.id, q]));
  const optionMap = new Map(options.map((o) => [o.id, o]));

  // Count responses per question
  const questionCounts = new Map<string, { total: number; options: Map<string, number> }>();
  for (const r of responsesList) {
    if (!questionCounts.has(r.question_id)) {
      questionCounts.set(r.question_id, { total: 0, options: new Map() });
    }
    const qc = questionCounts.get(r.question_id)!;
    qc.total++;
    qc.options.set(r.option_id, (qc.options.get(r.option_id) ?? 0) + 1);
  }

  const firstStepCount = Math.max(totalSessions, 1);

  const stepsData: StepData[] = (questions ?? []).map((q, idx) => {
    const qc = questionCounts.get(q.id);
    const totalResponses = qc?.total ?? 0;
    const stepOptions = options
      .filter((o) => o.question_id === q.id)
      .map((o) => ({
        optionId: o.id,
        label: o.label,
        count: qc?.options.get(o.id) ?? 0,
      }));

    return {
      questionId: q.id,
      questionText: q.text,
      stepOrder: idx + 1,
      totalResponses,
      percentage: Math.round((totalResponses / firstStepCount) * 100),
      options: stepOptions,
    };
  });

  // Completed = sessions that answered the last question or reached max steps
  const completedSessions = Array.from(sessionMap.values()).filter(
    (responses) => responses.length >= maxPossibleSteps
  ).length;
  const completionRate = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  // Build session rows
  const sessions: SessionRow[] = Array.from(sessionMap.entries()).map(([sid, resps]) => ({
    sessionId: sid,
    firstInteraction: resps[0]?.created_at ?? "",
    stepsCompleted: resps.length,
    responses: resps.map((r: any) => ({
      questionId: r.question_id,
      optionLabel: optionMap.get(r.option_id)?.label ?? "—",
      stepOrder: r.step_order,
    })),
  }));

  sessions.sort((a, b) => new Date(b.firstInteraction).getTime() - new Date(a.firstInteraction).getTime());

  return { totalViews, totalSessions, completionRate, stepsData, sessions };
}
