import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const TempoDeResposta = new Trend('tempo_validacao_ms');

export const options = {
  discardResponseBodies: true, 
  noConnectionReuse: false,    
  batch: 20, 

  stages: [
    { duration: '1m', target: 400 },   // Rampa de aquecimento
    { duration: '2m', target: 1200 },  // PICO: 1.200 Usuários Simultâneos
    { duration: '2m', target: 1200 },  // Estabilização
    { duration: '1m', target: 0 },     // Resfriamento
  ],

  thresholds: {
    http_req_failed: ['rate<0.05'],    
    http_req_duration: ['p(95)<2000'], 
  },
};

//                       

const URL = 'https://weizgspqnjhqxycnkvvh.supabase.co/functions/v1/push-to-redis';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaXpnc3BxbmpocXh5Y25rdnZoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQxOTc5NTIsImV4cCI6MjA4OTc3Mzk1Mn0.YKF7juxgow4y7DHdY1iBGUpzYVtY7nfARz-oZ4Wi0z4'.trim();

const PARAMS = {
  headers: {
    'Content-Type': 'application/json',
    'apikey': ANON_KEY,
    'Authorization': `Bearer ${ANON_KEY}`,
    'Connection': 'keep-alive', 
  },
  timeout: '15s',
};

export default function () {
  const data = {
    quiz_id: '5bf0919c-b9ea-4243-9e4d-c61ce044c590', 
    // Usando timestamp para garantir unicidade total no lote
    session_id: `stress_${__VU}_${__ITER}_${Date.now()}`, 
    question_id: '4b27d569-12d8-4461-9efe-18e7feab9100',
    option_id: 'ffd4d5be-8f64-46de-a2bf-5ea3c9bd3e54',
    step_order: 1
  };

  const payload = JSON.stringify(data);

  const res = http.post(URL, payload, PARAMS);

  TempoDeResposta.add(res.timings.duration);

  check(res, {
    'status_200': (r) => r.status === 200,
  });

  // Pacing: evita que todos os 1200 ataquem exatamente no mesmo milissegundo
  sleep(1 + Math.random() * 2);
}