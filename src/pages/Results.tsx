import { useEffect, useState } from "react";
import { collection, onSnapshot, query, orderBy, doc, deleteDoc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";
import { CheckCircle, XCircle, HelpCircle, Filter, ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface Evaluation {
  id: string;
  submissionId: string;
  questionId: string;
  questionText: string;
  answer: string;
  answerReasoning: string;
  judgeId: string;
  judgeName: string;
  judgeModel?: string;
  verdict: "pass" | "fail" | "inconclusive";
  reasoning: string;
  createdAt: any;
}

export const ResultsPage = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [selectedEvaluations, setSelectedEvaluations] = useState<Set<string>>(new Set());

  const getModelLogo = (model?: string) => {
    if (!model) return null;
    if (model.includes("gemini")) return "/logos/Google_Gemini_icon_2025.svg";
    if (model.includes("gpt-oss")) return "/logos/OpenAI_logo_2025_(symbol).svg";
    if (model.includes("groq")) return "/logos/groq-icon-seeklogo.svg";
    if (model.includes("llama")) return "/logos/Meta_Platforms_logo.svg";
    if (model.includes("moonshot") || model.includes("kimi")) return "/logos/129152888.jpeg";
    if (model.includes("qwen")) return "/logos/qwen-color.svg";
    return null;
  };
  
  // Filters
  const [selectedJudges, setSelectedJudges] = useState<Set<string>>(new Set());
  const [selectedQuestions, setSelectedQuestions] = useState<Set<string>>(new Set());
  const [selectedVerdicts, setSelectedVerdicts] = useState<Set<string>>(new Set());

  // Fetch Evaluations (Real-time)
  useEffect(() => {
    setLoading(true);
    setError(null);
    
    const q = query(collection(db, "evaluations"), orderBy("createdAt", "desc"));
    
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        try {
          const data = snapshot.docs.map((doc) => {
            const docData = doc.data();
            return {
              id: doc.id,
              submissionId: docData.submissionId,
              questionId: docData.questionId,
              questionText: docData.questionText,
              answer: docData.answer,
              answerReasoning: docData.answerReasoning || "",
              judgeId: docData.judgeId,
              judgeName: docData.judgeName,
              judgeModel: docData.judgeModel,
              verdict: docData.verdict,
              reasoning: docData.reasoning,
              createdAt: docData.createdAt,
            } as Evaluation;
          });
          setEvaluations(data);
          setLoading(false);
        } catch (err: any) {
          console.error("Error processing evaluations:", err);
          setError(`Failed to process evaluations: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
        setError(`Failed to load evaluations: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Get unique values for filters
  const uniqueJudges = Array.from(new Set(evaluations.map(e => e.judgeName))).sort();
  const uniqueQuestions = Array.from(new Set(evaluations.map(e => e.questionText))).sort();

  // Apply filters
  const filteredEvaluations = evaluations.filter((evaluation) => {
    if (selectedJudges.size > 0 && !selectedJudges.has(evaluation.judgeName)) {
      return false;
    }
    if (selectedQuestions.size > 0 && !selectedQuestions.has(evaluation.questionText)) {
      return false;
    }
    if (selectedVerdicts.size > 0 && !selectedVerdicts.has(evaluation.verdict)) {
      return false;
    }
    return true;
  });

  // Calculate pass rate
  const passCount = filteredEvaluations.filter(e => e.verdict === "pass").length;
  const totalCount = filteredEvaluations.length;
  const passRate = totalCount > 0 ? ((passCount / totalCount) * 100).toFixed(1) : "0.0";

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "Not set";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      const month = date.toLocaleString('en-US', { month: 'short' });
      const day = date.getDate();
      const time = date.toLocaleString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
      return `${month} ${day}, ${time}`;
    } catch {
      return "Invalid date";
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "pass":
        return <CheckCircle className="text-green-600" size={20} />;
      case "fail":
        return <XCircle className="text-red-600" size={20} />;
      default:
        return <HelpCircle className="text-yellow-600" size={20} />;
    }
  };

  const getVerdictBadge = (verdict: string) => {
    switch (verdict) {
      case "pass":
        return "bg-green-100 text-green-700 border-green-200";
      case "fail":
        return "bg-red-100 text-red-700 border-red-200";
      default:
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
    }
  };

  const toggleFilter = (set: Set<string>, value: string, setter: (s: Set<string>) => void) => {
    const newSet = new Set(set);
    if (newSet.has(value)) {
      newSet.delete(value);
    } else {
      newSet.add(value);
    }
    setter(newSet);
  };

  const toggleRow = (id: string) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedRows(newExpanded);
  };

  const toggleSelection = (id: string) => {
    const newSelection = new Set(selectedEvaluations);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedEvaluations(newSelection);
  };

  const toggleSelectAll = () => {
    if (selectedEvaluations.size === filteredEvaluations.length && filteredEvaluations.length > 0) {
      setSelectedEvaluations(new Set());
    } else {
      setSelectedEvaluations(new Set(filteredEvaluations.map(e => e.id)));
    }
  };

  const handleDeleteEvaluation = async (evaluationId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    
    const evaluation = evaluations.find(e => e.id === evaluationId);
    const evaluationName = evaluation ? `${evaluation.judgeName} - ${evaluation.verdict}` : "this evaluation";
    
    if (!confirm(`Are you sure you want to delete "${evaluationName}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await deleteDoc(doc(db, "evaluations", evaluationId));
      console.log("Evaluation deleted:", evaluationId);
      
      // Remove from selected evaluations if it was selected
      if (selectedEvaluations.has(evaluationId)) {
        const newSelection = new Set(selectedEvaluations);
        newSelection.delete(evaluationId);
        setSelectedEvaluations(newSelection);
      }
      
      // Remove from expanded rows if it was expanded
      if (expandedRows.has(evaluationId)) {
        const newExpanded = new Set(expandedRows);
        newExpanded.delete(evaluationId);
        setExpandedRows(newExpanded);
      }
    } catch (error: any) {
      console.error("Error deleting evaluation:", error);
      setError(`Failed to delete evaluation: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteSelected = async () => {
    if (selectedEvaluations.size === 0) {
      setError("No evaluations selected");
      setTimeout(() => setError(null), 3000);
      return;
    }

    const count = selectedEvaluations.size;
    if (!confirm(`Are you sure you want to delete ${count} evaluation${count !== 1 ? 's' : ''}? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      const batch = writeBatch(db);
      const evaluationIds = Array.from(selectedEvaluations);
      
      evaluationIds.forEach(evaluationId => {
        const evaluationRef = doc(db, "evaluations", evaluationId);
        batch.delete(evaluationRef);
      });

      await batch.commit();
      console.log(`Deleted ${count} evaluation(s)`);
      
      setSelectedEvaluations(new Set());
      
      // Remove deleted evaluations from expanded rows
      const newExpanded = new Set(expandedRows);
      evaluationIds.forEach(id => newExpanded.delete(id));
      setExpandedRows(newExpanded);
    } catch (error: any) {
      console.error("Error deleting evaluations:", error);
      setError(`Failed to delete evaluations: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Evaluation Results</h1>
          <p className="text-sm text-slate-600 mt-1">
            View and filter AI judge evaluations
            {selectedEvaluations.size > 0 && (
              <span className="ml-2 text-orange-600 font-medium">
                ({selectedEvaluations.size} selected)
              </span>
            )}
          </p>
        </div>
        {selectedEvaluations.size > 0 && (
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-colors shadow-md"
          >
            <Trash2 size={18} />
            Delete {selectedEvaluations.size} Selected
          </button>
        )}
      </div>

      {/* Pass Rate Card */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium opacity-90">Overall Pass Rate</h2>
            <p className="text-4xl font-bold mt-2">{passRate}%</p>
            <p className="text-sm opacity-90 mt-1">
              {passCount} pass of {totalCount} evaluation{totalCount !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm opacity-90">Breakdown</div>
            <div className="mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <CheckCircle size={16} />
                <span>{filteredEvaluations.filter(e => e.verdict === "pass").length} Pass</span>
              </div>
              <div className="flex items-center gap-2">
                <XCircle size={16} />
                <span>{filteredEvaluations.filter(e => e.verdict === "fail").length} Fail</span>
              </div>
              <div className="flex items-center gap-2">
                <HelpCircle size={16} />
                <span>{filteredEvaluations.filter(e => e.verdict === "inconclusive").length} Inconclusive</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-slate-200 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={18} className="text-slate-600" />
          <h3 className="font-semibold text-slate-900">Filters</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {/* Judge Filter */}
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Judge {selectedJudges.size > 0 && `(${selectedJudges.size})`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-2 bg-white border border-slate-200 shadow-lg">
              <div className="max-h-[300px] overflow-y-auto">
                {uniqueJudges.map((judge) => (
                  <label
                    key={judge}
                    className={clsx(
                      "flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors",
                      selectedJudges.has(judge) ? "bg-orange-50" : "hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedJudges.has(judge)}
                      onChange={() => toggleFilter(selectedJudges, judge, setSelectedJudges)}
                      className="w-4 h-4 rounded border-2 border-slate-300 text-orange-600"
                    />
                    <span className="text-sm text-slate-900">{judge}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Question Filter */}
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Question {selectedQuestions.size > 0 && `(${selectedQuestions.size})`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-96 p-2 bg-white border border-slate-200 shadow-lg">
              <div className="max-h-[300px] overflow-y-auto">
                {uniqueQuestions.map((question) => (
                  <label
                    key={question}
                    className={clsx(
                      "flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors",
                      selectedQuestions.has(question) ? "bg-orange-50" : "hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={selectedQuestions.has(question)}
                      onChange={() => toggleFilter(selectedQuestions, question, setSelectedQuestions)}
                      className="w-4 h-4 rounded border-2 border-slate-300 text-orange-600"
                    />
                    <span className="text-sm text-slate-900 line-clamp-2">{question}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {/* Verdict Filter */}
          <Popover modal={false}>
            <PopoverTrigger asChild>
              <button className="px-4 py-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-sm font-medium text-slate-700 transition-colors">
                Verdict {selectedVerdicts.size > 0 && `(${selectedVerdicts.size})`}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-2 bg-white border border-slate-200 shadow-lg">
              {["pass", "fail", "inconclusive"].map((verdict) => (
                <label
                  key={verdict}
                  className={clsx(
                    "flex items-center gap-2 px-2 py-2 rounded cursor-pointer transition-colors",
                    selectedVerdicts.has(verdict) ? "bg-orange-50" : "hover:bg-slate-50"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={selectedVerdicts.has(verdict)}
                    onChange={() => toggleFilter(selectedVerdicts, verdict, setSelectedVerdicts)}
                    className="w-4 h-4 rounded border-2 border-slate-300 text-orange-600"
                  />
                  <span className="text-sm text-slate-900 capitalize">{verdict}</span>
                </label>
              ))}
            </PopoverContent>
          </Popover>

          {/* Clear Filters */}
          {(selectedJudges.size > 0 || selectedQuestions.size > 0 || selectedVerdicts.size > 0) && (
            <button
              onClick={() => {
                setSelectedJudges(new Set());
                setSelectedQuestions(new Set());
                setSelectedVerdicts(new Set());
              }}
              className="px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Results Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">
            Loading evaluations...
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            {evaluations.length === 0 
              ? "No evaluations yet. Run AI judges on submissions to see results."
              : "No evaluations match your filters."
            }
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedEvaluations.size === filteredEvaluations.length && filteredEvaluations.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Submission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Question
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Judge
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Verdict
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Reasoning
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Actions
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider w-10">
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredEvaluations.map((evaluation) => {
                  const isExpanded = expandedRows.has(evaluation.id);
                  return (
                    <>
                      <tr 
                        key={evaluation.id} 
                        className="hover:bg-slate-50 transition-colors cursor-pointer"
                        onClick={() => toggleRow(evaluation.id)}
                      >
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedEvaluations.has(evaluation.id)}
                            onChange={() => toggleSelection(evaluation.id)}
                            className="rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                          />
                        </td>
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-slate-900">{evaluation.submissionId}</span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="max-w-xs">
                            <p className="text-sm text-slate-900 line-clamp-1">{evaluation.questionText}</p>
                            {!isExpanded && (
                              <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                                Answer: {evaluation.answer}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getModelLogo(evaluation.judgeModel) && (
                              <img 
                                src={getModelLogo(evaluation.judgeModel)!} 
                                alt={evaluation.judgeModel} 
                                className="h-5 w-5 object-contain"
                              />
                            )}
                            <div>
                              <span className="text-sm text-slate-900 font-medium">{evaluation.judgeName}</span>
                              {evaluation.judgeModel && isExpanded && (
                                <span className="text-xs text-slate-500 block mt-0.5">
                                  ({evaluation.judgeModel})
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            {getVerdictIcon(evaluation.verdict)}
                            <span className={clsx(
                              "inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize",
                              getVerdictBadge(evaluation.verdict)
                            )}>
                              {evaluation.verdict}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {isExpanded ? (
                            <p className="text-sm text-slate-700 max-w-md whitespace-pre-wrap">
                              {evaluation.reasoning}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-700 max-w-md line-clamp-2">
                              {evaluation.reasoning}
                            </p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs text-slate-900">{formatTimestamp(evaluation.createdAt)}</span>
                        </td>
                        <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={(e) => handleDeleteEvaluation(evaluation.id, e)}
                            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            type="button"
                            title="Delete evaluation"
                          >
                            <Trash2 size={18} />
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center">
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-slate-500" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr key={`${evaluation.id}-expanded`} className="bg-slate-50">
                          <td colSpan={8} className="px-6 py-4">
                            <div className="space-y-4">
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Question</h4>
                                <p className="text-sm text-slate-900">{evaluation.questionText}</p>
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Answer</h4>
                                <p className="text-sm text-slate-900">{evaluation.answer}</p>
                                {evaluation.answerReasoning && (
                                  <p className="text-xs text-slate-600 mt-1 italic">Reasoning: {evaluation.answerReasoning}</p>
                                )}
                              </div>
                              <div>
                                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Judge Reasoning</h4>
                                <p className="text-sm text-slate-700 whitespace-pre-wrap">{evaluation.reasoning}</p>
                              </div>
                              {evaluation.judgeModel && (
                                <div>
                                  <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Model</h4>
                                  <p className="text-sm text-slate-600">{evaluation.judgeModel}</p>
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
