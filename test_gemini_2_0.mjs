
import { GoogleGenerativeAI } from '@google/generative-ai';
import fs from 'fs';

// Manually load env local
try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const match = envFile.match(/GEMINI_API_KEY=(.*)/);
    if (match) {
        process.env.GEMINI_API_KEY = match[1].trim();
    }
} catch (e) {
    console.log("Could not read .env.local");
}

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error("❌ No API Key found in .env.local");
    process.exit(1);
}

console.log(`Checking API Key: ${apiKey.substring(0, 5)}...`);

const genAI = new GoogleGenerativeAI(apiKey);

async function testModel() {
    const modelName = "gemini-2.0-flash";
    console.log(`\nTesting model: ${modelName}...`);
    try {
        const model = genAI.getGenerativeModel({ model: modelName });
        const prompt = "Reply with 'API_OK'";
        const result = await model.generateContent(prompt);
        const response = await result.response;
        console.log(`✅ Success with ${modelName}:`, response.text().trim());
        return true;
    } catch (error) {
        console.error(`❌ Failed with ${modelName}:`);
        console.error(error.message || error);
        return false;
    }
}

testModel();
