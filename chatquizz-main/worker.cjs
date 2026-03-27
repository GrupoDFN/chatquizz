console.log("DEBUG: Estou rodando a versão 2.0 - FILA FINAL");
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

// Configurações do Supabase
const supabase = createClient(
  'https://weizgspqnjhqxycnkvvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaXpnc3BxbmpocXh5Y25rdnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5Nzk1MiwiZXhwIjoyMDg5NzczOTUyfQ.Rib0YGJmPCeW9GShNtV47Q-OGxBkbivvwusbS7Z_pag'
);

// O código vai tentar ler da configuração do Render, se não achar, usa a sua URL atual
const redisUrl = process.env.REDIS_URL || 'redis://:L7YX64H4a2ORirc2YGO3hT61eXMMyTpB@redis-15192.c336.samerica-east1-1.gce.cloud.redislabs.com:15192';
const redis = new Redis(redisUrl);;

async function processar() {
  try {
    // 1. Mudamos o nome para ignorar o "lixo" acumulado na outra fila
    const items = await redis.lrange("fila_final_sucesso", 0, 99);
    if (!items || items.length === 0) return;

    const batch = [];
    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
        // 2. Garantimos que só entra o que tem quiz_id (fim do erro de null)
        if (parsed.quiz_id) { 
          batch.push({
            quiz_id: parsed.quiz_id,
            session_id: String(parsed.session_id),
            question_id: parsed.question_id,
            option_id: parsed.option_id,
            step_order: Number(parsed.step_order)
          });
        }
      } catch (e) { continue; }
    }

    if (batch.length > 0) {
      const { error } = await supabase.from('quiz_responses').insert(batch);
      
      if (!error) {
        console.log(`✅ SUCESSO! Salvei ${batch.length} novos registros na tabela.`);
        // 3. Removemos apenas o que foi processado nesta fila nova
        await redis.ltrim("fila_final_sucesso", items.length, -1);
      } else {
        console.error("❌ Erro no Supabase:", error.message);
      }
    }
  } catch (err) { 
    console.error("💥 Erro de conexão:", err.message); 
  }
}

// Roda a cada 200ms para manter a performance alta
setInterval(processar, 200);
console.log("🚀 Worker LIGADO e aguardando dados na 'fila_final_sucesso'...");