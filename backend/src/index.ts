/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onCall} from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import {GoogleGenAI} from "@google/genai";
import Groq from "groq-sdk";
import * as admin from "firebase-admin";

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

// Helper function to fetch image and convert to base64
async function fetchImageAsBase64(imageUrl: string): Promise<{data: string; mimeType: string}> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.statusText}`);
    }
    
    const imageArrayBuffer = await response.arrayBuffer();
    const base64ImageData = Buffer.from(imageArrayBuffer).toString('base64');
    
    // Determine MIME type from response headers or infer from URL extension
    let contentType = response.headers.get('content-type');
    if (!contentType) {
      // Infer from file extension
      const urlLower = imageUrl.toLowerCase();
      if (urlLower.endsWith('.png')) contentType = 'image/png';
      else if (urlLower.endsWith('.gif')) contentType = 'image/gif';
      else if (urlLower.endsWith('.webp')) contentType = 'image/webp';
      else contentType = 'image/jpeg'; // Default fallback
    }
    
    return {
      data: base64ImageData,
      mimeType: contentType,
    };
  } catch (error: any) {
    logger.error("Error fetching image", { error: error.message, imageUrl });
    throw new Error(`Failed to fetch image: ${error.message}`);
  }
}

// Helper function to call the appropriate LLM
async function callLLM(model: string, systemPrompt: string, userPrompt: string, imageUrl?: string): Promise<string> {
  // Determine provider based on model name
  if (model.includes("gemini")) {
    // Use Gemini
    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const parts: any[] = [];
    
    // If image URL is provided, fetch and include the image
    if (imageUrl) {
      try {
        const imageData = await fetchImageAsBase64(imageUrl);
        parts.push({
          inlineData: {
            mimeType: imageData.mimeType,
            data: imageData.data,
          },
        });
        logger.info("Image included in Gemini request", { imageUrl, mimeType: imageData.mimeType });
      } catch (error: any) {
        logger.warn("Failed to include image, proceeding with text only", { error: error.message, imageUrl });
        // Continue without image if fetch fails
      }
    }
    
    // Add the text prompt
    parts.push({
      text: `${systemPrompt}\n\n${userPrompt}`,
    });

    const contents = [
      {
        role: "user",
        parts,
      },
    ];

    const result = await ai.models.generateContentStream({
      model,
      contents,
      config: {},
    });

    let fullResponse = "";
    for await (const chunk of result) {
      fullResponse += chunk.text;
    }
    return fullResponse;
  } else {
    // Use Groq for all other models (llama, mixtral, moonshot, etc.)
    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    // Models that support json_schema response format (Structured Outputs)
    const supportsJsonSchema = [
      "openai/gpt-oss-120b",
      "moonshotai/kimi-k2-instruct-0905",
      "meta-llama/llama-4-maverick-17b-128e-instruct",
    ];

    const requestConfig: any = {
      model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    };

    // Only add json_schema for supported models
    if (supportsJsonSchema.includes(model)) {
      requestConfig.response_format = {
        type: "json_schema",
        json_schema: {
          name: "evaluation_result",
          schema: {
            type: "object",
            properties: {
              verdict: {
                type: "string",
                enum: ["pass", "fail", "inconclusive"],
              },
              reasoning: { type: "string" },
            },
            required: ["verdict", "reasoning"],
            additionalProperties: false,
          },
        },
      };
    } else {
      // For models that don't support json_schema, use json_object
      requestConfig.response_format = { type: "json_object" };
    }

    const response = await groq.chat.completions.create(requestConfig);

    const content = response.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("No content in model response");
    }
    
    return content;
  }
}

export const geminiChat = onCall(async (request) => {
  try {
    const userInput = request.data.message;

    if (!userInput) {
      throw new Error("Missing 'message' parameter");
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    const tools = [{googleSearch: {}}];
    const config = {
      thinkingConfig: {
        thinkingBudget: -1,
      },
      tools,
    };

    const model = "gemini-2.5-flash";
    const contents = [
      {
        role: "user",
        parts: [
          {
            text: userInput,
          },
        ],
      },
    ];

    const result = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let fullResponse = "";
    for await (const chunk of result) {
      fullResponse += chunk.text;
    }

    logger.info("Gemini response generated", {structuredData: true});
    return {response: fullResponse};
  } catch (error) {
    logger.error("Error calling Gemini API", error);
    throw new Error("Failed to generate response");
  }
});

interface EvaluationRecord {
  submissionId: string;
  questionId: string;
  questionText: string;
  answer: string;
  answerReasoning: string;
  judgeId: string;
  judgeName: string;
  judgeModel: string;
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
  createdAt: admin.firestore.Timestamp;
}

export const refinePrompt = onCall(async (request) => {
  try {
    const { prompt } = request.data;

    if (!prompt || typeof prompt !== "string") {
      throw new Error("Missing or invalid 'prompt' parameter");
    }

    const groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });

    const systemPrompt = `You are an expert at creating precise, effective AI judge system prompts. Your specialty is transforming basic prompts into comprehensive evaluation rubrics that ensure accurate, consistent pass/fail/inconclusive verdicts. You focus on clarity, strictness, and unambiguous criteria.`;

    const userPrompt = `Transform the following AI judge prompt into a highly effective evaluation rubric. The refined prompt MUST:

