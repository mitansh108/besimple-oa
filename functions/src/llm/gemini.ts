import { GoogleGenAI } from "@google/genai";

let ai: GoogleGenAI | null = null;

function getGeminiAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error(
        "GEMINI_API_KEY not configured. Add it to functions/.env file"
      );
    }
    
    ai = new GoogleGenAI({
      apiKey: apiKey,
    });
  }
  return ai;
}

export async function callGemini(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const ai = getGeminiAI();
    
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
    };

    // Build the full prompt with system instructions + user content
    const fullPrompt = `${systemPrompt}

${userPrompt}`;

    const contents = [
      {
        role: "user",
        parts: [
          {
            text: fullPrompt,
          },
        ],
      },
    ];

    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullText = "";
    for await (const chunk of response) {
      if (chunk.text) {
        fullText += chunk.text;
      }
    }
    
    console.log(`Gemini ${model} response:`, fullText.substring(0, 100) + "...");
    
    return fullText;
  } catch (error: any) {
    console.error("Gemini API error:", error);
    
    if (error.message?.includes("API key")) {
      throw new Error("Invalid Gemini API key. Get one from https://makersuite.google.com/app/apikey");
    }
    if (error.message?.includes("quota")) {
      throw new Error("Gemini API quota exceeded. Free tier: 60 requests/minute");
    }
    
    throw new Error(`Gemini API error: ${error.message}`);
  }
}
