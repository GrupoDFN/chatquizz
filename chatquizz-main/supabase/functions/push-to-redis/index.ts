import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { connect } from "https://deno.land/x/redis@v0.29.0/mod.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  let redis

  try {
    const body = await req.json()

    // 🔒 VALIDAÇÃO FORTE (evita lixo no Redis)
    if (!body.quiz_id || typeof body.quiz_id !== "string" || body.quiz_id.trim() === "") {
      return new Response(JSON.stringify({
        error: "quiz_id obrigatório"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      })
    }

    // 🔴 Conexão Redis
    redis = await connect({
      hostname: "redis-15192.c336.samerica-east1-1.gce.cloud.redislabs.com",
      port: 15192,
      password: "L7YX64H4a2ORirc2YGO3hT61eXMMyTpB",
    })

    // 🚀 ENFILEIRAMENTO PADRÃO (SEM payload aninhado)
    await redis.lpush("fila_quiz", JSON.stringify({
      quiz_id: body.quiz_id,
      session_id: body.session_id || null,
      question_id: body.question_id || null,
      option_id: body.option_id || null,
      step_order: Number(body.step_order || 0),
      created_at: new Date().toISOString()
    }))

    return new Response(JSON.stringify({
      success: true
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    })

  } catch (e) {
    return new Response(JSON.stringify({
      error: "Erro interno: " + e.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    })
  } finally {
    if (redis) {
      try {
        await redis.quit()
      } catch (_) {}
    }
  }
})