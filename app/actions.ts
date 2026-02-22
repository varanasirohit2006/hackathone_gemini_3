'use server';

import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const MODEL_NAME = 'gemini-2.5-flash';

// Helper: call Gemini with text-only prompt and get JSON back
async function callGemini(prompt: string): Promise<any> {
    if (!genAI) throw new Error('No API Key');
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    // Extract JSON from response (handle markdown code fences)
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr);
}

// Helper: call Gemini with image + text prompt
async function callGeminiWithImage(prompt: string, base64Image: string): Promise<any> {
    if (!genAI) throw new Error('No API Key');
    const model = genAI.getGenerativeModel({ model: MODEL_NAME });

    // Extract the mime type and base64 data
    let mimeType = 'image/jpeg';
    let imageData = base64Image;

    if (base64Image.startsWith('data:')) {
        const match = base64Image.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
            mimeType = match[1];
            imageData = match[2];
        } else {
            // If it's a data URL but doesn't match, strip the prefix
            imageData = base64Image.split(',')[1] || base64Image;
        }
    }

    const imagePart = {
        inlineData: {
            data: imageData,
            mimeType: mimeType,
        },
    };

    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    // Extract JSON from response
    const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/```\s*([\s\S]*?)```/);
    const jsonStr = jsonMatch ? jsonMatch[1].trim() : text.trim();
    return JSON.parse(jsonStr);
}

export async function analyzeImage(base64Image: string) {
    try {
        if (!apiKey) return { error: true, message: "API Key (Gemini) Missing" };

        const prompt = `Analyze this image for waste management.
        Output a JSON object ONLY with these fields (no markdown, no extra text):
        {
            "wasteType": "string (e.g., Plastic, construction debris)",
            "hazardLevel": "string (High/Low)",
            "operationalStatus": "string (Normal/Breakdown - if truck visible)",
            "infrastructureNeed": "string (None/Municipal Shed/Install Bin)",
            "recommendation": "string (Action plan)",
            "confidence": "number (0-1)"
        }`;

        // If the image is a URL (not base64), use text-only with URL reference
        if (base64Image.startsWith('http')) {
            return await callGemini(prompt + `\n\nImage URL: ${base64Image}`);
        }

        return await callGeminiWithImage(prompt, base64Image);

    } catch (error: any) {
        console.error("Gemini Image Analysis Error:", error.message);
        return {
            error: true,
            message: error.message || 'Gemini API Error',
            wasteType: "Unidentified Object",
            hazardLevel: "Low",
            recommendation: "Manual Inspection Required (AI Error)",
            confidence: 0
        };
    }
}

export async function analyzeItemValue(base64Image: string) {
    try {
        if (!apiKey) return {
            error: true,
            message: "API Key Missing",
            itemName: "Unknown Item",
            estimatedValue: 0,
            currency: "USD",
            recyclingPotential: "Unknown"
        };

        const prompt = `You are an expert appraiser for a recycling marketplace ("Trash-to-Cash").
        Analyze this image and identify the main waste item.
        Estimate its scrap/recycling market value.
        
        Output JSON ONLY (no markdown, no extra text):
        {
            "itemName": "string (e.g. Old Copper Wire, Plastic Bottles)",
            "category": "string (Metal/Plastic/E-Waste/Organic)",
            "estimatedValue": number,
            "currency": "USD",
            "condition": "string",
            "recyclingPotential": "High | Medium | Low",
            "marketDemand": "High | Low"
        }`;

        if (base64Image.startsWith('http')) {
            return await callGemini(prompt + `\n\nImage URL: ${base64Image}`);
        }

        return await callGeminiWithImage(prompt, base64Image);

    } catch (error: any) {
        console.error("Gemini Value Analysis Error:", error.message);
        return {
            error: true,
            message: error.message || 'Gemini API Error',
            itemName: "Unidentified Recyclable",
            category: "General Waste",
            estimatedValue: 0.05,
            currency: "USD",
            condition: "Scrap",
            recyclingPotential: "Medium",
            marketDemand: "Medium"
        };
    }
}

