import { GoogleGenerativeAI } from '@google/generative-ai';

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.length > 5 && !apiKey.includes('placeholder') && !apiKey.includes('your-gemini');
}

export function getGeminiModel(): string {
  return (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
}

export function getGeminiClient(): GoogleGenerativeAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || !isGeminiConfigured()) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please add your valid Google Gemini API Key to .env.local'
    );
  }
  return new GoogleGenerativeAI(apiKey);
}

/**
 * Clean LLM response to extract valid JSON
 */
export function extractJsonFromText(rawText: string): any {
  let cleaned = rawText.trim();
  // Strip ```json and ``` markdown code fences if present
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  cleaned = cleaned.trim();
  return JSON.parse(cleaned);
}

export interface GenerateContentParams {
  prompt: string;
  systemInstruction?: string;
  fileBuffer?: Buffer;
  mimeType?: string;
  modelName?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Core helper to execute Gemini multimodal / text calls with structured JSON output.
 * Features:
 * - Reads GEMINI_MODEL dynamically
 * - Respects currently supported models (gemini-3.5-flash-lite, gemini-3.5-flash, gemini-3.8-flash)
 * - Sensible retry with exponential backoff on 503 (overload) and 429 (rate limit)
 * - Automatic fallback to healthy candidate models
 */
export async function generateStructuredContent({
  prompt,
  systemInstruction,
  fileBuffer,
  mimeType,
  modelName,
}: GenerateContentParams): Promise<any> {
  const genAI = getGeminiClient();
  const configuredModel = getGeminiModel();
  const preferredModel = (modelName || configuredModel).trim();

  // Candidate models in priority order: preferred -> flash-lite -> flash -> 3.8-flash
  const fallbackModels = Array.from(
    new Set([
      preferredModel,
      'gemini-3.5-flash-lite',
      'gemini-3.5-flash',
      'gemini-3.8-flash',
    ])
  ).filter(Boolean);

  let lastError: any = null;

  for (const currentModelName of fallbackModels) {
    const maxRetries = 2;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: currentModelName,
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0.1,
          },
          systemInstruction: systemInstruction
            ? {
                role: 'system',
                parts: [{ text: systemInstruction }],
              }
            : undefined,
        });

        const parts: any[] = [];

        // Multimodal attachment if provided (PDF / JPG / PNG)
        if (fileBuffer && mimeType) {
          parts.push({
            inlineData: {
              data: fileBuffer.toString('base64'),
              mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
            },
          });
        }

        // Text prompt
        parts.push({ text: prompt });

        const result = await model.generateContent(parts);
        const response = await result.response;
        const text = response.text();
        return extractJsonFromText(text);
      } catch (err: any) {
        lastError = err;
        const status = err.status || (err.message?.includes('503') ? 503 : err.message?.includes('429') ? 429 : null);
        const isTransient = status === 503 || status === 429 || err.message?.includes('overloaded');

        if (isTransient && attempt < maxRetries) {
          const backoffMs = 1000 * Math.pow(2, attempt) + Math.floor(Math.random() * 500);
          console.warn(
            `[Gemini SDK] Model "${currentModelName}" received transient status ${status || 'overload'}. Retrying attempt ${attempt + 1}/${maxRetries} after ${backoffMs}ms...`
          );
          await delay(backoffMs);
          continue;
        }

        // For non-transient errors (like 404 deprecated or exhausted retries), break to next fallback model
        console.warn(
          `[Gemini SDK] Candidate "${currentModelName}" failed (status ${status || err.message}). Switching to next fallback model...`
        );
        break;
      }
    }
  }

  console.error('Gemini API all candidate models exhausted:', lastError);
  throw new Error(`Gemini AI Processing Error: ${lastError?.message || 'All candidate models failed'}`);
}
