import { callGemini } from "./gemini";
import { callGroq } from "./groq";

export async function callLLM(
  model: string,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  console.log(`Calling LLM: ${model}`);
  console.log(`System Prompt: ${systemPrompt.substring(0, 100)}...`);
  console.log(`User Prompt: ${userPrompt.substring(0, 100)}...`);
  
  // Route to appropriate provider based on model
 if (model.startsWith("gemini-")) {
    return callGemini(model, systemPrompt, userPrompt);
  } else if (
    model.startsWith("llama") ||
    model.startsWith("mixtral")
  ) {
    return callGroq(model, systemPrompt, userPrompt);
  } else {
    throw new Error(`Unsupported model: ${model}`);
  }
}
