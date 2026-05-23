// src/services/gemini-api.ts
// Простой и надёжный клиент для Gemini API с перебором моделей и ключей
// Автоматическое продолжение при обрыве, без жёстких ограничений на длину.

const MODELS = [
  'gemini-2.5-flash-preview-09-2025',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-1.5-flash',
];

function getApiKeys(): string[] {
  const keys: string[] = [];
  const mainKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  if (mainKey?.trim()) keys.push(mainKey.trim());
  const backupKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY_BACKUP;
  if (backupKey?.trim()) keys.push(backupKey.trim());
  return keys;
}

// Системный промпт – без жёсткого ограничения длины, только стиль и структура
const SYSTEM_PROMPT = `
Сен — "Silk Road Map" қосымшасының AI көмекшісісің.
Сенің міндетің — Ұлы Жібек жолының Қазақстандағы бөлігіне қатысты сұрақтарға қазақ тілінде жауап беру.
Жауапты құрылымда: қысқа кіріспе, негізгі бөлім (мысалы, тармақтар), қорытынды.
Фактілерді ғана айт, болжамдардан аулақ бол.
Егер сұрақ нақты қала/орын туралы болса, оның Жібек жолындағы рөлін, тарихи кезеңін және маңызды деректерді көрсет.
`;

async function geminiCall(
  userMessage: string,
  apiKey: string,
  model: string
): Promise<{ text: string; finishReason?: string }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const requestBody = {
    systemInstruction: {
      parts: [{ text: SYSTEM_PROMPT }],
    },
    contents: [
      {
        role: 'user',
        parts: [{ text: userMessage }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 2048, // достаточно для длинного ответа
      topP: 0.9,
      topK: 40,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];
    if (!candidate) throw new Error('No candidates in response');

    const parts = candidate.content?.parts;
    if (!Array.isArray(parts) || parts.length === 0) throw new Error('Empty response parts');

    const text = parts.map((p: any) => p.text).join('').trim();
    const finishReason = candidate.finishReason;

    return { text, finishReason };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Уақыт бітті. Интернетті тексеріп, қайта көр.');
    }
    throw error;
  }
}

/**
 * Отправляет запрос к Gemini API, перебирая модели и ключи.
 * При необходимости автоматически запрашивает продолжение (если ответ оборван).
 * @param userMessage - сообщение пользователя
 * @param maxContinuations - максимальное число продолжений (по умолчанию 3)
 * @returns полный текст ответа
 */
export async function geminiGenerateText(
  userMessage: string,
  maxContinuations: number = 3
): Promise<string> {
  const apiKeys = getApiKeys();
  if (apiKeys.length === 0) {
    throw new Error('API кілті табылмады. .env файлын тексеріңіз.');
  }

  for (const apiKey of apiKeys) {
    for (const model of MODELS) {
      try {
        const { text, finishReason } = await geminiCall(userMessage, apiKey, model);

        let fullText = text;
        let continuationCount = 0;

        while (finishReason === 'MAX_TOKENS' && continuationCount < maxContinuations) {
          continuationCount++;
          const continuationPrompt = `
            Жауап толық емес. Жалғастыр, бірақ бұрын айтылғанды қайталама.
            Тек жаңа бөлікті жаз. Соңғы үзінді: "${fullText.slice(-300)}"
          `;
          const { text: nextPart, finishReason: nextReason } = await geminiCall(
            continuationPrompt,
            apiKey,
            model
          );
          fullText += '\n' + nextPart;
          if (nextReason !== 'MAX_TOKENS') break;
        }

        return fullText;
      } catch (error: any) {
        console.warn(`Модель ${model} с текущим ключом не сработала:`, error.message);
      }
    }
  }

  throw new Error('Қызмет қазір қолжетімсіз. Кейінірек қайталаңыз.');
}

export async function geminiGenerateWithOptions(opts: { prompt: string }): Promise<string> {
  return geminiGenerateText(opts.prompt);
}

export function buildSilkRoadPrompt(params: { topic: string; mode?: string }): string {
  return `${params.topic} туралы айтып бер.`;
}