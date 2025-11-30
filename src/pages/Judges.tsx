import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Zap, Edit2, X, ChevronDown } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase.ts"; 
import { Judge } from "../types";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const JudgesPage = () => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<Judge>>({
    name: "",
    model: "gemini-1.5-flash",
    systemPrompt: "You are a helpful AI judge.",
    isActive: true,
  });

  // 1. Fetch Judges (Real-time)
  useEffect(() => {
    setLoading(true);
    setError(null);
    
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
          setJudges(data);
          setLoading(false);
        } catch (err: any) {
          console.error("Error processing judges data:", err);
          setError(`Failed to process judges: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error("Firebase error:", err);
        setError(`Failed to load judges: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // 2. Handle Save (Create or Update)
  const handleSave = async () => {
    if (!formData.name?.trim() || !formData.systemPrompt?.trim()) {
      setError("Judge name and system prompt are required");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setError(null);
    try {
      const judgeData = {
        name: formData.name.trim(),
        model: formData.model || "gemini-1.5-flash",
        systemPrompt: formData.systemPrompt.trim(),
        isActive: formData.isActive !== undefined ? formData.isActive : true,
      };

      if (selectedJudge && isEditing) {
        // Update existing
        await updateDoc(doc(db, "judges", selectedJudge.id), judgeData);
        console.log("Judge updated:", selectedJudge.id);
      } else {
        // Create new
        const docRef = await addDoc(collection(db, "judges"), judgeData);
        console.log("Judge created:", docRef.id);
      }
      resetForm();
      setShowForm(false);
    } catch (error: any) {
      console.error("Error saving judge:", error);
      setError(`Failed to save judge: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  // 3. Handle Delete
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const judge = judges.find(j => j.id === id);
    const judgeName = judge?.name || "this judge";
    
    if (!confirm(`Are you sure you want to delete "${judgeName}"? This action cannot be undone.`)) {
      return;
    }

    setError(null);
    try {
      await deleteDoc(doc(db, "judges", id));
      console.log("Judge deleted:", id);
      if (selectedJudge?.id === id) {
        resetForm();
        setShowForm(false);
      }
    } catch (error: any) {
      console.error("Error deleting judge:", error);
      setError(`Failed to delete judge: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    }
  };

  const resetForm = () => {
    setSelectedJudge(null);
    setIsEditing(false);
    setFormData({
      name: "",
      model: "gemini-1.5-flash",
      systemPrompt: "You are a helpful AI judge.",
      isActive: true,
    });
  };

  const selectJudge = (judge: Judge) => {
    setSelectedJudge(judge);
    setFormData({
      name: judge.name || "",
      model: judge.model || "gemini-1.5-flash",
      systemPrompt: judge.systemPrompt || "",
      isActive: judge.isActive !== undefined ? judge.isActive : true,
    });
    setIsEditing(true);
    setShowForm(true);
  };

  const openNewJudgeForm = () => {
    resetForm();
    setShowForm(true);
  };

  const getModelBadgeColor = (model: string) => {
    if (model.includes("gpt")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (model.includes("gemini")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (model.includes("llama") || model.includes("mixtral")) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">AI Judges</h1>
          <p className="text-sm text-slate-600 mt-1">
            Create and manage AI judges for evaluating submissions
          </p>
        </div>
        <button
          onClick={openNewJudgeForm}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-md"
        >
          <Plus size={18} />
          Create Judge
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      {/* Judges Grid */}
      {loading ? (
        <div className="p-8 text-center text-slate-500">
          Loading judges from Firebase...
        </div>
      ) : judges.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
          <Zap className="mx-auto h-12 w-12 text-slate-400 mb-4" />
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No judges yet</h3>
          <p className="text-slate-600 mb-4">Create your first AI judge to get started</p>
          <button
            onClick={openNewJudgeForm}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            <Plus size={18} />
            Create Judge
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {judges.map((judge) => (
            <div
              key={judge.id}
              onClick={() => selectJudge(judge)}
              className={clsx(
                "bg-white rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.02] relative group",
                judge.isActive
                  ? "border-slate-200 hover:border-blue-300"
                  : "border-slate-100 opacity-75"
              )}
            >
              {/* Active Badge */}
              <div className="absolute top-3 right-3">
                {judge.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Inactive
                  </span>
                )}
              </div>

              {/* Delete Button */}
              <button
                onClick={(e) => handleDelete(judge.id, e)}
                className="absolute top-3 left-3 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-red-50 hover:bg-red-100 text-red-600"
                title="Delete judge"
              >
                <Trash2 size={14} />
              </button>

              {/* Card Content */}
              <div className="mt-6">
                <div className="flex items-center gap-2 mb-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Zap className="h-5 w-5 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-1">
                    {judge.name}
                  </h3>
                </div>

                {/* Model Badge */}
                <div className={clsx(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border mb-3",
                  getModelBadgeColor(judge.model)
                )}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                  {judge.model}
                </div>

                {/* Prompt Preview */}
                <div className="mt-3">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1.5">
                    System Prompt
                  </div>
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <p className="text-sm text-slate-700 leading-relaxed line-clamp-4 min-h-[5rem]">
                      {judge.systemPrompt || (
                        <span className="text-slate-400 italic">No prompt set</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Edit Indicator */}
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-500">
                <Edit2 size={12} />
                <span>Click to edit</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowForm(false)}>
          <div
            className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-white">
              <h2 className="text-2xl font-bold text-black">
                {isEditing ? "Edit Judge" : "Create New Judge"}
              </h2>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-black" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6 overflow-y-auto flex-1">
              {/* Name Field */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">Judge Name</label>
                <input
                  type="text"
                  value={formData.name || ""}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all text-black placeholder:text-slate-400"
                  placeholder="e.g., Grammar Critic"
                />
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">AI Model Provider</label>
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="w-full px-4 py-2.5 text-left rounded-lg border-2 border-slate-300 bg-white text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 flex items-center justify-between text-black"
                    >
                      <span>
                        {formData.model === "gpt-4o" && "GPT-4o"}
                        {formData.model === "gpt-4" && "GPT-4"}
                        {formData.model === "gpt-3.5-turbo" && "GPT-3.5 Turbo"}
                        {formData.model === "gemini-1.5-flash" && "Gemini 1.5 Flash (Fast)"}
                        {formData.model === "gemini-1.5-pro" && "Gemini 1.5 Pro (Reasoning)"}
                        {formData.model === "llama3-8b-8192" && "Llama 3 8B"}
                        {formData.model === "llama3-70b-8192" && "Llama 3 70B"}
                        {formData.model === "mixtral-8x7b-32768" && "Mixtral 8x7b"}
                        {!formData.model && "Select a model"}
                      </span>
                      <ChevronDown className="h-4 w-4 text-slate-500" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-[var(--radix-popover-trigger-width)] p-2 bg-white border border-slate-300 shadow-lg text-black" 
                    align="start"
                  >
                    <div className="max-h-[400px] overflow-y-auto">
                      {/* OpenAI */}
                      <div className="px-2 py-1 text-xs text-black">OpenAI</div>
                      {[
                        { value: "gpt-4o", label: "GPT-4o" },
                        { value: "gpt-4", label: "GPT-4" },
                        { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo" },
                      ].map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, model: model.value });
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-black hover:bg-slate-100"
                        >
                          {model.label}
                        </button>
                      ))}

                      {/* Google */}
                      <div className="px-2 py-1 text-xs text-black mt-2">Google (Free Tier)</div>
                      {[
                        { value: "gemini-1.5-flash", label: "Gemini 1.5 Flash (Fast)" },
                        { value: "gemini-1.5-pro", label: "Gemini 1.5 Pro (Reasoning)" },
                      ].map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, model: model.value });
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-black hover:bg-slate-100"
                        >
                          {model.label}
                        </button>
                      ))}

                      {/* Groq */}
                      <div className="px-2 py-1 text-xs text-black mt-2">Groq (Ultra Fast)</div>
                      {[
                        { value: "llama3-8b-8192", label: "Llama 3 8B" },
                        { value: "llama3-70b-8192", label: "Llama 3 70B" },
                        { value: "mixtral-8x7b-32768", label: "Mixtral 8x7b" },
                      ].map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, model: model.value });
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-black hover:bg-slate-100"
                        >
                          {model.label}
                        </button>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>
                <p className="text-xs text-slate-600 mt-2">
                  Select the underlying model this judge will use for evaluations.
                </p>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-sm font-semibold text-black mb-2">System Prompt / Rubric</label>
                <textarea
                  value={formData.systemPrompt || ""}
                  onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                  className="w-full h-48 px-4 py-3 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none font-mono text-sm resize-none text-black placeholder:text-slate-400"
                  placeholder="You are an expert grader..."
                />
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-black select-none cursor-pointer">
                  Active (Available for queues)
                </label>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-200 flex justify-end gap-3 bg-white">
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-5 py-2.5 text-black hover:bg-slate-100 rounded-lg font-semibold transition-colors border-2 border-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-6 py-2.5 bg-black hover:bg-slate-800 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-95"
              >
                <Save size={18} />
                {isEditing ? "Update Judge" : "Create Judge"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
