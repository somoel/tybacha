import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

const apiKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? '';

/** Google Generative AI client singleton */
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Gemini 2.0 Flash model configured for medical/exercise content.
 * Safety settings set to BLOCK_NONE to allow exercise and health-related content.
 */
export const geminiModel = genAI.getGenerativeModel({
    model: 'gemini-2.0-flash',
    safetySettings: [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_NONE,
        },
    ],
    generationConfig: {
        temperature: 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
    },
});
