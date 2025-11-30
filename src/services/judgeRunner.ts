import { httpsCallable } from "firebase/functions";
import { functions } from "../firebase";

export interface RunJudgesParams {
  submissionIds?: string[];
  queueId?: string;
}

export interface JudgeResult {
  judgeId: string;
  judgeName: string;
  model: string;
  verdict: "PASS" | "FAIL";
  reasoning: string;
  error?: string;
}

export interface QuestionEvaluation {
  questionId: string;
  questionText: string;
  answer: {
    choice: string;
    reasoning: string;
  };
  judgeResults: JudgeResult[];
}

export interface EvaluationResult {
  submissionId: string;
  evaluations: QuestionEvaluation[];
  error?: string;
}

export interface RunJudgesResponse {
  success: boolean;
  evaluatedCount: number;
  results: EvaluationResult[];
}

export async function runJudgesOnSubmissions(
  params: RunJudgesParams
): Promise<RunJudgesResponse> {
  const runJudges = httpsCallable<RunJudgesParams, RunJudgesResponse>(
    functions,
    "runJudges"
  );

  const result = await runJudges(params);
  return result.data;
}
