import { useEffect, useState } from "react";
import { Save, CheckCircle2 } from "lucide-react";
import { collection, onSnapshot, doc, setDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase.ts";
import { Submission, Judge, JudgeAssignment } from "../types";
import clsx from "clsx";

interface QueueQuestion {
  queueId: string;
  questionId: string;
  questionText: string;
  questionType: string;
  submissionIds: string[];
}

export const AssignmentsPage = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<Record<string, JudgeAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [selectedQueue, setSelectedQueue] = useState<string | null>(null);

  // Get unique queues and questions
  const getQueueQuestions = (): QueueQuestion[] => {
    const questionMap = new Map<string, QueueQuestion>();
    
    submissions.forEach((submission) => {
      if (!submission.queueId) return;
      
      submission.questions?.forEach((question) => {
        if (!question.id) return;
        const key = `${submission.queueId}_${question.id}`;
        if (!questionMap.has(key)) {
          questionMap.set(key, {
            queueId: submission.queueId,
            questionId: question.id,
            questionText: question.questionText || question.id,
            questionType: question.questionType || "unknown",
            submissionIds: [submission.id],
          });
        } else {
          // Add submission ID if not already present
          const existing = questionMap.get(key)!;
          if (!existing.submissionIds.includes(submission.id)) {
            existing.submissionIds.push(submission.id);
          }
        }
      });
    });
    
    return Array.from(questionMap.values());
  };

  const queueQuestions = getQueueQuestions();
  const uniqueQueues = Array.from(new Set(queueQuestions.map(q => q.queueId)));

  // Get questions for selected queue
  const questionsForQueue = selectedQueue
    ? queueQuestions.filter(q => q.queueId === selectedQueue)
    : [];

  // Fetch Submissions
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "submissions"),
      (snapshot) => {
        try {
          const data = snapshot.docs.map((doc) => {
            const docData = doc.data();
            return {
              id: doc.id,
              queueId: docData.queueId,
              labelingTaskId: docData.labelingTaskId,
              createdAt: docData.createdAt,
              answers: docData.answers || {},
              questions: docData.questions || [],
            } as Submission;
          });
          setSubmissions(data);
        } catch (err: any) {
          console.error("Error processing submissions:", err);
          setError(`Failed to load submissions: ${err.message}`);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
        setError(`Failed to load submissions: ${err.message}`);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Judges
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "judges"),
      (snapshot) => {
        try {
          const data = snapshot.docs.map((doc) => {
            const docData = doc.data();
            return {
              id: doc.id,
              name: docData.name || "Unnamed Judge",
              model: docData.model || "gemini-1.5-flash",
              systemPrompt: docData.systemPrompt || "",
              isActive: docData.isActive !== undefined ? docData.isActive : true,
            } as Judge;
          });
          setJudges(data.filter(j => j.isActive)); // Only show active judges
        } catch (err: any) {
          console.error("Error processing judges:", err);
          setError(`Failed to load judges: ${err.message}`);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
        setError(`Failed to load judges: ${err.message}`);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Assignments
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const assignmentsSnapshot = await getDocs(collection(db, "judgeAssignments"));
        const assignmentsMap: Record<string, JudgeAssignment> = {};
        
        assignmentsSnapshot.docs.forEach((doc) => {
          const data = doc.data();
          assignmentsMap[doc.id] = {
            id: doc.id,
            queueId: data.queueId,
            questionId: data.questionId,
            judgeIds: data.judgeIds || [],
            updatedAt: data.updatedAt || Date.now(),
          };
        });
        
        setAssignments(assignmentsMap);
        setLoading(false);
      } catch (err: any) {
        console.error("Error fetching assignments:", err);
        setError(`Failed to load assignments: ${err.message}`);
        setLoading(false);
      }
    };

    fetchAssignments();
  }, []);

  // Get assignment key
  const getAssignmentKey = (queueId: string, questionId: string) => {
    return `${queueId}_${questionId}`;
  };

  // Get assigned judges for a question
  const getAssignedJudges = (queueId: string, questionId: string): string[] => {
    const key = getAssignmentKey(queueId, questionId);
    return assignments[key]?.judgeIds || [];
  };

  // Toggle judge assignment
  const toggleJudge = (queueId: string, questionId: string, judgeId: string) => {
    const key = getAssignmentKey(queueId, questionId);
    const currentJudges = getAssignedJudges(queueId, questionId);
    
    const newJudges = currentJudges.includes(judgeId)
      ? currentJudges.filter(id => id !== judgeId)
      : [...currentJudges, judgeId];

    setAssignments({
      ...assignments,
      [key]: {
        id: key,
        queueId,
        questionId,
        judgeIds: newJudges,
        updatedAt: Date.now(),
      },
    });
  };

  // Save all assignments
  const saveAssignments = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(null);

    try {
      const updates = Object.values(assignments).map((assignment) => {
        const assignmentRef = doc(db, "judgeAssignments", assignment.id);
        return setDoc(assignmentRef, {
          queueId: assignment.queueId,
          questionId: assignment.questionId,
          judgeIds: assignment.judgeIds,
          updatedAt: Date.now(),
        }, { merge: true });
      });

      await Promise.all(updates);
      
      setSaveSuccess("Assignments saved successfully!");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      console.error("Error saving assignments:", err);
      setError(`Failed to save assignments: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  // Auto-select first queue if none selected
  useEffect(() => {
    if (!selectedQueue && uniqueQueues.length > 0) {
      setSelectedQueue(uniqueQueues[0]);
    }
  }, [uniqueQueues]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500">
        Loading assignments...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Judge Assignments</h1>
          <p className="text-sm text-slate-600 mt-1">
            Assign one or more judges to each question within a queue
          </p>
        </div>
        <button
          onClick={saveAssignments}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save size={18} />
          {saving ? "Saving..." : "Save Assignments"}
        </button>
      </div>

      {/* Success/Error Messages */}
      {saveSuccess && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
          <CheckCircle2 size={20} />
          <span>{saveSuccess}</span>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Queue Selector */}
      {uniqueQueues.length > 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Queue
          </label>
          <select
            value={selectedQueue || ""}
            onChange={(e) => setSelectedQueue(e.target.value)}
            className="w-full md:w-64 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          >
            {uniqueQueues.map((queueId) => (
              <option key={queueId} value={queueId}>
                {queueId}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          No queues found. Upload submissions first to create queues.
        </div>
      )}

      {/* Questions and Judge Selection */}
      {selectedQueue && questionsForQueue.length > 0 ? (
        <div className="space-y-6">
          {questionsForQueue.map((question) => {
            const assignedJudges = getAssignedJudges(question.queueId, question.questionId);
            return (
              <div
                key={`${question.queueId}_${question.questionId}`}
                className="bg-white rounded-lg border border-slate-200 p-6"
              >
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    {question.questionText}
                  </h3>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 mb-2">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded">
                      {question.questionId}
                    </span>
                    <span>Type: {question.questionType}</span>
                    <span className={clsx(
                      "px-2 py-1 rounded text-xs font-medium",
                      assignedJudges.length > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-slate-100 text-slate-500"
                    )}>
                      {assignedJudges.length} judge{assignedJudges.length !== 1 ? 's' : ''} assigned
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="text-xs font-medium text-slate-500 mr-2">Submissions:</span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {question.submissionIds.map((submissionId) => (
                        <span
                          key={submissionId}
                          className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200"
                        >
                          {submissionId}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Judge Selection */}
                {judges.length > 0 ? (
                  <div className="space-y-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Select Judges (hold Ctrl/Cmd to select multiple)
                    </label>
                    <select
                      multiple
                      value={assignedJudges}
                      onChange={(e) => {
                        const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                        const key = getAssignmentKey(question.queueId, question.questionId);
                        setAssignments({
                          ...assignments,
                          [key]: {
                            id: key,
                            queueId: question.queueId,
                            questionId: question.questionId,
                            judgeIds: selectedOptions,
                            updatedAt: Date.now(),
                          },
                        });
                      }}
                      className="w-full md:w-64 px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white min-h-[120px]"
                      size={Math.min(judges.length, 6)}
                    >
                      {judges.map((judge) => (
                        <option key={judge.id} value={judge.id}>
                          {judge.name} ({judge.model})
                        </option>
                      ))}
                    </select>
                    {assignedJudges.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {assignedJudges.map((judgeId) => {
                          const judge = judges.find(j => j.id === judgeId);
                          if (!judge) return null;
                          return (
                            <span
                              key={judgeId}
                              className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                            >
                              {judge.name}
                              <button
                                onClick={() => toggleJudge(question.queueId, question.questionId, judgeId)}
                                className="hover:text-blue-900 font-bold"
                                type="button"
                              >
                                ×
                              </button>
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-4 text-slate-500">
                    No active judges available. Create judges first.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : selectedQueue ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center text-slate-500">
          No questions found for this queue.
        </div>
      ) : null}
    </div>
  );
};

