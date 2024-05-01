import type { Context } from "@netlify/functions";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export default async (req: Request, context: Context) => {
    //const AI_KEY = Netlify.env.get("GOOGLE_AI_KEY");
    const AI_KEY = process.env.GOOGLE_AI_KEY;
    const { prompt } = context.params;

    const generationConfig = {
        temperature: 1,
        topK: 0,
        topP: 0.95,
        maxOutputTokens: 8192,
    };
  
    const safetySettings = [
        {
            category: HarmCategory.HARM_CATEGORY_HARASSMENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
        {
            category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
            threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
        },
    ];

    const genAI = new GoogleGenerativeAI(AI_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-pro" });

    const chat = model.startChat({
        generationConfig,
        safetySettings,
        history: [
            {
            role: "user",
            parts: [{ text: "Hello, I am a Warframe player" }],
            },
            {
            role: "model",
            parts: [{ text: "Hey, what would you like to know?" }],
            },
        ],
    });

    /*const history = await chat.getHistory();
    const msgContent = { role: "user", parts: [{ text: msg }] };
    const contents = [...history, msgContent];
    const { totalTokens } = await model.countTokens({ contents });*/  

    const result = await chat.sendMessage(prompt);
    const response = await result.response;
    const text = response.text();

    return new Response(text, { status: 200 });
}