1. **CRITICAL: Response Format Requirement**
   - Explicitly state that the response MUST be ONLY a JSON object
   - Format: {"verdict": "pass" or "fail" or "inconclusive", "reasoning": "explanation"}
   - Emphasize NO text outside the JSON object

2. **Clear Step-by-Step Evaluation Process**
   - Step 1: Analyze the question type and determine if it's within the judge's domain
   - Step 2: Evaluate the student's answer against specific criteria
   - Step 3: Determine verdict (pass/fail/inconclusive)
   - Step 4: Format response as JSON

3. **Strict Pass Criteria (ALL must be true)**
   - List specific conditions that ALL must be met for "pass"
   - Be explicit: "Pass if ALL of the following are true:"
   - Include concrete examples

4. **Strict Fail Criteria (ANY triggers fail)**
   - List specific conditions where ANY triggers "fail"
   - Be explicit: "Fail if ANY of the following are true:"
   - Include concrete examples
   - Emphasize: partial correctness = fail unless explicitly stated otherwise

5. **Clear Inconclusive Criteria**
   - Domain mismatch (question outside expertise)
   - Unclear or ambiguous question
   - Missing required information
   - Include concrete examples

6. **Few-Shot Examples**
   - Provide 2-3 examples showing:
     - A clear PASS case with reasoning
     - A clear FAIL case with reasoning
     - An INCONCLUSIVE case with reasoning
   - Each example should show the expected JSON format

7. **Critical Reminders Section**
   - Be strict: wrong = fail, not partial credit
   - Always check domain relevance first
   - Must respond in JSON format only
   - Verdict must be lowercase: "pass", "fail", or "inconclusive"

Original Prompt:
${prompt}

Create a refined prompt that is:
- Highly structured and easy to follow
- Unambiguous in its criteria
- Strict in evaluation (no leniency unless specified)
- Focused on producing accurate pass/fail/inconclusive verdicts
- Includes JSON format requirements prominently
- Provides concrete examples

The refined prompt should be comprehensive but focused on effective judging.`;

    const response = await groq.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.3, // Lower temperature for more focused, consistent output
      max_tokens: 600, // 
    });

    const refinedPrompt = response.choices?.[0]?.message?.content;
    if (!refinedPrompt) {
      throw new Error("No content in model response");
    }

    logger.info("Prompt refined successfully");
    return { refinedPrompt };
  } catch (error: any) {
    logger.error("Error refining prompt", error);
    throw new Error(`Failed to refine prompt: ${error?.message || "Unknown error"}`);
  }
});

export const runJudges = onCall(async (request) => {
  try {
    const {submissionIds, queueId} = request.data;

    const db = admin.firestore();

    // Fetch all submissions
    const submissionsSnapshot = await db.collection("submissions").get();
    let submissions = submissionsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter by submissionIds if provided
    if (submissionIds && Array.isArray(submissionIds) && submissionIds.length > 0) {
      submissions = submissions.filter((s: any) => submissionIds.includes(s.id));
    }

    // Filter by queueId if provided
    if (queueId) {
      submissions = submissions.filter((s: any) => s.queueId === queueId);
    }

    if (submissions.length === 0) {
      return {
        success: true,
        evaluatedCount: 0,
        results: [],
      };
    }

    // Fetch all judges
    const judgesSnapshot = await db.collection("judges").get();
    const judgesMap: Record<string, any> = {};
    judgesSnapshot.docs.forEach((doc) => {
      judgesMap[doc.id] = {
        id: doc.id,
        ...doc.data(),
      };
    });

    // Fetch all judge assignments
    const assignmentsSnapshot = await db.collection("judgeAssignments").get();
    const assignmentsMap: Record<string, any> = {};
    assignmentsSnapshot.docs.forEach((doc) => {
      assignmentsMap[doc.id] = doc.data();
    });

    let totalEvaluations = 0;
    const results: any[] = [];

    // Process each submission
    for (const submission of submissions) {
      const sub = submission as any;
      
      if (!sub.questions || !Array.isArray(sub.questions)) {
        logger.warn(`Submission ${sub.id} has no questions`);
        continue;
      }

      const submissionResult: any = {
        submissionId: sub.id,
        evaluations: [],
      };

      // Process each question in the submission
      for (const question of sub.questions) {
        const questionId = question.id;
        const questionText = question.questionText;
        const questionImageUrl = question.imageUrl; // Get image URL if available
        const answer = sub.answers?.[questionId];

        if (!answer) {
          logger.warn(`No answer for question ${questionId} in submission ${sub.id}`);
          continue;
        }

        // Get assigned judges for this question
        const assignmentKey = `${sub.queueId}_${questionId}`;
        const assignment = assignmentsMap[assignmentKey];
        const judgeIds = assignment?.judgeIds || [];

        if (judgeIds.length === 0) {
          logger.info(`No judges assigned for question ${questionId} in submission ${sub.id}`);
          continue;
        }

        const questionEvaluation: any = {
          questionId,
          questionText,
          answer: {
            choice: answer.choice,
            reasoning: answer.reasoning || "",
          },
          judgeResults: [],
        };

        // Evaluate with each assigned judge
        for (const judgeId of judgeIds) {
          const judge = judgesMap[judgeId];
          
          if (!judge) {
            logger.warn(`Judge ${judgeId} not found`);
            continue;
          }

          try {
            // Build the evaluation prompt
            const systemPrompt = `You are an AI judge evaluating answers.

