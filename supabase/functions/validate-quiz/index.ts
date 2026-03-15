const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const MAX_TITLE_LENGTH = 200;
const MAX_QUESTION_TEXT_LENGTH = 1000;
const MAX_OPTION_LABEL_LENGTH = 200;
const MAX_PRE_MESSAGE_LENGTH = 500;
const MAX_PRE_MESSAGES_COUNT = 10;
const MAX_OPTIONS_PER_QUESTION = 10;
const MAX_QUESTIONS_PER_QUIZ = 50;

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

function sanitizeString(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .trim();
}

function validateQuizTitle(title: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof title !== 'string') {
    errors.push('Título deve ser uma string');
  } else {
    if (title.trim().length === 0) errors.push('Título não pode ser vazio');
    if (title.length > MAX_TITLE_LENGTH) errors.push(`Título excede ${MAX_TITLE_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors };
}

function validateQuestionText(text: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof text !== 'string') {
    errors.push('Texto da pergunta deve ser uma string');
  } else {
    if (text.trim().length === 0) errors.push('Texto da pergunta não pode ser vazio');
    if (text.length > MAX_QUESTION_TEXT_LENGTH) errors.push(`Texto excede ${MAX_QUESTION_TEXT_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors };
}

function validateOptionLabel(label: unknown): ValidationResult {
  const errors: string[] = [];
  if (typeof label !== 'string') {
    errors.push('Label da opção deve ser uma string');
  } else {
    if (label.trim().length === 0) errors.push('Label não pode ser vazia');
    if (label.length > MAX_OPTION_LABEL_LENGTH) errors.push(`Label excede ${MAX_OPTION_LABEL_LENGTH} caracteres`);
  }
  return { valid: errors.length === 0, errors };
}

function validatePreMessages(messages: unknown): ValidationResult {
  const errors: string[] = [];
  if (!Array.isArray(messages)) {
    errors.push('Pre-messages deve ser um array');
  } else {
    if (messages.length > MAX_PRE_MESSAGES_COUNT) errors.push(`Máximo de ${MAX_PRE_MESSAGES_COUNT} pre-messages`);
    messages.forEach((msg, i) => {
      if (typeof msg !== 'string') errors.push(`Pre-message ${i} deve ser string`);
      else if (msg.length > MAX_PRE_MESSAGE_LENGTH) errors.push(`Pre-message ${i} excede ${MAX_PRE_MESSAGE_LENGTH} chars`);
    });
  }
  return { valid: errors.length === 0, errors };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { type, data } = await req.json();
    let result: ValidationResult = { valid: true, errors: [] };

    switch (type) {
      case 'quiz_title':
        result = validateQuizTitle(data.title);
        break;
      case 'question_text':
        result = validateQuestionText(data.text);
        break;
      case 'option_label':
        result = validateOptionLabel(data.label);
        break;
      case 'pre_messages':
        result = validatePreMessages(data.pre_messages);
        break;
      case 'full_quiz':
        const titleResult = validateQuizTitle(data.title);
        if (!titleResult.valid) result.errors.push(...titleResult.errors);
        if (data.questions) {
          if (data.questions.length > MAX_QUESTIONS_PER_QUIZ) {
            result.errors.push(`Máximo de ${MAX_QUESTIONS_PER_QUIZ} perguntas por quiz`);
          }
          data.questions.forEach((q: any, i: number) => {
            const qr = validateQuestionText(q.text);
            if (!qr.valid) result.errors.push(...qr.errors.map((e: string) => `Pergunta ${i + 1}: ${e}`));
            if (q.options?.length > MAX_OPTIONS_PER_QUESTION) {
              result.errors.push(`Pergunta ${i + 1}: máximo de ${MAX_OPTIONS_PER_QUESTION} opções`);
            }
          });
        }
        result.valid = result.errors.length === 0;
        break;
      default:
        result = { valid: false, errors: ['Tipo de validação desconhecido'] };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ valid: false, errors: ['Erro interno de validação'] }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
