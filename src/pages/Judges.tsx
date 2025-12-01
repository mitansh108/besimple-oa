import { useEffect, useState } from "react";
import { Plus, Save, Trash2, Zap, Edit2, X, ChevronDown, MoreVertical, Loader2 } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase.ts"; 
import { Judge } from "../types";
import clsx from "clsx";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { refinePrompt } from "../services/judgeRunner";

export const JudgesPage = () => {
  const [judges, setJudges] = useState<Judge[]>([]);
  const [selectedJudge, setSelectedJudge] = useState<Judge | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refiningPrompt, setRefiningPrompt] = useState(false);

  // Form State
  const [formData, setFormData] = useState<Partial<Judge>>({
    name: "",
    model: "gemini-2.5-flash",
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
              model: docData.model || "gemini-2.5-flash",
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
        model: formData.model || "gemini-2.5-flash",
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
      model: "gemini-2.5-flash",
      systemPrompt: "You are a helpful AI judge.",
      isActive: true,
    });
  };

  const selectJudge = (judge: Judge) => {
    setSelectedJudge(judge);
    setFormData({
      name: judge.name || "",
      model: judge.model || "gemini-2.5-flash",
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

  const handleRefinePrompt = async () => {
    const currentPrompt = formData.systemPrompt || "";
    
    if (!currentPrompt.trim()) {
      setError("Please enter a prompt to refine");
      setTimeout(() => setError(null), 3000);
      return;
    }

    setRefiningPrompt(true);
    setError(null);

    try {
      const result = await refinePrompt({ prompt: currentPrompt });
      setFormData({ ...formData, systemPrompt: result.refinedPrompt });
    } catch (error: any) {
      console.error("Error refining prompt:", error);
      setError(`Failed to refine prompt: ${error.message || "Unknown error"}`);
      setTimeout(() => setError(null), 5000);
    } finally {
      setRefiningPrompt(false);
    }
  };

  const getModelBadgeColor = (model: string) => {
    if (model.includes("gpt")) return "bg-purple-100 text-purple-700 border-purple-200";
    if (model.includes("gemini")) return "bg-blue-100 text-blue-700 border-blue-200";
    if (model.includes("llama") || model.includes("mixtral")) return "bg-orange-100 text-orange-700 border-orange-200";
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const getModelLogo = (model: string) => {
    if (model.includes("gemini")) return "/logos/Google_Gemini_icon_2025.svg";
    if (model.includes("gpt-oss")) return "/logos/OpenAI_logo_2025_(symbol).svg";
    if (model.includes("groq")) return "/logos/groq-icon-seeklogo.svg";
    if (model.includes("llama")) return "/logos/Meta_Platforms_logo.svg";
    if (model.includes("moonshot") || model.includes("kimi")) return "/logos/129152888.jpeg";
    if (model.includes("qwen")) return "/logos/qwen-color.svg";
    return null;
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
          className="flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors shadow-md"
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
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
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
                  ? "border-slate-200 hover:border-orange-300"
                  : "border-slate-100 opacity-75"
              )}
            >
              {/* Active Badge */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                {judge.isActive ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500 border border-slate-200">
                    Inactive
                  </span>
                )}
                
                {/* Edit Dropdown Menu */}
                <Popover modal={false}>
                  <PopoverTrigger asChild>
                    <button
                      onClick={(e) => e.stopPropagation()}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-slate-50 hover:bg-slate-100 text-slate-600"
                      title="More options"
                    >
                      <MoreVertical size={14} />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent 
                    className="w-40 p-1 bg-white border border-slate-300 shadow-lg text-black" 
                    align="end"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        selectJudge(judge);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-black hover:bg-slate-100 flex items-center gap-2 rounded-md"
                    >
                      <Edit2 size={14} />
                      <span>Edit</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(judge.id, e);
                      }}
                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-md"
                    >
                      <Trash2 size={14} />
                      <span>Delete</span>
                    </button>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Card Content */}
              <div className="mt-6">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2.5 bg-orange-50 rounded-lg">
                    {getModelLogo(judge.model) ? (
                      <img 
                        src={getModelLogo(judge.model)!} 
                        alt={judge.model} 
                        className="h-7 w-7 object-contain"
                      />
                    ) : (
                      <Zap className="h-7 w-7 text-orange-600" />
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 line-clamp-1">
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
                  {judge.model.includes("gemini") && (
                    <span className="text-slate-500 font-normal">(Supports images)</span>
                  )}
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
                  className="w-full px-4 py-2.5 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all text-black placeholder:text-slate-400"
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
                      className="w-full px-4 py-2.5 text-left rounded-lg border-2 border-slate-300 bg-white text-sm hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 flex items-center justify-between text-black"
                    >
                      <span className="flex items-center gap-2">
                        {formData.model === "gemini-2.5-flash" && (
                          <>
                            <img src="/logos/Google_Gemini_icon_2025.svg" alt="Gemini" className="w-4 h-4" />
                            <span>Gemini 2.5 Flash (Supports images)</span>
                          </>
                        )}
                        {formData.model === "openai/gpt-oss-20b" && "GPT OSS 20B"}
                        {formData.model === "openai/gpt-oss-120b" && "GPT OSS 120B"}
                        {formData.model === "groq/compound" && "Groq Compound"}
                        {formData.model === "llama-3.3-70b-versatile" && "Llama 3.3 70B Versatile"}
                        {formData.model === "meta-llama/llama-4-maverick-17b-128e-instruct" && "Llama 4 Maverick 17B"}
                        {formData.model === "moonshotai/kimi-k2-instruct-0905" && "Moonshot Kimi K2"}
                        {formData.model === "qwen/qwen3-32b" && "Qwen 3 32B"}
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
                      {[
                        { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (Supports images)", logo: "/logos/Google_Gemini_icon_2025.svg" },
                        { value: "openai/gpt-oss-20b", label: "GPT OSS 20B", logo: "/logos/OpenAI_logo_2025_(symbol).svg" },
                        { value: "openai/gpt-oss-120b", label: "GPT OSS 120B", logo: "/logos/OpenAI_logo_2025_(symbol).svg" },
                        { value: "groq/compound", label: "Groq Compound", logo: "/logos/groq-icon-seeklogo.svg" },
                        { value: "llama-3.3-70b-versatile", label: "Llama 3.3 70B Versatile", logo: "/logos/Meta_Platforms_logo.svg" },
                        { value: "meta-llama/llama-4-maverick-17b-128e-instruct", label: "Llama 4 Maverick 17B", logo: "/logos/Meta_Platforms_logo.svg" },
                        { value: "moonshotai/kimi-k2-instruct-0905", label: "Moonshot Kimi K2", logo: "/logos/129152888.jpeg" },
                        { value: "qwen/qwen3-32b", label: "Qwen 3 32B", logo: "/logos/qwen-color.svg" },
                      ].map((model) => (
                        <button
                          key={model.value}
                          type="button"
                          onClick={() => {
                            setFormData({ ...formData, model: model.value });
                          }}
                          className="w-full text-left px-2 py-2 text-sm text-black hover:bg-slate-100 flex items-center gap-2"
                        >
                          {model.logo && (
                            <img src={model.logo} alt={model.label} className="w-5 h-5" />
                          )}
                          <span>{model.label}</span>
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
                
                {/* Prompt Templates */}
                <div className="mb-3 flex flex-nowrap gap-1.5">
                  {[
                    {
                      name: "Maths Checker",
                      prompt: `You are a Mathematics Judge specializing in evaluating mathematical calculations, problem-solving methods, formulas, and numerical reasoning.

STEP 1 - CHECK THE QUESTION TYPE:

First, examine what the question is asking about:

- If the question involves mathematics, calculations, numbers, equations, formulas, geometry, algebra, or any mathematical concepts → Proceed to evaluate

- If the question is about grammar, spelling, writing, history, geography, or any non-mathematical subject → Return INCONCLUSIVE

STEP 2 - EVALUATE (only if question is about mathematics):

Pass if:

- The numerical answer is correct

- The mathematical method/approach is sound and appropriate

- All calculations are accurate

- Formulas are applied correctly

- The reasoning process is logical and mathematically valid

- Units are correct (if applicable)

- The answer demonstrates understanding of the mathematical concept

Fail if:

- The numerical answer is incorrect

- Contains calculation errors (arithmetic mistakes, wrong operations)

- Uses incorrect formulas or mathematical principles

- Has flawed mathematical reasoning or logic

- Misapplies mathematical concepts

- Contains errors in algebraic manipulation

- Has incorrect units or unit conversions

- Shows fundamental misunderstanding of the mathematical topic

Inconclusive if:

- The question is NOT about mathematics (e.g., "What is the capital of France?", "Is this sentence grammatically correct?", "What happened in 1776?")

- The question asks about factual knowledge in other subjects like history, science facts, geography, etc.

EXAMPLES:

- Question: "What is 15 × 8?" → This IS a math question, evaluate the answer

- Question: "Solve for x: 2x + 5 = 13" → This IS a math question, evaluate the answer

- Question: "What is the past tense of 'run'?" → This is NOT a math question, return INCONCLUSIVE

- Question: "What is the capital of France?" → This is NOT a math question, return INCONCLUSIVE

CRITICAL: Always check if the question is asking about mathematics BEFORE evaluating the answer. If it's asking about any other subject, immediately return INCONCLUSIVE with reasoning: "This question is about [subject], not mathematics."`,
                      icon: "🔢",
                    },
                    {
                      name: "Grammar Checker",
                      prompt: `You are a Grammar Judge specializing in evaluating English grammar, spelling, punctuation, and clarity.

STEP 1 - CHECK THE QUESTION TYPE:

First, examine what the question is asking about:

- If the question is about grammar, spelling, punctuation, sentence structure, or writing → Proceed to evaluate

- If the question is about math, science, history, geography, facts, or any other subject → Return INCONCLUSIVE

STEP 2 - EVALUATE (only if question is about grammar):

Pass if:

- The answer demonstrates correct grammar and sentence structure

- Spelling and punctuation are accurate

- The response is clear, coherent, and well-written

- Word choice is appropriate

Fail if:

- Contains grammar errors (subject-verb agreement, tense errors, etc.)

- Has spelling mistakes or typos

- Punctuation is incorrect or missing

- The response is unclear or poorly structured

- Contains run-on sentences or sentence fragments

Inconclusive if:

- The question is NOT about grammar, spelling, or writing (e.g., "What is 2+2?", "Is the Earth round?", "What is the capital of France?")

- The question asks about factual knowledge in math, science, history, etc.

EXAMPLES:

- Question: "What is the past tense of 'run'?" → This IS a grammar question, evaluate the answer

- Question: "What is 15 × 8?" → This is NOT a grammar question, return INCONCLUSIVE

- Question: "Does the Earth orbit the Sun?" → This is NOT a grammar question, return INCONCLUSIVE

- Question: "Which sentence is correct: 'He don't like it' or 'He doesn't like it'?" → This IS a grammar question, evaluate the answer

CRITICAL: Always check if the question is asking about grammar/language BEFORE evaluating the answer. If it's asking about any other subject, immediately return INCONCLUSIVE with reasoning: "This question is about [subject], not grammar or language."`,
                      icon: "✍️",
                    },
                    {
                      name: "Logic & Reasoning",
                      prompt: `You are a Logic and Reasoning Judge specializing in evaluating argument structure, logical validity, reasoning quality, and critical thinking.

STEP 1 - CHECK THE QUESTION TYPE:

First, examine what the question is asking about:

- If the question requires logical reasoning, argument evaluation, critical thinking, problem-solving logic, or analysis of cause-and-effect → Proceed to evaluate

- If the question is purely factual recall, simple definitions, or asks for memorized information without reasoning → Return INCONCLUSIVE

STEP 2 - EVALUATE (only if question requires reasoning):

Pass if:

- The reasoning is logically sound and valid

- Arguments are well-structured with clear premises and conclusions

- The logical flow is coherent and easy to follow

- No logical fallacies are present (no ad hominem, strawman, false dilemma, etc.)

- Conclusions properly follow from the premises

- The answer demonstrates critical thinking and analysis

- Alternative perspectives are considered when appropriate

- The reasoning process is clearly explained

Fail if:

- Contains logical fallacies or flawed reasoning

- Premises do not support the conclusion

- Arguments are contradictory or inconsistent

- The reasoning is circular or tautological

- Critical thinking is absent or superficial

- Cause-and-effect relationships are incorrectly identified

- The answer jumps to conclusions without proper justification

- Reasoning is based on assumptions without evidence

Inconclusive if:

- The question is purely factual and requires no reasoning (e.g., "What is the capital of France?", "What is 2+2?", "What year did World War II end?")

- The question asks for simple definitions or memorized facts without analysis

- The question is about grammar, spelling, or other subjects that don't involve logical reasoning

EXAMPLES:

- Question: "Why do you think democracy is important?" → This IS a reasoning question, evaluate the answer

- Question: "Explain why the sky appears blue" → This IS a reasoning question, evaluate the answer

- Question: "What is the capital of France?" → This is NOT a reasoning question, return INCONCLUSIVE

- Question: "What is 15 × 8?" → This is NOT a reasoning question, return INCONCLUSIVE

CRITICAL: Always check if the question requires logical reasoning or critical thinking BEFORE evaluating the answer. If it's asking for simple factual recall or memorized information, immediately return INCONCLUSIVE with reasoning: "This question is about factual recall, not logical reasoning."`,
                      icon: "🧠",
                    },
                    {
                      name: "Factual Accuracy",
                      prompt: `You are a Factual Accuracy Judge specializing in verifying the truthfulness, accuracy, and correctness of factual claims and information.

STEP 1 - CHECK THE QUESTION TYPE:

First, examine what the question is asking about:

- If the question asks about facts, historical events, scientific facts, geographical information, definitions, dates, names, or verifiable information → Proceed to evaluate

- If the question is about opinions, preferences, creative writing, grammar rules, or subjective matters → Return INCONCLUSIVE

STEP 2 - EVALUATE (only if question is about facts):

Pass if:

- All stated facts are accurate and verifiable

- Information is correct according to established knowledge

- Dates, names, places, and numbers are accurate

- Scientific facts align with current scientific understanding

- Historical claims are factually correct

- Definitions are accurate

- No misinformation or false claims are present

Fail if:

- Contains factual errors or incorrect information

- States false claims or misinformation

- Dates, names, places, or numbers are incorrect

- Scientific facts are inaccurate or outdated

- Historical claims are factually wrong

- Definitions are incorrect or misleading

- Information contradicts established knowledge

- Makes unsubstantiated claims presented as facts

Inconclusive if:

- The question is about opinions, preferences, or subjective matters (e.g., "What is your favorite color?", "Do you like pizza?")

- The question is about grammar rules or language conventions (not factual claims)

- The question asks for creative or imaginative responses

- The question is about personal experiences or feelings

EXAMPLES:

- Question: "What is the capital of France?" → This IS a factual question, evaluate the answer

- Question: "When did World War II end?" → This IS a factual question, evaluate the answer

- Question: "What is your favorite subject?" → This is NOT a factual question, return INCONCLUSIVE

- Question: "Is this sentence grammatically correct?" → This is NOT a factual accuracy question, return INCONCLUSIVE

- Question: "What is 2+2?" → This IS a factual question, evaluate the answer

CRITICAL: Always check if the question is asking about verifiable facts BEFORE evaluating the answer. If it's asking about opinions, preferences, or subjective matters, immediately return INCONCLUSIVE with reasoning: "This question is about [subject], not factual accuracy."`,
                      icon: "✅",
                    },
                  ].map((template) => (
                    <button
                      key={template.name}
                      type="button"
                      onClick={() => {
                        setFormData({ 
                          ...formData, 
                          systemPrompt: template.prompt,
                          name: formData.name || template.name
                        });
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md border border-slate-300 bg-white hover:bg-orange-50 hover:border-orange-400 text-slate-700 hover:text-orange-700 transition-all shadow-sm hover:shadow"
                    >
                      <span className="text-sm">{template.icon}</span>
                      <span className="whitespace-nowrap">{template.name}</span>
                    </button>
                  ))}
                </div>
                
                <div className="relative">
                  <textarea
                    value={formData.systemPrompt || ""}
                    onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
                    className="w-full h-48 px-4 pt-3 pb-12 rounded-lg border-2 border-slate-300 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none font-mono text-sm resize-none text-black placeholder:text-slate-400"
                    placeholder="You are an expert grader..."
                  />
                  <button
                    type="button"
                    onClick={handleRefinePrompt}
                    disabled={refiningPrompt}
                    className="absolute bottom-2 right-2 px-3 py-1.5 text-xs font-medium rounded-md bg-white hover:bg-orange-50 text-orange-500 border border-orange-300 hover:border-orange-400 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                  >
                    {refiningPrompt ? (
                      <>
                        <Loader2 size={12} className="animate-spin" />
                        <span>Refining...</span>
                      </>
                    ) : (
                      <span>Refine prompt with AI</span>
                    )}
                  </button>
                </div>
              </div>

              {/* Active Toggle */}
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive ?? true}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="w-5 h-5 text-orange-600 rounded focus:ring-orange-500"
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
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold flex items-center gap-2 shadow-lg transition-all active:scale-95"
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