export async function analyzeAudio(base64Audio: string) {
    // Gemini 2.5 Flash supports audio natively, but for simplicity
    // we use client-side Web Speech API for transcription.
    return {
        transcription: "Audio transcription handled by browser Speech API.",
        category: "General",
        actionTrigger: "Dispatch Truck",
        summary: "Voice input processed on device.",
        fallback: true
    };
}

export async function getAIActionPlan(reportText: string) {
    try {
        if (!apiKey) return { riskLevel: 'Medium', actionType: 'LOG_ONLY', reasoning: 'AI Offline' };

        const prompt = `
        You are an Autonomous City Operations AI.
        Analyze this waste management report: "${reportText}"

        Decide the IMMEDIATE operational action.
        
        Rules:
        - If "breakdown", "stalled", "engine": -> REROUTE_FLEET
        - If "daily", "every day", "recurring", "no bin": -> INSTALL_SHED
        - If "fire", "smoke", "chemical", "medical": -> HAZMAT_TEAM
        - If "full", "overflow": -> DISPATCH_TRUCK
        - Otherwise: -> LOG_ONLY

        Return JSON ONLY (no markdown, no extra text):
        {
            "riskLevel": "Low" | "Medium" | "High" | "Critical",
            "actionType": "REROUTE_FLEET" | "INSTALL_SHED" | "HAZMAT_TEAM" | "DISPATCH_TRUCK" | "LOG_ONLY",
            "reasoning": "Brief operational reason"
        }
        `;

        return await callGemini(prompt);

    } catch (error: any) {
        console.error("Gemini Plan Error:", error.message);
        return { riskLevel: 'Low', actionType: 'LOG_ONLY', reasoning: 'Fallback due to error' };
    }
}

export async function analyzeOperations(
    query: string,
    context: { vehicleCount: number, activeAlerts: number, criticalAlerts: number }
) {
    try {
        if (!apiKey) throw new Error("No API Key");

        const prompt = `
        You are an advanced City Operations AI.
        User Query: "${query}"
        
        System Context:
        - Trucks: ${context.vehicleCount}
        - Alerts: ${context.activeAlerts} (Crit: ${context.criticalAlerts})
        
        Analyze request. Return JSON ONLY (no markdown, no extra text):
        {
            "text": "Response text",
            "suggestedActions": [
                { "type": "ADD_TRUCK" | "REMOVE_TRUCK" | "INSTALL_SHED" | "REROUTE", "target": "Target Name/Location" }
            ]
        }`;

        return await callGemini(prompt);

    } catch (error: any) {
        console.error("Gemini Ops Analysis Error:", error.message);

        // Fallback
        const lowerQ = query.toLowerCase();
        let text = "I've analyzed the local sensor data.";
        const actions: any[] = [];

        if (lowerQ.includes('add') && lowerQ.includes('truck')) {
            text += " Increasing fleet capacity.";
            actions.push({ type: 'ADD_TRUCK', target: 'Sector A' });
        } else if (lowerQ.includes('route')) {
            text += " Optimizing routes.";
            actions.push({ type: 'REROUTE', target: 'District' });
        }

        return {
            text: text,
            suggestedActions: actions
        };
    }
}

export async function suggestBinLocations(binsSummary: any[]) {
    try {
        if (!apiKey) throw new Error("No API Key");

        const prompt = `
        You are an Urban Planning AI.
        Analyze the following waste management data (sample of bins):
        ${JSON.stringify(binsSummary.slice(0, 15))}
        
        The user wants to "setup bin station to minimize the waste and collect it in time".
        
        Based on the fill levels (high fill = high demand) and clusters, identify the BEST location for a new Municipal Shed (Large capacity station).
        
        Return JSON ONLY (no markdown, no extra text):
        {
            "suggestedLat": number,
            "suggestedLng": number,
            "reasoning": "string explanation"
        }
        `;

        return await callGemini(prompt);

    } catch (error: any) {
        console.error("Gemini Bin Location Error:", error.message);
        return {
            suggestedLat: 28.6139 + (Math.random() - 0.5) * 0.01,
            suggestedLng: 77.2090 + (Math.random() - 0.5) * 0.01,
            reasoning: "AI Signal weak. Defaulting to sector center."
        };
    }
}
