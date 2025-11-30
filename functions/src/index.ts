import { onCall, HttpsError } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import { callLLM } from "./llm/router.js";

admin.initializeApp();
const db = admin.firestore();

interface RunJudgesRequest {
  submissionIds?: string[];
  queueId?: string;
}

interface JudgeResult {
  judgeId: string;
  judgeName: string;
  model: string;
  verdict: "PASS" | "FAIL";
  reasoning: string;
  error?: string;
}

interface QuestionEvaluation {
  questionId: string;
  questionText: string;
  answer: {
    choice: string;
    reasoning: string;
  };
  judgeResults: JudgeResult[];
}

// Main function to run judges on submissions
export const runJudges = onCall(async (request) => {
  const { submissionIds, queueId } = request.data as RunJudgesRequest;

  try {
    // Get submissions to evaluate
    let submissions: any[] = [];
    
    if (submissionIds && submissionIds.length > 0) {
      // Get specific submissions
      const submissionPromises = submissionIds.map(id => 
        db.collection("submissions").doc(id).get()
      );
      const submissionDocs = await Promise.all(submissionPromises);
      submissions = submissionDocs
        .filter(doc => doc.exists)
        .map(doc => ({ id: doc.id, ...doc.data() }));
    } else if (queueId) {
      // Get all submissions for a queue
      const snapshot = await db.collection("submissions")
        .where("queueId", "==", queueId)
        .get();
      submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      // Get all submissions
      const snapshot = await db.collection("submissions").get();
      submissions = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }

    if (submissions.length === 0) {
      throw new HttpsError("not-found", "No submissions found");
    }

    // Process each submission
    const results = await Promise.all(
      submissions.map(submission => evaluateSubmission(submission))
    );

    return {
      success: true,
      evaluatedCount: results.length,
      results,
    };
  } catch (error: any) {
    console.error("Error running judges:", error);
    throw new HttpsError("internal", error.message || "Failed to run judges");
  }
});

// Evaluate a single submission
async function evaluateSubmission(submission: any) {
  const { id, queueId, questions, answers } = submission;

  if (!questions || questions.length === 0) {
    return {
      submissionId: id,
      error: "No questions found",
      evaluations: [],
    };
  }

  // Evaluate each question
  const evaluations: QuestionEvaluation[] = [];

  for (const question of questions) {
    const questionId = question.id;
    const answer = answers?.[questionId];

    if (!answer) {
      evaluations.push({
        questionId,
        questionText: question.questionText,
        answer: { choice: "", reasoning: "" },
        judgeResults: [],
      });
      continue;
    }

    // Get assigned judges for this question
    const assignmentKey = `${queueId}_${questionId}`;
    const assignmentDoc = await db.collection("judgeAssignments").doc(assignmentKey).get();
    const judgeIds = assignmentDoc.exists ? assignmentDoc.data()?.judgeIds || [] : [];

    if (judgeIds.length === 0) {
      evaluations.push({
        questionId,
        questionText: question.questionText,
        answer,
        judgeResults: [],
      });
      continue;
    }

    // Get judge details
    const judgePromises = judgeIds.map((judgeId: string) =>
      db.collection("judges").doc(judgeId).get()
    );
    const judgeDocs = await Promise.all(judgePromises);
    const judges = judgeDocs
      .filter(doc => doc.exists)
      .map(doc => ({ id: doc.id, ...doc.data() }));

    // Run each judge
    const judgeResults: JudgeResult[] = [];

    for (const judge of judges) {
      try {
        const result = await runSingleJudge(judge, question, answer);
        judgeResults.push(result);
      } catch (error: any) {
        console.error(`Error running judge ${judge.id}:`, error);
        judgeResults.push({
          judgeId: judge.id,
          judgeName: judge.name,
          model: judge.model,
          verdict: "FAIL",
          reasoning: "Error during evaluation",
          error: error.message,
        });
      }
    }

    evaluations.push({
      questionId,
      questionText: question.questionText,
      answer,
      judgeResults,
    });
  }

  // Save evaluation results
  await db.collection("evaluations").doc(id).set({
    submissionId: id,
    queueId,
    evaluations,
    evaluatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    submissionId: id,
    evaluations,
  };
}

// Run a single judge on a question/answer pair
async function runSingleJudge(judge: any, question: any, answer: any): Promise<JudgeResult> {
  const { id, name, model, systemPrompt } = judge;

  // Build the prompt
  const userPrompt = `
Question: ${question.questionText}

Student's Answer:
Choice: ${answer.choice}
Reasoning: ${answer.reasoning}

Please evaluate this answer and respond with:
1. Your verdict: PASS or FAIL
2. Your reasoning for this verdict

Format your response as:
VERDICT: [PASS or FAIL]
REASONING: [Your detailed reasoning]
`.trim();

  // Call the LLM
  const response = await callLLM(model, systemPrompt, userPrompt);

  // Parse the response
  const verdict = parseVerdict(response);
  const reasoning = parseReasoning(response);

  return {
    judgeId: id,
    judgeName: name,
    model,
    verdict,
    reasoning,
  };
}

// Parse verdict from LLM response
function parseVerdict(response: string): "PASS" | "FAIL" {
  const verdictMatch = response.match(/VERDICT:\s*(PASS|FAIL)/i);
  if (verdictMatch) {
    return verdictMatch[1].toUpperCase() as "PASS" | "FAIL";
  }

  // Fallback: check if response contains pass/fail
  const lowerResponse = response.toLowerCase();
  if (lowerResponse.includes("pass") && !lowerResponse.includes("fail")) {
    return "PASS";
  }
  return "FAIL";
}

// Parse reasoning from LLM response
function parseReasoning(response: string): string {
  const reasoningMatch = response.match(/REASONING:\s*(.+)/is);
  if (reasoningMatch) {
    return reasoningMatch[1].trim();
  }
  return response.trim();
}

// Optional: Auto-trigger evaluation when a new submission is created
export const onSubmissionCreated = onDocumentCreated(
  "submissions/{submissionId}",
  async (event) => {
    const submission = event.data?.data();
    const submissionId = event.params.submissionId;

    if (!submission) return;

    console.log(`New submission created: ${submissionId}`);
    // You can auto-trigger evaluation here if needed
    // await evaluateSubmission({ id: submissionId, ...submission });
  }
);
