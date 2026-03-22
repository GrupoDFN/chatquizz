import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const BASE_URL = 'https://dyzccknotyujnmdrhdhs.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5emNja25vdHl1am5tZHJoZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ4NDYsImV4cCI6MjA4OTEzMDg0Nn0.SrxNT9x04XRanE93UTM9cU_s7RLGfPzfAyO0u3stQLw';

const GET_HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  Accept: 'application/json',
};

const POST_HEADERS = {
  apikey: ANON_KEY,
  Authorization: `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=minimal',
};

const flowErrors = new Counter('flow_errors');
const flowSuccess = new Counter('flow_success');
const quizLoadTime = new Trend('quiz_load_time');
const questionsLoadTime = new Trend('questions_load_time');
const optionsLoadTime = new Trend('options_load_time');
const responseSubmitTime = new Trend('response_submit_time');
const totalFlowTime = new Trend('total_flow_time');

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
    flow_success: ['count>0'],
    flow_errors: ['count<100'],
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    total_flow_time: ['p(95)<15000'],
  },
};

const safeParse = (body) => {
  try {
    return JSON.parse(body);
  } catch (e) {
    return null;
  }
};

const isNonEmptyArray = (value) => Array.isArray(value) && value.length > 0;

const generateSessionId = () =>
  Array.from({ length: 8 }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');

const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const getQuizBySlug = (slug) => {
  const res = http.get(
    `${BASE_URL}/rest/v1/quizzes?slug=eq.${encodeURIComponent(slug)}&select=id,slug,title,theme,show_analysis_card,show_congrats_card,response_delay,end_screen_template,end_screen_title,end_screen_subtitle,analysis_title,analysis_subtitle&limit=1`,
    { headers: GET_HEADERS, tags: { step: 'resolve_slug' } }
  );

  const data = safeParse(res.body);
  const found = res.status === 200 && isNonEmptyArray(data);

  return { res, data, found };
};

const getFallbackSlug = () => {
  const res = http.get(
    `${BASE_URL}/rest/v1/quizzes?slug=not.is.null&select=id,slug,title&limit=1&order=created_at.desc`,
    { headers: GET_HEADERS, tags: { step: 'fallback_slug' } }
  );

  const data = safeParse(res.body);
  const found = res.status === 200 && isNonEmptyArray(data) && !!data[0].slug;

  return { res, data, found };
};

export function setup() {
  const envSlug = (__ENV.QUIZ_SLUG || '').trim();

  if (envSlug) {
    const { res, data, found } = getQuizBySlug(envSlug);

    if (found) {
      console.log(`[SETUP] Using QUIZ_SLUG="${envSlug}" (quiz_id=${data[0].id})`);
      return { slug: envSlug };
    }

    console.log(`[SETUP] QUIZ_SLUG invalid or not found: slug="${envSlug}" status=${res.status} body=${res.body}`);
  }

  const fallback = getFallbackSlug();

  if (!fallback.found) {
    console.log(`[SETUP] No valid quiz slug found. status=${fallback.res.status} body=${fallback.res.body}`);
    return { slug: '' };
  }

  const slug = fallback.data[0].slug;
  console.log(`[SETUP] Auto-selected slug="${slug}" (quiz_id=${fallback.data[0].id})`);

  return { slug };
}

export default function (data) {
  const slug = (data && data.slug) || '';

  if (!slug) {
    console.log('[FLOW] Abort: no valid slug from setup()');
    flowErrors.add(1);
    return;
  }

  const flowStart = Date.now();
  const sessionId = generateSessionId();

  const slugLookup = getQuizBySlug(slug);

  if (!check(slugLookup.res, { 'slug status is 200': (r) => r.status === 200 })) {
    console.log(`[SLUG FAIL] status=${slugLookup.res.status} body=${slugLookup.res.body}`);
    flowErrors.add(1);
    return;
  }

  if (!check(slugLookup.data, { 'quiz found': (arr) => isNonEmptyArray(arr) })) {
    console.log(`[SLUG FAIL] empty or invalid quiz response: ${slugLookup.res.body}`);
    flowErrors.add(1);
    return;
  }

  const quiz = slugLookup.data[0];
  const quizId = quiz.id;
  quizLoadTime.add(slugLookup.res.timings.duration);
  console.log(`[FLOW] slug="${slug}" resolved -> quiz_id=${quizId}`);

  const questionsRes = http.get(
    `${BASE_URL}/rest/v1/questions?quiz_id=eq.${quizId}&select=id,text,order,is_start_node,pre_messages,type&order=order.asc`,
    { headers: GET_HEADERS, tags: { step: 'load_questions' } }
  );

  if (!check(questionsRes, { 'questions status is 200': (r) => r.status === 200 })) {
    console.log(`[QUESTIONS FAIL] status=${questionsRes.status} body=${questionsRes.body}`);
    flowErrors.add(1);
    return;
  }

  const questions = safeParse(questionsRes.body);
  console.log(`[DEBUG] questions body: ${String(questionsRes.body).slice(0, 800)}`);

  if (!check(questions, { 'questions loaded': (arr) => isNonEmptyArray(arr) })) {
    console.log(`[QUESTIONS FAIL] invalid or empty questions array for quiz_id=${quizId}`);
    flowErrors.add(1);
    return;
  }

  questionsLoadTime.add(questionsRes.timings.duration);
  console.log(`[FLOW] questions loaded=${questions.length}`);

  const questionIds = questions.map((q) => q.id);
  const optionsRes = http.get(
    `${BASE_URL}/rest/v1/options?question_id=in.(${questionIds.join(',')})&select=id,question_id,label,next_question_id`,
    { headers: GET_HEADERS, tags: { step: 'load_options' } }
  );

  if (!check(optionsRes, { 'options status is 200': (r) => r.status === 200 })) {
    console.log(`[OPTIONS FAIL] status=${optionsRes.status} body=${optionsRes.body}`);
    flowErrors.add(1);
    return;
  }

  const allOptions = safeParse(optionsRes.body);

  if (!check(allOptions, { 'options payload is array': (arr) => Array.isArray(arr) })) {
    console.log(`[OPTIONS FAIL] invalid options payload: ${optionsRes.body}`);
    flowErrors.add(1);
    return;
  }

  optionsLoadTime.add(optionsRes.timings.duration);
  console.log(`[FLOW] options loaded=${allOptions.length}`);

  const optionsByQuestionId = allOptions.reduce((acc, opt) => {
    if (!acc[opt.question_id]) acc[opt.question_id] = [];
    acc[opt.question_id].push(opt);
    return acc;
  }, {});

  const questionById = questions.reduce((acc, q) => {
    acc[q.id] = q;
    return acc;
  }, {});

  const viewRes = http.post(
    `${BASE_URL}/rest/v1/quiz_views`,
    JSON.stringify({ quiz_id: quizId, session_id: sessionId }),
    { headers: POST_HEADERS, tags: { step: 'register_view' } }
  );

  check(viewRes, {
    'view registered': (r) => r.status === 201 || r.status === 200 || r.status === 204,
  });

  let current = questions.find((q) => q.is_start_node) || questions[0];

  if (!current) {
    console.log('[FLOW FAIL] no start node and no fallback question');
    flowErrors.add(1);
    return;
  }

  let step = 0;
  const MAX_STEPS = 50;

  while (current && step < MAX_STEPS) {
    sleep(Math.random() * 1.2 + 0.2);

    const nodeOptions = optionsByQuestionId[current.id] || [];

    if (current.type === 'question') {
      if (!isNonEmptyArray(nodeOptions)) {
        console.log(`[FLOW FAIL] question without options question_id=${current.id}`);
        flowErrors.add(1);
        return;
      }

      const chosen = pickRandom(nodeOptions);

      const responseRes = http.post(
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

      if (
        !check(responseRes, {
          'response submitted': (r) => r.status === 201 || r.status === 200 || r.status === 204,
        })
      ) {
        console.log(`[RESPONSE FAIL] step=${step} status=${responseRes.status} body=${responseRes.body}`);
        flowErrors.add(1);
        return;
      }

      responseSubmitTime.add(responseRes.timings.duration);

      current = chosen.next_question_id ? questionById[chosen.next_question_id] || null : null;
    } else if (current.type === 'text') {
      const connector = nodeOptions[0];
      current = connector?.next_question_id ? questionById[connector.next_question_id] || null : null;
    } else {
      current = null;
    }

    step += 1;
  }

  if (quiz.show_analysis_card) {
    sleep((quiz.response_delay || 1000) / 1000);
  }

  totalFlowTime.add(Date.now() - flowStart);
  flowSuccess.add(1);
  console.log(`[FLOW OK] session=${sessionId} slug="${slug}" steps=${step}`);
}
