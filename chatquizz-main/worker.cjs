const http = require('http');
const Redis = require('ioredis');
const { createClient } = require('@supabase/supabase-js');

// 1. Servidor de Fachada para o Render (Plano Free)
const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('Worker ORIIS is Live');
});
server.keepAliveTimeout = 120000;
server.listen(process.env.PORT || 10000);

// 2. Configurações (Use suas variáveis de ambiente no Render)
const redis = new Redis(process.env.REDIS_URL);
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

async function processarFila() {
    console.log("🚀 Worker em modo BATCH ativo e aguardando...");

    while (true) {
        try {
            // Pega até 50 itens da fila de uma vez para não sobrecarregar o banco
            const registros = await redis.lrange("fila_respostas", 0, 49);

            if (registros.length > 0) {
                console.log(`📦 Processando lote de ${registros.length} registros...`);
                
                const dadosParaInserir = registros.map(r => JSON.parse(r));

                // Inserção em massa no Supabase (Muito mais rápido que um por um)
                const { error } = await supabase
                    .from('respostas_quiz')
                    .insert(dadosParaInserir);

                if (!error) {
                    // Remove apenas os itens que acabamos de processar com sucesso
                    await redis.ltrim("fila_respostas", registros.length, -1);
                    console.log("✅ Lote inserido com sucesso!");
                } else {
                    console.error("❌ Erro ao inserir lote no Supabase:", error.message);
                }
            }
        } catch (err) {
            console.error("🔥 Erro crítico no Worker:", err.message);
        }

        // Pequena pausa para evitar loop infinito de erro e poupar CPU
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

processarFila();