console.log("DEBUG: Versão 3.0 Otimizada para 1200 VUs - Plano PRO");
const { createClient } = require('@supabase/supabase-js');
const Redis = require('ioredis');

const supabase = createClient(
  'https://weizgspqnjhqxycnkvvh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndlaXpnc3BxbmpocXh5Y25rdnZoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDE5Nzk1MiwiZXhwIjoyMDg5NzczOTUyfQ.Rib0YGJmPCeW9GShNtV47Q-OGxBkbivvwusbS7Z_pag'
);

const redisUrl = process.env.REDIS_URL || 'redis://:L7YX64H4a2ORirc2YGO3hT61eXMMyTpB@redis-15192.c336.samerica-east1-1.gce.cloud.redislabs.com:15192';
const redis = new Redis(redisUrl);

let processandoAgora = false;

async function processar() {
  if (processandoAgora) return; // Evita atropelar o banco se ele estiver lento
  processandoAgora = true;

  try {
    // Aumentamos para 500 para reduzir o número de viagens ao banco (Disk IO)
    const items = await redis.lrange("fila_final_sucesso", 0, 499);
    if (!items || items.length === 0) {
      processandoAgora = false;
      return;
    }

    const batch = [];
    for (const item of items) {
      try {
        const parsed = JSON.parse(item);
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
        console.log(`✅ DISCO OK: Salvei lote de ${batch.length} registros.`);
        await redis.ltrim("fila_final_sucesso", items.length, -1);
      } else {
        // Se der erro de timeout (522), o lote continua no Redis para a próxima tentativa
        console.error("❌ Alerta Supabase:", error.message);
      }
    }
  } catch (err) { 
    console.error("💥 Erro de conexão:", err.message); 
  } finally {
    processandoAgora = false;
  }
}

// Aumentamos o intervalo para 2 segundos para estabilizar o Disk IO Budget
setInterval(processar, 2000);
console.log("🚀 Worker ESTABILIZADO (2s) aguardando dados...");