import Groq from "groq-sdk";

let groq: Groq | null = null;

function getGroq() {
  if (!groq) {
    const apiKey = process.env.GROQ_API_KEY;
    
    if (!apiKey) {
      throw new Error("GROQ_API_KEY not configured. Add it to functions/.env file");
    }
    
    groq = new Groq({ apiKey });
  }
  return groq;
}

export async function callGroq(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  try {
    const groq = getGroq();
    
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    });

    return completion.choices[0]?.message?.content || "No response";
  } catch (error: any) {
    console.error("Groq API error:", error);
    throw new Error(`Groq API error: ${error.message}`);
  }
}
