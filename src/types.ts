// src/types.ts
export interface Judge {
    id: string;
    name: string;
    systemPrompt: string;
    model: string; // e.g., "gemini-1.5-flash", "llama3-70b-8192"
    isActive: boolean;
  }

export interface Answer {
  choice: string;
  reasoning: string;
  createdAt?: number;
  labelingTaskId?: string;
}

export interface Question {
  id: string;
  questionText: string;
  questionType: string;
  queueId?: string;
}

export interface Submission {
  id: string;
  queueId?: string;
  labelingTaskId?: string;
  createdAt?: number;
  answers: Record<string, Answer>; // Key is question ID (e.g., "q_template_1")
  questions: Question[];
}

// Input JSON format (from file upload)
export interface QuestionData {
  id: string;
  questionType: string;
  questionText: string;
}

export interface QuestionInput {
  rev: number;
  data: QuestionData;
}

export interface SubmissionInput {
  id: string;
  queueId: string;
  labelingTaskId: string;
  createdAt: number;
  questions: QuestionInput[];
  answers: Record<string, {
    choice: string;
    reasoning: string;
  }>;
}

// Judge Assignment types
export interface JudgeAssignment {
  id: string; // Document ID will be: `${queueId}_${questionId}`
  queueId: string;
  questionId: string;
  judgeIds: string[]; // Array of judge IDs assigned to this question
  updatedAt: number;
}