${judge.systemPrompt}

IMPORTANT: If the question is not relevant to your area of expertise (e.g., you are a math judge but the question is about history), you MUST respond with verdict "inconclusive" and explain that the question is outside your domain.

Your task is to evaluate the answer and respond with ONLY a JSON object in this exact format:
{
  "verdict": "pass" or "fail" or "inconclusive",
  "reasoning": "brief explanation of your decision"
}`;

            // Build user prompt - include image reference if image exists
            let userPrompt = `Question: ${questionText}`;
            
            if (questionImageUrl) {
              userPrompt += `\n\nNote: This question includes an image. Please analyze the image along with the question and answer.`;
            }
            
            userPrompt += `\n\nStudent's Answer: ${answer.choice}
Student's Reasoning: ${answer.reasoning || "No reasoning provided"}

Evaluate this answer according to the rubrics and provide your verdict.`;

            // Call the appropriate LLM based on the judge's model
            // Pass imageUrl only for Gemini models (they support image ingestion)
            const fullResponse = await callLLM(
              judge.model, 
              systemPrompt, 
              userPrompt,
              judge.model.includes("gemini") ? questionImageUrl : undefined
            );

            // Log the LLM response
            logger.info(`[${judge.model}] Response for question ${questionId}:`, {
              judge: judge.name,
              model: judge.model,
              response: fullResponse,
            });

            // Parse the response
            let verdict: "pass" | "fail" | "inconclusive" = "inconclusive";
            let reasoning = "Unable to parse response";

            try {
              // Try to extract JSON from the response
              const jsonMatch = fullResponse.match(/\{[\s\S]*\}/);
              if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                const rawVerdict = parsed.verdict?.toLowerCase();
                
                // Normalize verdict to valid values
                if (rawVerdict === "pass") {
                  verdict = "pass";
                } else if (rawVerdict === "fail") {
                  verdict = "fail";
                } else {
                  verdict = "inconclusive";
                }
                
                reasoning = parsed.reasoning || fullResponse;
              } else {
                // Fallback: check for keywords in response
                const lowerResponse = fullResponse.toLowerCase();
                if (lowerResponse.includes('"verdict"')) {
                  // Looks like JSON but didn't match, log it
                  logger.warn("JSON-like response but failed to parse", { response: fullResponse });
                }
                
                if (lowerResponse.includes("pass") && !lowerResponse.includes("fail")) {
                  verdict = "pass";
                } else if (lowerResponse.includes("fail")) {
                  verdict = "fail";
                }
                reasoning = fullResponse;
              }
            } catch (parseError) {
              logger.warn("Failed to parse response", { 
                error: parseError, 
                response: fullResponse.substring(0, 200) 
              });
              reasoning = fullResponse;
            }

            // Store evaluation in Firestore
            const evaluation: EvaluationRecord = {
              submissionId: sub.id,
              questionId,
              questionText,
              answer: answer.choice,
              answerReasoning: answer.reasoning || "",
              judgeId: judge.id,
              judgeName: judge.name,
              judgeModel: judge.model || "gemini-2.5-flash",
              verdict,
              reasoning,
              createdAt: admin.firestore.Timestamp.now(),
            };

            await db.collection("evaluations").add(evaluation);
            totalEvaluations++;

            // Add to results
            questionEvaluation.judgeResults.push({
              judgeId: judge.id,
              judgeName: judge.name,
              model: judge.model,
              verdict: verdict.toUpperCase(),
              reasoning,
            });

            logger.info("Evaluation completed", {
              submissionId: sub.id,
              questionId,
              judgeId: judge.id,
              verdict,
            });
          } catch (error: any) {
            const errorMessage = error?.message || String(error);
            const errorDetails = error?.error?.error?.message || errorMessage;
            
            logger.error("Failed to evaluate", {
              submissionId: sub.id,
              questionId,
              judgeId,
              error: errorDetails,
            });
            
            // Add error to results with inconclusive verdict
            questionEvaluation.judgeResults.push({
              judgeId: judge.id,
              judgeName: judge.name,
              model: judge.model,
              verdict: "INCONCLUSIVE",
              reasoning: `Evaluation failed: ${errorDetails}`,
              error: errorDetails,
            });
          }
        }

        if (questionEvaluation.judgeResults.length > 0) {
          submissionResult.evaluations.push(questionEvaluation);
        }
      }

      if (submissionResult.evaluations.length > 0) {
        results.push(submissionResult);
      }
    }

    return {
      success: true,
      evaluatedCount: totalEvaluations,
      results,
    };
  } catch (error) {
    logger.error("Error running judges", error);
    throw new Error("Failed to run judges");
  }
});
