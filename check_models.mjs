
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// Load ENV
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.*)/);
    if (match) process.env.GEMINI_API_KEY = match[1].trim();
} catch (e) { }

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log("Fetching available models for this key...");
    try {
        // There is no direct "listModels" on the instance in some versions, 
        // but typically we can try to access the model directly.
        // Actually, older SDKs expose it via the GoogleGenerativeAI class? No.
        // We have to assume if generateContent fails with 404, the list might be empty.

        // Let's try a direct fetch to the endpoint to see the raw error if SDK doesn't expose list
        // Actually, checking the models is not directly supported by the main helper in all versions easily
        // Let's just try to hit the API url manually with fetch to debug

        const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
        const resp = await fetch(url);
        const data = await resp.json();

        if (data.error) {
            console.error("❌ API Error:", data.error.message);
            console.log("Reason:", data.error.status);
        } else if (data.models) {
            console.log("✅ Available Models:");
            data.models.forEach(m => console.log(` - ${m.name}`));
        } else {
            console.log("⚠️ No models returned. Result:", data);
        }

    } catch (error) {
        console.error("Fetch failed:", error);
    }
}

listModels();
