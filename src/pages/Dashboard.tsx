import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot, query, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  CheckCircle,
  XCircle,
  HelpCircle,
  Clock,
  Zap,
} from "lucide-react";

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

const COLORS = {
  pass: "#22c55e",
  fail: "#ef4444",
  inconclusive: "#eab308",
  orange: "#f97316",
  orangeLight: "#fb923c",
  orangeDark: "#ea580c",
};

export const DashboardPage = () => {
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  // Calculate overall statistics
  const stats = useMemo(() => {
    const total = evaluations.length;
    const pass = evaluations.filter((e) => e.verdict === "pass").length;
    const fail = evaluations.filter((e) => e.verdict === "fail").length;
    const inconclusive = evaluations.filter((e) => e.verdict === "inconclusive").length;
    const passRate = total > 0 ? ((pass / total) * 100).toFixed(1) : "0.0";

    return { total, pass, fail, inconclusive, passRate };
  }, [evaluations]);

  // Pass rate by judge
  const judgeStats = useMemo(() => {
    const judgeMap = new Map<string, { total: number; pass: number; fail: number; inconclusive: number }>();

    evaluations.forEach((e) => {
      const current = judgeMap.get(e.judgeName) || { total: 0, pass: 0, fail: 0, inconclusive: 0 };
      current.total++;
      if (e.verdict === "pass") current.pass++;
      else if (e.verdict === "fail") current.fail++;
      else current.inconclusive++;
      judgeMap.set(e.judgeName, current);
    });

    return Array.from(judgeMap.entries())
      .map(([name, data]) => ({
        name: name.length > 20 ? name.substring(0, 20) + "..." : name,
        fullName: name,
        passRate: data.total > 0 ? ((data.pass / data.total) * 100).toFixed(1) : "0",
        total: data.total,
        pass: data.pass,
        fail: data.fail,
        inconclusive: data.inconclusive,
      }))
      .sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate));
  }, [evaluations]);

  // Verdict distribution
  const verdictData = useMemo(() => {
    return [
      { name: "Pass", value: stats.pass, color: COLORS.pass },
      { name: "Fail", value: stats.fail, color: COLORS.fail },
      { name: "Inconclusive", value: stats.inconclusive, color: COLORS.inconclusive },
    ].filter((item) => item.value > 0);
  }, [stats]);

  // Time-based trends (last 7 days)
  const timeTrends = useMemo(() => {
    const now = new Date();
    const days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now);
      date.setDate(date.getDate() - (6 - i));
      return {
        date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        fullDate: date,
        pass: 0,
        fail: 0,
        inconclusive: 0,
        total: 0,
      };
    });

    evaluations.forEach((e) => {
      if (!e.createdAt) return;
      try {
        const evalDate = e.createdAt.toDate ? e.createdAt.toDate() : new Date(e.createdAt);
        const dayIndex = days.findIndex(
          (d) =>
            d.fullDate.getDate() === evalDate.getDate() &&
            d.fullDate.getMonth() === evalDate.getMonth() &&
            d.fullDate.getFullYear() === evalDate.getFullYear()
        );

        if (dayIndex >= 0) {
          days[dayIndex].total++;
          if (e.verdict === "pass") days[dayIndex].pass++;
          else if (e.verdict === "fail") days[dayIndex].fail++;
          else days[dayIndex].inconclusive++;
        }
      } catch (err) {
        // Skip invalid dates
      }
    });

    return days;
  }, [evaluations]);

  // Model performance
  const modelStats = useMemo(() => {
    const modelMap = new Map<string, { total: number; pass: number }>();

    evaluations.forEach((e) => {
      const model = e.judgeModel || "Unknown";
      const current = modelMap.get(model) || { total: 0, pass: 0 };
      current.total++;
      if (e.verdict === "pass") current.pass++;
      modelMap.set(model, current);
    });

    return Array.from(modelMap.entries())
      .map(([model, data]) => ({
        model: model.length > 25 ? model.substring(0, 25) + "..." : model,
        fullModel: model,
        passRate: data.total > 0 ? ((data.pass / data.total) * 100).toFixed(1) : "0",
        total: data.total,
        pass: data.pass,
      }))
      .sort((a, b) => parseFloat(b.passRate) - parseFloat(a.passRate))
      .slice(0, 5);
  }, [evaluations]);

  // Question analysis
  const questionStats = useMemo(() => {
    const questionMap = new Map<string, { total: number; pass: number }>();

    evaluations.forEach((e) => {
      const question = e.questionText || "Unknown";
      const key = question.length > 50 ? question.substring(0, 50) + "..." : question;
      const current = questionMap.get(key) || { total: 0, pass: 0 };
      current.total++;
      if (e.verdict === "pass") current.pass++;
      questionMap.set(key, current);
    });

    return Array.from(questionMap.entries())
      .map(([question, data]) => ({
        question,
        passRate: data.total > 0 ? ((data.pass / data.total) * 100).toFixed(1) : "0",
        total: data.total,
        pass: data.pass,
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [evaluations]);

  // Recent activity (last 10)
  const recentActivity = useMemo(() => {
    return evaluations.slice(0, 10);
  }, [evaluations]);

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return "N/A";
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "N/A";
    }
  };

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "pass":
        return <CheckCircle className="text-green-600" size={16} />;
      case "fail":
        return <XCircle className="text-red-600" size={16} />;
      default:
        return <HelpCircle className="text-yellow-600" size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Analytics Dashboard</h1>
        <p className="text-sm text-slate-600 mt-1">Real-time insights into your AI judge evaluations</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Total Evaluations</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Activity className="text-orange-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Pass Rate</p>
              <p className="text-3xl font-bold text-orange-600">{stats.passRate}%</p>
              <p className="text-xs text-slate-500 mt-1">
                {stats.pass} of {stats.total} passed
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp className="text-green-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Active Judges</p>
              <p className="text-3xl font-bold text-slate-900">{judgeStats.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="text-blue-600" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">Avg per Judge</p>
              <p className="text-3xl font-bold text-slate-900">
                {judgeStats.length > 0
                  ? Math.round(judgeStats.reduce((sum, j) => sum + j.total, 0) / judgeStats.length)
                  : 0}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Zap className="text-purple-600" size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pass Rate by Judge */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Pass Rate by Judge</h2>
          {judgeStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={judgeStats} margin={{ top: 5, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="name"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tick={{ fontSize: 12 }}
                  stroke="#64748b"
                />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === "passRate") return [`${value}%`, "Pass Rate"];
                    return [value, name];
                  }}
                />
                <Bar
                  dataKey="passRate"
                  fill={COLORS.orange}
                  radius={[8, 8, 0, 0]}
                  animationDuration={1000}
                  animationBegin={0}
                >
                  {judgeStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS.orange} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>

        {/* Verdict Distribution */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Verdict Distribution</h2>
          {verdictData.length > 0 ? (
            <div className="flex items-center justify-center">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={verdictData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                    animationDuration={1000}
                    animationBegin={0}
                  >
                    {verdictData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Time Trends */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">7-Day Trend</h2>
          {timeTrends.some((d) => d.total > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={timeTrends} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.pass} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.pass} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={COLORS.fail} stopOpacity={0.8} />
                    <stop offset="95%" stopColor={COLORS.fail} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis tick={{ fontSize: 12 }} stroke="#64748b" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="pass"
                  stackId="1"
                  stroke={COLORS.pass}
                  fillOpacity={1}
                  fill="url(#colorPass)"
                  animationDuration={1000}
                  animationBegin={0}
                />
                <Area
                  type="monotone"
                  dataKey="fail"
                  stackId="1"
                  stroke={COLORS.fail}
                  fillOpacity={1}
                  fill="url(#colorFail)"
                  animationDuration={1000}
                  animationBegin={0}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>

        {/* Model Performance */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Model Performance</h2>
          {modelStats.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={modelStats} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis type="number" tick={{ fontSize: 12 }} stroke="#64748b" />
                <YAxis dataKey="model" type="category" tick={{ fontSize: 12 }} stroke="#64748b" width={90} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e5e7eb",
                    borderRadius: "8px",
                  }}
                  formatter={(value: any) => [`${value}%`, "Pass Rate"]}
                />
                <Bar
                  dataKey="passRate"
                  fill={COLORS.orange}
                  radius={[0, 8, 8, 0]}
                  animationDuration={1000}
                  animationBegin={0}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[300px] text-slate-500">
              No data available
            </div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Question Analysis */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Top Questions by Volume</h2>
          {questionStats.length > 0 ? (
            <div className="space-y-3">
              {questionStats.map((q, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{q.question}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <span className="text-xs text-slate-600">{q.total} evaluations</span>
                      <span className="text-xs text-orange-600 font-medium">{q.passRate}% pass rate</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <div className="w-16 bg-slate-200 rounded-full h-2">
                      <div
                        className="bg-orange-500 h-2 rounded-full transition-all duration-1000"
                        style={{ width: `${q.passRate}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-500">No data available</div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Recent Activity</h2>
          {recentActivity.length > 0 ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {recentActivity.map((evaluation) => (
                <div
                  key={evaluation.id}
                  className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <div className="mt-0.5">{getVerdictIcon(evaluation.verdict)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{evaluation.judgeName}</p>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-1">{evaluation.questionText}</p>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {formatTimestamp(evaluation.createdAt)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded ${
                        evaluation.verdict === "pass"
                          ? "bg-green-100 text-green-700"
                          : evaluation.verdict === "fail"
                          ? "bg-red-100 text-red-700"
                          : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {evaluation.verdict}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-[200px] text-slate-500">No recent activity</div>
          )}
        </div>
      </div>
    </div>
  );
};

