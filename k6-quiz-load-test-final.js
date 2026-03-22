import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

var BASE_URL = 'https://dyzccknotyujnmdrhdhs.supabase.co';
var ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5emNja25vdHl1am5tZHJoZGhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1NTQ4NDYsImV4cCI6MjA4OTEzMDg0Nn0.SrxNT9x04XRanE93UTM9cU_s7RLGfPzfAyO0u3stQLw';

var GET_HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': 'Bearer ' + ANON_KEY,
  'Accept': 'application/json',
};

var POST_HEADERS = {
  'apikey': ANON_KEY,
  'Authorization': 'Bearer ' + ANON_KEY,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

var flowErrors = new Counter('flow_errors');
var flowSuccess = new Counter('flow_success');
var quizLoadTime = new Trend('quiz_load_time');
var questionsLoadTime = new Trend('questions_load_time');
var optionsLoadTime = new Trend('options_load_time');
var responseSubmitTime = new Trend('response_submit_time');
var totalFlowTime = new Trend('total_flow_time');

export var options = {
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
    'flow_errors': ['count<100'],
    'http_req_failed': ['rate<0.05'],
    'http_req_duration': ['p(95)<3000'],
    'total_flow_time': ['p(95)<15000'],
  },
};

function generateSessionId() {
  var chars = '0123456789ABCDEF';
  var r = '';
  for (var i = 0; i < 8; i++) {
    r += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return r;
}

function safeParse(body) {
  try {
    return JSON.parse(body);
  } catch (e) {
    return null;
  }
}

export function setup() {
  var envSlug = __ENV.QUIZ_SLUG || '';

  if (envSlug !== '') {
    console.log('[SETUP] Trying user-provided slug: "' + envSlug + '"');
    var res = http.get(
      BASE_URL + '/rest/v1/quizzes?slug=eq.' + encodeURIComponent(envSlug) + '&select=id,slug&limit=1',
      { headers: GET_HEADERS }
    );
    var data = safeParse(res.body);
    if (Array.isArray(data) && data.length > 0) {
      console.log('[SETUP] Slug "' + envSlug + '" is valid, quiz id=' + data[0].id);
      return { slug: envSlug };
    }
    console.log('[SETUP] Slug "' + envSlug + '" not found. status=' + res.status + ' body=' + res.body);
  }

  console.log('[SETUP] Auto-detecting a published quiz...');
  var fallbackRes = http.get(
    BASE_URL + '/rest/v1/quizzes?slug=not.is.null&select=id,slug,title&limit=1&order=created_at.desc',
    { headers: GET_HEADERS }
  );

  var fallbackData = safeParse(fallbackRes.body);
  if (!Array.isArray(fallbackData) || fallbackData.length === 0) {
    console.log('[SETUP] No published quizzes found! status=' + fallbackRes.status + ' body=' + fallbackRes.body);
    return { slug: '' };
  }

  var chosen = fallbackData[0];
  console.log('[SETUP] Auto-detected quiz: slug="' + chosen.slug + '" id=' + chosen.id + ' title="' + chosen.title + '"');
  return { slug: chosen.slug };
}

export default function (data) {
  var quizSlug = data.slug;

  if (!quizSlug || quizSlug === '') {
    console.log('[SKIP] No valid slug available.');
    flowErrors.add(1);
    return;
  }

  var flowStart = Date.now();
  var sessionId = generateSessionId();

  // 1. RESOLVE SLUG
  var slugRes = http.get(
    BASE_URL + '/rest/v1/quizzes?slug=eq.' + encodeURIComponent(quizSlug) + '&select=id,title,theme,show_analysis_card,show_congrats_card,response_delay,end_screen_template,end_screen_title,end_screen_subtitle,analysis_title,analysis_subtitle',
    { headers: GET_HEADERS, tags: { step: 'resolve_slug' } }
  );

  if (!check(slugRes, { 'slug: status 200': function (r) { return r.status === 200; } })) {
    console.log('[SLUG FAIL] status=' + slugRes.status + ' body=' + slugRes.body);
    flowErrors.add(1);
    return;
  }

  var quizzes = safeParse(slugRes.body);
  if (!Array.isArray(quizzes) || quizzes.length === 0) {
    console.log('[SLUG FAIL] empty or invalid response: ' + slugRes.body);
    flowErrors.add(1);
    return;
  }

  var quiz = quizzes[0];
  var quizId = quiz.id;
  quizLoadTime.add(slugRes.timings.duration);
  console.log('[OK] Quiz resolved: slug="' + quizSlug + '" id=' + quizId + ' title="' + quiz.title + '"');

  // 2. LOAD QUESTIONS
  var qRes = http.get(
    BASE_URL + '/rest/v1/questions?quiz_id=eq.' + quizId + '&select=id,text,order,is_start_node,pre_messages,type&order=order.asc',
    { headers: GET_HEADERS, tags: { step: 'load_questions' } }
  );

  if (!check(qRes, { 'questions: status 200': function (r) { return r.status === 200; } })) {
    console.log('[QUESTIONS FAIL] status=' + qRes.status + ' body=' + qRes.body);
    flowErrors.add(1);
    return;
  }

  var questions = safeParse(qRes.body);
  if (!Array.isArray(questions) || questions.length === 0) {
    console.log('[QUESTIONS FAIL] empty or parse error. body=' + String(qRes.body).substring(0, 500));
    flowErrors.add(1);
    return;
  }

  questionsLoadTime.add(qRes.timings.duration);
  console.log('[OK] ' + questions.length + ' questions loaded');

  // 3. LOAD OPTIONS
  var qIds = [];
  for (var qi = 0; qi < questions.length; qi++) {
    qIds.push(questions[qi].id);
  }
  var oRes = http.get(
    BASE_URL + '/rest/v1/options?question_id=in.(' + qIds.join(',') + ')&select=id,question_id,label,next_question_id',
    { headers: GET_HEADERS, tags: { step: 'load_options' } }
  );

  var allOptions = [];
  if (check(oRes, { 'options: status 200': function (r) { return r.status === 200; } })) {
    allOptions = safeParse(oRes.body) || [];
    optionsLoadTime.add(oRes.timings.duration);
  } else {
    console.log('[OPTIONS WARN] status=' + oRes.status + ' body=' + oRes.body);
  }

  var qMap = {};
  for (var mi = 0; mi < questions.length; mi++) {
    var q = questions[mi];
    var opts = [];
    for (var oi = 0; oi < allOptions.length; oi++) {
      if (allOptions[oi].question_id === q.id) {
        opts.push(allOptions[oi]);
      }
    }
    qMap[q.id] = { id: q.id, text: q.text, type: q.type, is_start_node: q.is_start_node, options: opts };
  }

  console.log('[OK] ' + allOptions.length + ' options loaded across ' + questions.length + ' questions');

  // 4. REGISTER VIEW
  var viewRes = http.post(
    BASE_URL + '/rest/v1/quiz_views',
    JSON.stringify({ quiz_id: quizId, session_id: sessionId }),
    { headers: POST_HEADERS, tags: { step: 'register_view' } }
  );
  check(viewRes, { 'view registered': function (r) { return r.status === 201 || r.status === 200; } });

  // 5. WALK THE QUIZ FLOW
  var current = null;
  for (var si = 0; si < questions.length; si++) {
    if (questions[si].is_start_node) {
      current = qMap[questions[si].id];
      break;
    }
  }

  if (!current) {
    console.log('[FAIL] No start node found');
    flowErrors.add(1);
    return;
  }

  var step = 0;
  var MAX_STEPS = 50;

  while (current && step < MAX_STEPS) {
    sleep(Math.random() * 1.5 + 0.3);

    var node = current;
    var nodeOpts = node.options || [];

    if (node.type === 'question' && nodeOpts.length > 0) {
      var chosen = nodeOpts[Math.floor(Math.random() * nodeOpts.length)];

      var rRes = http.post(
        BASE_URL + '/rest/v1/quiz_responses',
        JSON.stringify({
          quiz_id: quizId,
          question_id: node.id,
          option_id: chosen.id,
          session_id: sessionId,
          step_order: step,
        }),
        { headers: POST_HEADERS, tags: { step: 'submit_response' } }
      );

      if (!check(rRes, { 'response submitted': function (r) { return r.status === 201 || r.status === 200; } })) {
        console.log('[RESPONSE FAIL] step=' + step + ' status=' + rRes.status + ' body=' + rRes.body);
        flowErrors.add(1);
        return;
      }
      responseSubmitTime.add(rRes.timings.duration);

      if (chosen.next_question_id && qMap[chosen.next_question_id]) {
        current = qMap[chosen.next_question_id];
      } else {
        current = null;
      }
    } else if (node.type === 'text') {
      var connector = nodeOpts.length > 0 ? nodeOpts[0] : null;
      if (connector && connector.next_question_id && qMap[connector.next_question_id]) {
        current = qMap[connector.next_question_id];
      } else {
        current = null;
      }
    } else {
      current = null;
    }

    step++;
  }

  // 6. SIMULATE END SCREEN
  if (quiz.show_analysis_card) {
    sleep((quiz.response_delay || 1000) / 1000);
  }

  totalFlowTime.add(Date.now() - flowStart);
  flowSuccess.add(1);
  console.log('[OK] Flow complete: session=' + sessionId + ' steps=' + step);
}
