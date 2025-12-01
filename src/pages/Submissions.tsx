import { useEffect, useState, useRef } from "react";
import { Play, Upload, ChevronDown, ChevronUp, X, Loader2, Image as ImageIcon, Trash2 } from "lucide-react";
import { collection, onSnapshot, doc, writeBatch, setDoc, updateDoc, deleteField, deleteDoc } from "firebase/firestore";
import { db, storage } from "../firebase.ts";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage"; 
import { Submission, SubmissionInput, Judge, JudgeAssignment } from "../types";
import { runJudgesOnSubmissions } from "../services/judgeRunner";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const SubmissionsPage = () => {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [judges, setJudges] = useState<Judge[]>([]);
  const [assignments, setAssignments] = useState<Record<string, JudgeAssignment>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [selectedSubmissions, setSelectedSubmissions] = useState<Set<string>>(new Set());
  const [expandedSubmission, setExpandedSubmission] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [runSuccess, setRunSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingImages, setUploadingImages] = useState<Record<string, boolean>>({});
  const imageInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  // Fetch Submissions (Real-time)
  useEffect(() => {
    setLoading(true);
    setError(null);
    
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
          setLoading(false);
        } catch (err: any) {
          console.error("Error processing submissions data:", err);
          setError(`Failed to process submissions: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
        setError(`Failed to load submissions: ${err.message}`);
        setLoading(false);
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
              model: docData.model || "gemini-2.5-flash",
              systemPrompt: docData.systemPrompt || "",
              isActive: docData.isActive !== undefined ? docData.isActive : true,
            } as Judge;
          });
          setJudges(data);
        } catch (err: any) {
          console.error("Error processing judges:", err);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
      }
    );
    return () => unsub();
  }, []);

  // Fetch Assignments (Real-time)
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "judgeAssignments"),
      (snapshot) => {
        try {
          const assignmentsMap: Record<string, JudgeAssignment> = {};
          
          snapshot.docs.forEach((doc) => {
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
        } catch (err: any) {
          console.error("Error processing assignments:", err);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
      }
    );
    return () => unsub();
  }, []);

  // Transform input format to Firebase format
  const transformSubmissionInput = (input: SubmissionInput): Omit<Submission, 'id'> => {
    const questions = input.questions.map((q) => ({
      id: q.data.id,
      questionText: q.data.questionText,
      questionType: q.data.questionType,
      queueId: input.queueId,
    }));

    const answers: Record<string, any> = {};
    Object.entries(input.answers).forEach(([questionId, answer]) => {
      answers[questionId] = {
        choice: answer.choice,
        reasoning: answer.reasoning,
        createdAt: input.createdAt,
        labelingTaskId: input.labelingTaskId,
      };
    });

    return {
      queueId: input.queueId,
      labelingTaskId: input.labelingTaskId,
      createdAt: input.createdAt,
      answers,
      questions,
    };
  };

  // Handle file upload
  const handleFileUpload = async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setError("Only .json files are allowed");
      setTimeout(() => setError(null), 3000);
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError("File size must be less than 10MB");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setUploading(true);
    setError(null);
    setUploadSuccess(null);

    try {
      const text = await file.text();
      const jsonData: SubmissionInput[] = JSON.parse(text);
      
      if (!Array.isArray(jsonData)) {
        throw new Error("JSON file must contain an array of submissions");
      }

      if (jsonData.length === 0) {
        throw new Error("JSON file is empty");
      }

      const batch = writeBatch(db);
      let validCount = 0;
      let errorCount = 0;

      for (const input of jsonData) {
        try {
          if (!input.id) {
            console.warn("Skipping submission without id:", input);
            errorCount++;
            continue;
          }

          const transformed = transformSubmissionInput(input);
          const docRef = doc(db, "submissions", input.id);
          batch.set(docRef, transformed);
          validCount++;
        } catch (err: any) {
          console.error(`Error processing submission ${input.id}:`, err);
          errorCount++;
        }
      }

      if (validCount === 0) {
        throw new Error("No valid submissions found in file");
      }

      await batch.commit();
      
      setUploadSuccess(`Successfully imported ${validCount} submission${validCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} skipped)` : ''}`);
      setTimeout(() => setUploadSuccess(null), 5000);
    } catch (error: any) {
      console.error("Error uploading file:", error);
      setError(`Failed to upload file: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const formatTimestamp = (timestamp?: number) => {
    if (!timestamp) return "Not set";
    try {
      return new Date(timestamp).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }).replace(/(\d+)\/(\d+)\/(\d+), (\d+):(\d+):(\d+)/, '$3-$1-$2 $4:$5:$6');
    } catch {
      return "Invalid date";
    }
  };

  // Get assignment key
  const getAssignmentKey = (queueId: string, questionId: string) => {
    return `${queueId}_${questionId}`;
  };

  // Toggle judge assignment (remove judge)
  const toggleJudge = async (queueId: string, questionId: string, judgeId: string) => {
    const key = getAssignmentKey(queueId, questionId);
    const currentAssignment = assignments[key];
    const currentJudges = currentAssignment?.judgeIds || [];
    
    const newJudges = currentJudges.filter(id => id !== judgeId);

    // Update local state
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

    // Auto-save to Firebase
    await saveAssignment(queueId, questionId, newJudges);
  };

  // Save assignment for a specific question (auto-save)
  const saveAssignment = async (queueId: string, questionId: string, judgeIds: string[]) => {
    if (!queueId || !questionId) return;

    const key = getAssignmentKey(queueId, questionId);

    try {
      const assignmentRef = doc(db, "judgeAssignments", key);
      await setDoc(assignmentRef, {
        queueId,
        questionId,
        judgeIds,
        updatedAt: Date.now(),
      }, { merge: true });
    } catch (err: any) {
      console.error("Error saving assignment:", err);
      setError(`Failed to save assignment: ${err.message}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedSubmissions);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedSubmissions(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedSubmissions.size === submissions.length) {
      setSelectedSubmissions(new Set());
    } else {
      setSelectedSubmissions(new Set(submissions.map(s => s.id)));
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedSubmission(expandedSubmission === id ? null : id);
  };

  const handleDeleteSubmission = async (submissionId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    
    const submission = submissions.find(s => s.id === submissionId);
    const submissionName = submission?.id || "this submission";
    
    if (!confirm(`Are you sure you want to delete "${submissionName}"? This action cannot be undone and will also delete all associated evaluations.`)) {
      return;
    }

    setError(null);
    try {
      await deleteDoc(doc(db, "submissions", submissionId));
      console.log("Submission deleted:", submissionId);
      
      // Remove from selected submissions if it was selected
      if (selectedSubmissions.has(submissionId)) {
        const newSelection = new Set(selectedSubmissions);
        newSelection.delete(submissionId);
        setSelectedSubmissions(newSelection);
      }
      
      // Close expanded view if this submission was expanded
      if (expandedSubmission === submissionId) {
        setExpandedSubmission(null);
      }
    } catch (error: any) {
      console.error("Error deleting submission:", error);
      setError(`Failed to delete submission: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedSubmissions.size === 0) {
      setError("No submissions selected");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const count = selectedSubmissions.size;
    if (!confirm(`Are you sure you want to delete ${count} submission${count !== 1 ? 's' : ''}? This action cannot be undone and will also delete all associated evaluations.`)) {
      return;
    }

    setError(null);
    try {
      const batch = writeBatch(db);
      const submissionIds = Array.from(selectedSubmissions);
      
      submissionIds.forEach(submissionId => {
        const submissionRef = doc(db, "submissions", submissionId);
        batch.delete(submissionRef);
      });

      await batch.commit();
      console.log(`Deleted ${count} submission(s)`);
      
      setSelectedSubmissions(new Set());
      if (expandedSubmission && submissionIds.includes(expandedSubmission)) {
        setExpandedSubmission(null);
      }
    } catch (error: any) {
      console.error("Error deleting submissions:", error);
      setError(`Failed to delete submissions: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleImageUpload = async (submissionId: string, questionId: string, file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError("Please upload an image file");
      setTimeout(() => setError(null), 3000);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("Image size must be less than 10MB");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const uploadKey = `${submissionId}_${questionId}`;
    setUploadingImages(prev => ({ ...prev, [uploadKey]: true }));
    setError(null);

    try {
      // Create a unique filename
      const timestamp = Date.now();
      const fileName = `${submissionId}_${questionId}_${timestamp}_${file.name}`;
      const storageRef = ref(storage, `question-images/${fileName}`);

      // Upload the file
      await uploadBytes(storageRef, file);

      // Get the download URL
      const downloadURL = await getDownloadURL(storageRef);

      // Update the submission in Firestore
      const submissionRef = doc(db, "submissions", submissionId);
      const submission = submissions.find(s => s.id === submissionId);
      
      if (submission) {
        // Update the question with the image URL
        const updatedQuestions = submission.questions.map(q => 
          q.id === questionId ? { ...q, imageUrl: downloadURL } : q
        );

        await updateDoc(submissionRef, {
          questions: updatedQuestions
        });

        // Update local state
        setSubmissions(prev => prev.map(s => 
          s.id === submissionId 
            ? { ...s, questions: updatedQuestions }
            : s
        ));
      }
    } catch (error: any) {
      console.error("Error uploading image:", error);
      setError(`Failed to upload image: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setUploadingImages(prev => ({ ...prev, [uploadKey]: false }));
    }
  };

  const handleImageInputChange = (submissionId: string, questionId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(submissionId, questionId, file);
    }
    // Reset input so the same file can be selected again
    if (e.target) {
      e.target.value = '';
    }
  };

  const handleRunJudges = async () => {
    if (submissions.length === 0) {
      setError("No submissions to evaluate");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setIsRunning(true);
    setError(null);
    setRunSuccess(null);

    try {
      const submissionIds = selectedSubmissions.size > 0 
        ? Array.from(selectedSubmissions)
        : undefined;

      console.log("🚀 Starting AI Judge evaluation...");
      console.log("📋 Submissions to evaluate:", submissionIds || "All submissions");

      const result = await runJudgesOnSubmissions({ submissionIds });
      
      console.log("✅ Evaluation complete!");
      console.log("📊 Results:", result);
      
      setRunSuccess(
        `Successfully evaluated ${result.evaluatedCount} submission${result.evaluatedCount !== 1 ? 's' : ''}!`
      );
      setTimeout(() => setRunSuccess(null), 5000);
      setSelectedSubmissions(new Set());
    } catch (error: any) {
      console.error("❌ Error running judges:", error);
      setError(`Failed to run judges: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-orange-50/30 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Submission Evaluation</h1>
          {selectedSubmissions.size > 0 && (
            <p className="text-sm text-slate-600 mt-1">
              {selectedSubmissions.size} submission{selectedSubmissions.size !== 1 ? 's' : ''} selected
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {selectedSubmissions.size > 0 && (
            <button
              onClick={handleDeleteSelected}
              className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-md"
            >
              <Trash2 size={18} />
              Delete {selectedSubmissions.size} Selected
            </button>
          )}
          <button
            onClick={handleRunJudges}
            disabled={isRunning || submissions.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunning ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Running Judges...
              </>
            ) : (
              <>
                <Play size={18} />
                {selectedSubmissions.size > 0 
                  ? `Run Judges on ${selectedSubmissions.size} Selected`
                  : "Run AI Judges on All Submissions"
                }
              </>
            )}
          </button>
        </div>
      </div>

      {/* Upload Test Submissions Section */}
      <div className="mb-8">
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            "border-2 border-dashed rounded-lg p-12 text-center transition-colors",
            isDragging
              ? "border-orange-500 bg-orange-50"
              : "border-slate-300 bg-white hover:border-slate-400"
          )}
        >
          <div className="flex flex-col items-center gap-4">
            <Upload size={48} className="text-slate-400" />
            <div>
              <p className="text-lg font-medium text-slate-700 mb-1">
                Drag & drop your test_input.json file here
              </p>
              <p className="text-sm text-slate-500">
                .json files only, up to 10MB
              </p>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-6 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg font-medium transition-colors"
            >
              Browse files
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileInputChange}
              disabled={uploading}
              className="hidden"
            />
          </div>
        </div>
        {uploadSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {uploadSuccess}
          </div>
        )}
        {runSuccess && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
            {runSuccess}
          </div>
        )}
        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}
      </div>

      {/* Ingested Submissions Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Ingested Submissions</h2>
        </div>
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Loading submissions from Firebase...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-600">
            {error}
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No submissions found. Upload a JSON file to get started.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedSubmissions.size === submissions.length && submissions.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    SUBMISSION ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    QUEUE ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    CREATED AT
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    QUESTIONS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    ACTIONS
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {submissions.map((submission) => {
                  const isExpanded = expandedSubmission === submission.id;
                  return (
                    <>
                      <tr
                        key={submission.id}
                        className={clsx(
                          "hover:bg-slate-50 transition-colors cursor-pointer",
                          isExpanded && "bg-orange-50"
                        )}
                        onClick={() => toggleExpand(submission.id)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedSubmissions.has(submission.id)}
                            onChange={() => toggleSelection(submission.id)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-sm text-slate-900">{submission.id}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{submission.queueId || "—"}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{formatTimestamp(submission.createdAt)}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-slate-700">{submission.questions?.length || 0}</span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDeleteSubmission(submission.id, e)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            type="button"
                            title="Delete submission"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          {isExpanded ? (
                            <ChevronUp size={20} className="text-slate-600" />
                          ) : (
                            <ChevronDown size={20} className="text-slate-600" />
                          )}
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr>
                          <td colSpan={7} className="px-6 py-6 bg-slate-50">
                            <div>
                              <h3 className="text-xl font-semibold text-slate-900 mb-6">
                                Submission Details: <span className="font-mono">{submission.id}</span>
                              </h3>
                              {submission.questions && submission.questions.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {submission.questions.map((question, index) => {
                                    const answer = question.id ? submission.answers?.[question.id] : null;
                                    // Get assigned judges for this question
                                    const assignmentKey = submission.queueId && question.id 
                                      ? `${submission.queueId}_${question.id}` 
                                      : null;
                                    const assignment = assignmentKey ? assignments[assignmentKey] : null;
                                    const assignedJudges = assignment?.judgeIds || [];
                                    const assignedJudgeNames = assignedJudges
                                      .map(judgeId => judges.find(j => j.id === judgeId))
                                      .filter(Boolean) as Judge[];
                                    
                                    return (
                                      <div
                                        key={question.id || index}
                                        className="bg-white rounded-lg border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow"
                                      >
                                        <h4 className="text-sm font-medium text-slate-500 mb-3">
                                          Question {index + 1}
                                        </h4>
                                        <p className="text-base text-slate-900 leading-relaxed mb-4">
                                          {question.questionText || "No question text available"}
                                        </p>
                                        {question.questionType && (
                                          <p className="text-xs text-slate-400 mb-4">
                                            Type: {question.questionType}
                                          </p>
                                        )}

                                        {/* Image Upload Section */}
                                        <div className="mb-4 pt-4 border-t border-slate-200">
                                          <h5 className="text-sm font-medium text-slate-700 mb-2">
                                            Upload an image?
                                          </h5>
                                          
                                          {question.imageUrl ? (
                                            <div className="space-y-2">
                                              <div className="relative inline-block">
                                                <img 
                                                  src={question.imageUrl} 
                                                  alt="Question image" 
                                                  className="max-w-full h-auto max-h-64 rounded-lg border border-slate-200 shadow-sm"
                                                />
                                                <button
                                                  onClick={async () => {
                                                    // Remove image URL from question
                                                    const submissionRef = doc(db, "submissions", submission.id);
                                                    const updatedQuestions = submission.questions.map(q => {
                                                      if (q.id === question.id) {
                                                        const { imageUrl, ...rest } = q;
                                                        return rest;
                                                      }
                                                      return q;
                                                    });
                                                    await updateDoc(submissionRef, {
                                                      questions: updatedQuestions
                                                    });
                                                    setSubmissions(prev => prev.map(s => 
                                                      s.id === submission.id 
                                                        ? { ...s, questions: updatedQuestions }
                                                        : s
                                                    ));
                                                  }}
                                                  className="absolute top-2 right-2 p-1 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-lg"
                                                  type="button"
                                                  title="Remove image"
                                                >
                                                  <X size={14} />
                                                </button>
                                              </div>
                                              <button
                                                onClick={() => imageInputRefs.current[`${submission.id}_${question.id}`]?.click()}
                                                className="text-xs text-slate-600 hover:text-slate-900 underline"
                                                type="button"
                                              >
                                                Replace image
                                              </button>
                                            </div>
                                          ) : (
                                            <div>
                                              {(() => {
                                                const assignmentKey = submission.queueId && question.id 
                                                  ? `${submission.queueId}_${question.id}` 
                                                  : null;
                                                const assignment = assignmentKey ? assignments[assignmentKey] : null;
                                                const judgeIds = assignment?.judgeIds || [];
                                                const assignedJudges = judgeIds
                                                  .map(id => judges.find(j => j.id === id))
                                                  .filter(Boolean) as Judge[];
                                                
                                                const hasGeminiJudge = assignedJudges.some(j => j.model.includes("gemini"));
                                                const allJudgesNonGemini = judgeIds.length > 0 && !hasGeminiJudge;
                                                
                                                return (
                                                  <>
                                                    <button
                                                      onClick={() => {
                                                        if (!allJudgesNonGemini) {
                                                          imageInputRefs.current[`${submission.id}_${question.id}`]?.click();
                                                        }
                                                      }}
                                                      disabled={uploadingImages[`${submission.id}_${question.id}`] || allJudgesNonGemini}
                                                      className={clsx(
                                                        "flex items-center gap-2 px-4 py-2 text-sm rounded-lg border transition-colors",
                                                        allJudgesNonGemini
                                                          ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60"
                                                          : "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300"
                                                      )}
                                                      type="button"
                                                      title={allJudgesNonGemini ? "Images are only supported by Gemini judges. Please assign a Gemini judge (e.g., Gemini 2.5 Flash) to enable image upload." : "Upload an image for this question"}
                                                    >
                                                      {uploadingImages[`${submission.id}_${question.id}`] ? (
                                                        <>
                                                          <Loader2 size={16} className="animate-spin" />
                                                          <span>Uploading...</span>
                                                        </>
                                                      ) : (
                                                        <>
                                                          <ImageIcon size={16} />
                                                          <span>Upload Image</span>
                                                        </>
                                                      )}
                                                    </button>
                                                    <input
                                                      ref={(el) => {
                                                        imageInputRefs.current[`${submission.id}_${question.id}`] = el;
                                                      }}
                                                      type="file"
                                                      accept="image/*"
                                                      onChange={(e) => handleImageInputChange(submission.id, question.id!, e)}
                                                      className="hidden"
                                                    />
                                                  </>
                                                );
                                              })()}
                                            </div>
                                          )}
                                        </div>

                                        {/* Assigned Judges Section */}
                                        {submission.queueId && question.id && (
                                          <div className="mb-4 pt-4 border-t border-slate-200">
                                            <h5 className="text-sm font-medium text-slate-700 mb-2">
                                              Assigned Judges ({assignedJudgeNames.length})
                                            </h5>
                                            
                                            {/* Judge Selection Dropdown */}
                                            {judges.length > 0 && (
                                              <div className="mb-3">
                                                <Popover modal={false}>
                                                  <PopoverTrigger asChild>
                                                    <button
                                                      type="button"
                                                      className="w-full md:w-64 px-4 py-2 text-left rounded-md border border-slate-300 bg-white text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex items-center justify-between"
                                                    >
                                                      <span className="text-slate-700">
                                                        {assignedJudges.length > 0 
                                                          ? `${assignedJudges.length} judge${assignedJudges.length !== 1 ? 's' : ''} selected`
                                                          : 'Select Judges'
                                                        }
                                                      </span>
                                                      <ChevronDown className="h-4 w-4 text-slate-500" />
                                                    </button>
                                                  </PopoverTrigger>
                                                  <PopoverContent 
                                                    className="w-64 p-0 bg-white border border-slate-200 shadow-lg" 
                                                    align="start"
                                                    onInteractOutside={(e) => {
                                                      // Allow clicking checkboxes without closing
                                                      const target = e.target as HTMLElement;
                                                      if (target.closest('input[type="checkbox"]') || target.closest('label')) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                  >
                                                    <div className="p-2 bg-white">
                                                      <div className="max-h-[300px] overflow-y-auto">
                                                        {judges.map((judge) => {
                                                          const isChecked = assignedJudges.includes(judge.id);
                                                          return (
                                                            <label
                                                              key={judge.id}
                                                              className={clsx(
                                                                "flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors",
                                                                isChecked ? "bg-orange-50" : "hover:bg-slate-50"
                                                              )}
                                                              onMouseDown={(e) => e.preventDefault()}
                                                            >
                                                              <input
                                                                type="checkbox"
                                                                checked={isChecked}
                                                                onChange={async (e) => {
                                                                  e.stopPropagation();
                                                                  const checked = e.target.checked;
                                                                  const key = getAssignmentKey(submission.queueId!, question.id!);
                                                                  const newJudges = checked
                                                                    ? [...assignedJudges, judge.id]
                                                                    : assignedJudges.filter(id => id !== judge.id);
                                                                  
                                                                  // Update local state
                                                                  setAssignments({
                                                                    ...assignments,
                                                                    [key]: {
                                                                      id: key,
                                                                      queueId: submission.queueId!,
                                                                      questionId: question.id!,
                                                                      judgeIds: newJudges,
                                                                      updatedAt: Date.now(),
                                                                    },
                                                                  });
                                                                  
                                                                  // Auto-save to Firebase
                                                                  await saveAssignment(submission.queueId!, question.id!, newJudges);
                                                                }}
                                                                className="w-4 h-4 rounded border-2 border-slate-300 text-orange-600 focus:ring-2 focus:ring-orange-500 focus:ring-offset-0 cursor-pointer"
                                                              />
                                                              <span className="text-sm text-slate-900 flex-1">
                                                                {judge.name} <span className="text-slate-500">({judge.model})</span>
                                                              </span>
                                                            </label>
                                                          );
                                                        })}
                                                      </div>
                                                    </div>
                                                  </PopoverContent>
                                                </Popover>
                                              </div>
                                            )}

                                            {/* Selected Judges Display */}
                                            {assignedJudgeNames.length > 0 && (
                                              <div className="flex flex-wrap gap-2">
                                                {assignedJudgeNames.map((judge) => (
                                                  <span
                                                    key={judge.id}
                                                    className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                                                  >
                                                    {judge.name}
                                                    <button
                                                      onClick={() => toggleJudge(submission.queueId!, question.id!, judge.id)}
                                                      className="hover:text-purple-900 font-bold"
                                                      type="button"
                                                      title="Remove judge"
                                                    >
                                                      <X size={12} />
                                                    </button>
                                                  </span>
                                                ))}
                                              </div>
                                            )}
                                            {assignedJudgeNames.length === 0 && (
                                              <p className="text-xs text-slate-400 italic">
                                                No judges assigned. Select a judge from the dropdown above.
                                              </p>
                                            )}
                                          </div>
                                        )}
                                        
                                        {/* Answer Section */}
                                        {answer ? (
                                          <div className="mt-4 pt-4 border-t border-slate-200">
                                            <h5 className="text-sm font-medium text-slate-700 mb-2">Answer</h5>
                                            {answer.choice && (
                                              <div className="mb-3">
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Choice:</span>
                                                <p className="text-sm text-slate-900 mt-1 font-medium">
                                                  {answer.choice}
                                                </p>
                                              </div>
                                            )}
                                            {answer.reasoning && (
                                              <div>
                                                <span className="text-xs font-medium text-slate-500 uppercase tracking-wide">Reasoning:</span>
                                                <p className="text-sm text-slate-700 mt-1 leading-relaxed">
                                                  {answer.reasoning}
                                                </p>
                                              </div>
                                            )}
                                            {answer.labelingTaskId && (
                                              <p className="text-xs text-slate-400 mt-3">
                                                Task ID: <span className="font-mono">{answer.labelingTaskId}</span>
                                              </p>
                                            )}
                                          </div>
                                        ) : (
                                          <div className="mt-4 pt-4 border-t border-slate-200">
                                            <p className="text-sm text-slate-400 italic">No answer provided for this question.</p>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <div className="text-center py-8 text-slate-500">
                                  No questions available for this submission.
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                 );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
