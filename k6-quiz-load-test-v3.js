import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ─── CONFIG ───
const BASE_URL = 'https://dyzccknotyujnmdrhdhs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5emNja25vdHl1am5tZHJoZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ4NDYsImV4cCI6MjA4OTEzMDg0Nn0.SrxNT9x04XRanE93UTM9cU_s7RLGfPzfAyO0u3stQLw';
const QUIZ_SLUG = __ENV.QUIZ_SLUG || 'meu-quiz'; // k6 run -e QUIZ_SLUG=xxx

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Prefer': 'return=minimal',
};

const HEADERS_SELECT = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
};

// ─── METRICS ───
const flowErrors = new Counter('flow_errors');
const flowSuccess = new Counter('flow_success');
const quizLoadTime = new Trend('quiz_load_time');
const responseSubmitTime = new Trend('response_submit_time');

// ─── SCENARIO ───
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m', target: 50 },
        { duration: '1m', target: 100 },
        { duration: '1m', target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'flow_success': ['count>0'],
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<3000'],
  },
};

function generateSessionId() {
  const chars = '0123456789ABCDEF';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default function () {
  const sessionId = generateSessionId();

  // ─── STEP 1: Resolve slug → quiz ID ───
  const slugRes = http.get(
    `${BASE_URL}/rest/v1/quizzes?slug=eq.${QUIZ_SLUG}&select=id,title,theme,show_analysis_card,show_congrats_card,response_delay,end_screen_template,end_screen_title,end_screen_subtitle,analysis_title,analysis_subtitle`,
    { headers: HEADERS_SELECT }
  );

  const slugOk = check(slugRes, {
    'slug resolved (200)': (r) => r.status === 200,
  });
  if (!slugOk) {
    console.log(`[FAIL] slug request status=${slugRes.status} body=${slugRes.body}`);
    flowErrors.add(1);
    return;
  }

  let quizzes;
  try {
    quizzes = JSON.parse(slugRes.body);
  } catch (e) {
    console.log(`[FAIL] slug JSON parse error: ${e}, body=${slugRes.body}`);
    flowErrors.add(1);
    return;
  }

  const quizOk = check(quizzes, {
    'quiz found': (q) => Array.isArray(q) && q.length > 0,
  });
  if (!quizOk) {
    console.log(`[FAIL] quiz not found for slug=${QUIZ_SLUG}, response=${JSON.stringify(quizzes)}`);
    flowErrors.add(1);
    return;
  }

  const quiz = quizzes[0];
  const quizId = quiz.id;
  quizLoadTime.add(slugRes.timings.duration);

  // ─── STEP 2: Load questions (separate call, matching app logic) ───
  const questionsRes = http.get(
    `${BASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=*&order=order.asc`,
    { headers: HEADERS_SELECT }
  );

  const questionsOk = check(questionsRes, {
    'questions status 200': (r) => r.status === 200,
  });
  if (!questionsOk) {
    console.log(`[FAIL] questions status=${questionsRes.status} body=${questionsRes.body}`);
    flowErrors.add(1);
    return;
  }

  let questions;
  try {
    questions = JSON.parse(questionsRes.body);
  } catch (e) {
    console.log(`[FAIL] questions JSON parse: ${e}, body=${questionsRes.body}`);
    flowErrors.add(1);
    return;
  }

  const qLoadedOk = check(questions, {
    'questions loaded': (q) => Array.isArray(q) && q.length > 0,
  });
  if (!qLoadedOk) {
    console.log(`[FAIL] questions empty or not array: ${JSON.stringify(questions).substring(0, 500)}`);
    flowErrors.add(1);
    return;
  }

  // ─── STEP 3: Load options for all questions ───
  const questionIds = questions.map((q) => q.id);
  const optionsRes = http.get(
    `${BASE_URL}/rest/v1/options?question_id=in.(${questionIds.join(',')})&select=*`,
    { headers: HEADERS_SELECT }
  );

  let allOptions = [];
  if (optionsRes.status === 200) {
    try {
      allOptions = JSON.parse(optionsRes.body);
    } catch (e) {
      console.log(`[WARN] options parse error: ${e}`);
    }
  }

  // Map options to questions
  const questionsWithOptions = questions.map((q) => ({
    ...q,
    options: allOptions.filter((o) => o.question_id === q.id),
  }));

  console.log(`[OK] Quiz "${quiz.title}" loaded: ${questions.length} questions, ${allOptions.length} options`);

  // ─── STEP 4: Register view ───
  const viewRes = http.post(
    `${BASE_URL}/rest/v1/quiz_views`,
    JSON.stringify({ quiz_id: quizId, session_id: sessionId }),
    { headers: HEADERS }
  );

  check(viewRes, {
    'view registered': (r) => r.status === 201 || r.status === 200,
  });

  // ─── STEP 5: Simulate answering questions ───
  const startQuestion = questionsWithOptions.find((q) => q.is_start_node);
  if (!startQuestion) {
    console.log('[FAIL] No start node found');
    flowErrors.add(1);
    return;
  }

  let currentQuestion = startQuestion;
  let stepOrder = 0;
  const maxSteps = 50;

  while (currentQuestion && stepOrder < maxSteps) {
    sleep(Math.random() * 1.5 + 0.3); // simulate reading

    const opts = currentQuestion.options || [];

    if (currentQuestion.type === 'question' && opts.length > 0) {
      const chosen = opts[Math.floor(Math.random() * opts.length)];

      const respRes = http.post(
        `${BASE_URL}/rest/v1/quiz_responses`,
        JSON.stringify({
          quiz_id: quizId,
          question_id: currentQuestion.id,
          option_id: chosen.id,
          session_id: sessionId,
          step_order: stepOrder,
        }),
        { headers: HEADERS }
      );

      const respOk = check(respRes, {
        'response submitted': (r) => r.status === 201 || r.status === 200,
      });
      if (!respOk) {
        console.log(`[FAIL] response submit status=${respRes.status} body=${respRes.body}`);
        flowErrors.add(1);
        return;
      }
      responseSubmitTime.add(respRes.timings.duration);

      // Navigate to next question
      if (chosen.next_question_id) {
        currentQuestion = questionsWithOptions.find((q) => q.id === chosen.next_question_id);
      } else {
        currentQuestion = null; // end of flow
      }
    } else if (currentQuestion.type === 'text') {
      // Text cards auto-advance via their single connector option
      const connector = opts[0];
      if (connector && connector.next_question_id) {
        currentQuestion = questionsWithOptions.find((q) => q.id === connector.next_question_id);
      } else {
        currentQuestion = null;
      }
    } else {
      currentQuestion = null;
    }

    stepOrder++;
  }

  // ─── STEP 6: Simulate end screen delay ───
  if (quiz.show_analysis_card) {
    sleep((quiz.response_delay || 1000) / 1000);
  }

  flowSuccess.add(1);
  console.log(`[OK] Flow complete: session=${sessionId}, steps=${stepOrder}`);
}
