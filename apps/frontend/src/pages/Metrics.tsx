import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { config } from "../lib/config";
import { Layout } from "../components/Layout";

interface MetricsData {
  leads: number;
  meetingsBooked: number;
  conversionRate: number;
  replyRate: number;
  churn: number;
  mrr: number;
  emailsSent: number;
  webhooksFired: number;
  activationMode: string;
  qualifiedLeads: number;
  disqualifiedLeads: number;
  avgScore: number;
  totalWorkflows: number;
  activeWorkflows: number;
  escalatedLeads: number;
  followupsSent: number;
}

interface StatCardConfig {
  label: string;
  value: string | number;
  accent?: "green" | "red" | "blue" | "yellow";
}

function getProductStats(m: MetricsData): StatCardConfig[] {
  const slug = config.slug;

  if (slug === "saas-booker") {
    return [
      { label: "Total Leads", value: m.leads },
      { label: "Leads Qualified", value: m.qualifiedLeads, accent: "green" },
      { label: "Meetings Booked", value: m.meetingsBooked, accent: "blue" },
      { label: "Avg Score", value: Math.round(m.avgScore) },
      { label: "Conversion Rate", value: `${(m.conversionRate * 100).toFixed(1)}%`, accent: "green" },
      { label: "Follow-ups Sent", value: m.followupsSent },
      { label: "Emails Sent", value: m.emailsSent },
      { label: "Escalations", value: m.escalatedLeads, accent: "red" },
    ];
  }

  if (slug === "saas-leadqualifier") {
    const qualRate = m.leads > 0 ? (m.qualifiedLeads / m.leads * 100).toFixed(1) : "0.0";
    return [
      { label: "Total Leads", value: m.leads },
      { label: "Leads Qualified", value: m.qualifiedLeads, accent: "green" },
      { label: "Leads Disqualified", value: m.disqualifiedLeads, accent: "red" },
      { label: "Avg Score", value: Math.round(m.avgScore) },
      { label: "Qualification Rate", value: `${qualRate}%`, accent: "green" },
      { label: "Reply Rate", value: `${(m.replyRate * 100).toFixed(1)}%` },
      { label: "Follow-ups Sent", value: m.followupsSent },
      { label: "Escalations", value: m.escalatedLeads, accent: "red" },
    ];
  }

  // saas-followup
  return [
    { label: "Total Leads", value: m.leads },
    { label: "Follow-ups Sent", value: m.followupsSent, accent: "blue" },
    { label: "Escalations", value: m.escalatedLeads, accent: "red" },
    { label: "Emails Sent", value: m.emailsSent },
    { label: "Webhooks Fired", value: m.webhooksFired },
    { label: "Reply Rate", value: `${(m.replyRate * 100).toFixed(1)}%`, accent: "green" },
    { label: "Active Sequences", value: m.activeWorkflows, accent: "blue" },
    { label: "Total Workflows", value: m.totalWorkflows },
  ];
}

export function Metrics() {
  const [metrics, setMetrics] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api<MetricsData>("/metrics");
      setMetrics(data);
      setLastUpdated(new Date());
    } catch {
      setError("Failed to load metrics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const stats = metrics ? getProductStats(metrics) : [];

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Metrics</h1>
          <div className="flex items-center gap-4">
            <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
              Back to Dashboard
            </Link>
            <button
              onClick={fetchMetrics}
              disabled={loading}
              className="text-sm px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
            >
              {loading ? "Loading..." : "Refresh"}
            </button>
          </div>
        </div>

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>
        )}

        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.map((s) => (
              <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />
            ))}
          </div>
        )}

        {lastUpdated && (
          <p className="text-xs text-gray-400">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        )}
      </div>
    </Layout>
  );
}

const ACCENT_COLORS = {
  green: "border-l-green-500",
  red: "border-l-red-500",
  blue: "border-l-blue-500",
  yellow: "border-l-yellow-500",
};

function StatCard({ label, value, accent }: StatCardConfig) {
  const accentClass = accent ? `border-l-4 ${ACCENT_COLORS[accent]}` : "";
  return (
    <div className={`bg-white rounded-lg border border-gray-200 p-4 ${accentClass}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
