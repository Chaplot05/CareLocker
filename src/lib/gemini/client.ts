import { GoogleGenerativeAI } from '@google/generative-ai';

export function isGeminiConfigured(): boolean {
  const apiKey = process.env.GEMINI_API_KEY;
  return !!apiKey && apiKey.length > 5 && !apiKey.includes('placeholder') && !apiKey.includes('your-gemini');
}

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || 'gemini-3.5-flash';
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

/**
 * Core helper to execute Gemini multimodal / text calls with structured JSON output
 * Includes automatic model fallback in case of model deprecation (404) or demand spikes (503).
 */
export async function generateStructuredContent({
  prompt,
  systemInstruction,
  fileBuffer,
  mimeType,
  modelName,
}: GenerateContentParams): Promise<any> {
  const genAI = getGeminiClient();
  const preferredModel = modelName || getGeminiModel();
  const fallbackModels = Array.from(new Set([preferredModel, 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-3.8-flash']));

  let lastError: any = null;

  for (const currentModelName of fallbackModels) {
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

      // Add multimodal attachment if provided (PDF / JPG / PNG)
      if (fileBuffer && mimeType) {
        parts.push({
          inlineData: {
            data: fileBuffer.toString('base64'),
            mimeType: mimeType === 'image/jpg' ? 'image/jpeg' : mimeType,
          },
        });
      }

      // Add textual prompt
      parts.push({ text: prompt });

      const result = await model.generateContent(parts);
      const response = await result.response;
      const text = response.text();
      return extractJsonFromText(text);
    } catch (err: any) {
      console.warn(`[Gemini SDK] Model "${currentModelName}" warning: ${err.message}. Trying next candidate...`);
      lastError = err;
    }
  }

  console.error('Gemini API all fallback models failed:', lastError);
  throw new Error(`Gemini AI Processing Error: ${lastError?.message || 'All candidate models failed'}`);
}
