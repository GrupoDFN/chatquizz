import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

// ─── CONFIG ───
const BASE_URL = 'https://dyzccknotyujnmdrhdhs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5emNja25vdHl1am5tZHJoZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ4NDYsImV4cCI6MjA4OTEzMDg0Nn0.SrxNT9x04XRanE93UTM9cU_s7RLGfPzfAyO0u3stQLw';
const QUIZ_SLUG = __ENV.QUIZ_SLUG || 'meu-quiz';

const GET_HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Accept': 'application/json',
};

const POST_HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

// ─── METRICS ───
const flowErrors = new Counter('flow_errors');
const flowSuccess = new Counter('flow_success');
const quizLoadTime = new Trend('quiz_load_time');
const questionsLoadTime = new Trend('questions_load_time');
const optionsLoadTime = new Trend('options_load_time');
const responseSubmitTime = new Trend('response_submit_time');
const totalFlowTime = new Trend('total_flow_time');

// ─── SCENARIO ───
export const options = {
  scenarios: {
    stress: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '1m',  target: 50 },
        { duration: '1m',  target: 100 },
        { duration: '1m',  target: 100 },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    'flow_success':      ['count>0'],
    'flow_errors':       ['count<100'],
    'http_req_failed':   ['rate<0.05'],
    'http_req_duration': ['p(95)<3000'],
    'total_flow_time':   ['p(95)<15000'],
  },
};

function generateSessionId() {
  const chars = '0123456789ABCDEF';
  let r = '';
  for (let i = 0; i < 8; i++) r += chars.charAt(Math.floor(Math.random() * chars.length));
  return r;
}

function safeParse(body) {
  try { return JSON.parse(body); } catch (_) { return null; }
}

export default function () {
  const flowStart = Date.now();
  const sessionId = generateSessionId();

  // ── 1. RESOLVE SLUG ──
  const slugRes = http.get(
    `${BASE_URL}/rest/v1/quizzes?slug=eq.${encodeURIComponent(QUIZ_SLUG)}&select=id,title,theme,show_analysis_card,show_congrats_card,response_delay,end_screen_template,end_screen_title,end_screen_subtitle,analysis_title,analysis_subtitle`,
    { headers: GET_HEADERS, tags: { step: 'resolve_slug' } }
  );

  if (!check(slugRes, { 'slug: status 200': (r) => r.status === 200 })) {
    console.log(`[SLUG FAIL] status=${slugRes.status} body=${slugRes.body}`);
    flowErrors.add(1);
    return;
  }

  const quizzes = safeParse(slugRes.body);
  if (!check(null, { 'slug: quiz found': () => Array.isArray(quizzes) && quizzes.length > 0 })) {
    console.log(`[SLUG FAIL] empty or invalid response: ${slugRes.body}`);
    flowErrors.add(1);
    return;
  }

  const quiz = quizzes[0];
  const quizId = quiz.id;
  quizLoadTime.add(slugRes.timings.duration);
  console.log(`[OK] Quiz resolved: id=${quizId} title="${quiz.title}"`);

  // ── 2. LOAD QUESTIONS ──
  const qRes = http.get(
    `${BASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=id,text,order,is_start_node,pre_messages,type&order=order.asc`,
    { headers: GET_HEADERS, tags: { step: 'load_questions' } }
  );

  if (!check(qRes, { 'questions: status 200': (r) => r.status === 200 })) {
    console.log(`[QUESTIONS FAIL] status=${qRes.status} body=${qRes.body}`);
    flowErrors.add(1);
    return;
  }

  const questions = safeParse(qRes.body);
  console.log(`[DEBUG] questions response (first 500 chars): ${String(qRes.body).substring(0, 500)}`);

  if (!check(null, { 'questions loaded': () => Array.isArray(questions) && questions.length > 0 })) {
    console.log(`[QUESTIONS FAIL] parsed=${JSON.stringify(questions)}`);
    flowErrors.add(1);
    return;
  }

  questionsLoadTime.add(qRes.timings.duration);
  console.log(`[OK] ${questions.length} questions loaded`);

  // ── 3. LOAD OPTIONS ──
  const qIds = questions.map((q) => q.id).join(',');
  const oRes = http.get(
    `${BASE_URL}/rest/v1/options?question_id=in.(${qIds})&select=id,question_id,label,next_question_id`,
    { headers: GET_HEADERS, tags: { step: 'load_options' } }
  );

  let allOptions = [];
  if (check(oRes, { 'options: status 200': (r) => r.status === 200 })) {
    allOptions = safeParse(oRes.body) || [];
    optionsLoadTime.add(oRes.timings.duration);
  } else {
    console.log(`[OPTIONS WARN] status=${oRes.status} body=${oRes.body}`);
  }

  const qMap = {};
  for (const q of questions) {
    qMap[q.id] = { ...q, options: allOptions.filter((o) => o.question_id === q.id) };
  }

  console.log(`[OK] ${allOptions.length} options loaded across ${questions.length} questions`);

  // ── 4. REGISTER VIEW ──
  const viewRes = http.post(
    `${BASE_URL}/rest/v1/quiz_views`,
    JSON.stringify({ quiz_id: quizId, session_id: sessionId }),
    { headers: POST_HEADERS, tags: { step: 'register_view' } }
  );
  check(viewRes, { 'view registered': (r) => r.status === 201 || r.status === 200 });

  // ── 5. WALK THE QUIZ FLOW ──
  let current = questions.find((q) => q.is_start_node);
  if (!current) {
    console.log('[FAIL] No start node');
    flowErrors.add(1);
    return;
  }

  let step = 0;
  const MAX_STEPS = 50;

  while (current && step < MAX_STEPS) {
    sleep(Math.random() * 1.5 + 0.3);

    const node = qMap[current.id];
    const opts = node.options || [];

    if (node.type === 'question' && opts.length > 0) {
      const chosen = opts[Math.floor(Math.random() * opts.length)];

      const rRes = http.post(
        `${BASE_URL}/rest/v1/quiz_responses`,
        JSON.stringify({
          quiz_id: quizId,
          question_id: current.id,
          option_id: chosen.id,
          session_id: sessionId,
          step_order: step,
        }),
        { headers: POST_HEADERS, tags: { step: 'submit_response' } }
      );

      if (!check(rRes, { 'response submitted': (r) => r.status === 201 || r.status === 200 })) {
        console.log(`[RESPONSE FAIL] step=${step} status=${rRes.status} body=${rRes.body}`);
        flowErrors.add(1);
        return;
      }
      responseSubmitTime.add(rRes.timings.duration);

      current = chosen.next_question_id ? qMap[chosen.next_question_id] || null : null;
    } else if (node.type === 'text') {
      const connector = opts[0];
      current = connector && connector.next_question_id ? qMap[connector.next_question_id] || null : null;
    } else {
      current = null;
    }

    step++;
  }

  // ── 6. SIMULATE END SCREEN ──
  if (quiz.show_analysis_card) {
    sleep((quiz.response_delay || 1000) / 1000);
  }

  totalFlowTime.add(Date.now() - flowStart);
  flowSuccess.add(1);
  console.log(`[OK] Flow complete: session=${sessionId} steps=${step}`);
}
