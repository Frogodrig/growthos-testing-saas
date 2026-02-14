import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../lib/api";
import { Layout } from "../components/Layout";

interface MetricsData {
  totalLeads: number;
  totalMeetings: number;
  totalMessages: number;
  totalWorkflows: number;
  activeWorkflows: number;
  mrr: number;
  activationMode: string;
  [key: string]: unknown;
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

        {metrics && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <StatCard label="Total Leads" value={metrics.totalLeads} />
            <StatCard label="Total Meetings" value={metrics.totalMeetings} />
            <StatCard label="Total Messages" value={metrics.totalMessages} />
            <StatCard label="Total Workflows" value={metrics.totalWorkflows} />
            <StatCard label="Active Workflows" value={metrics.activeWorkflows} />
            <StatCard label="MRR" value={`$${metrics.mrr}`} />
            <StatCard label="Activation Mode" value={metrics.activationMode} />
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
