import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { config } from "../lib/config";
import { productCopy } from "../lib/product";
import { api } from "../lib/api";
import { Layout } from "../components/Layout";

interface MetricsData {
  leads: number;
  meetingsBooked: number;
  qualifiedLeads: number;
  avgScore: number;
  followupsSent: number;
  escalatedLeads: number;
  activeWorkflows: number;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  trialing: "bg-blue-100 text-blue-800",
  canceled: "bg-red-100 text-red-800",
  none: "bg-gray-100 text-gray-800",
};

export function Dashboard() {
  const { tenant } = useAuth();
  const [metrics, setMetrics] = useState<MetricsData | null>(null);

  const fetchMetrics = useCallback(async () => {
    try {
      const data = await api<MetricsData>("/metrics");
      setMetrics(data);
    } catch {
      // silently fail — widgets just show 0
    }
  }, []);

  useEffect(() => {
    fetchMetrics();
  }, [fetchMetrics]);

  const status = tenant?.subscriptionStatus || "none";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.none;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{productCopy.dashboardHeading}</h1>
          <p className="text-gray-500 mt-1">{productCopy.dashboardSubtext}</p>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">{tenant?.name}</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {status === "active" ? "Active" : status === "pending" ? "Pending Activation" : status}
            </span>
          </div>

          {status === "pending" && (
            <p className="text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              Your account is pending activation. Please contact support.
            </p>
          )}
        </div>

        {/* Product-Specific Widgets */}
        <div className="grid grid-cols-2 gap-4">
          <ProductWidgets metrics={metrics} />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/leads"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">{productCopy.leadListTitle}</h3>
            <p className="text-sm text-gray-500 mt-1">{productCopy.leadFormDescription}</p>
          </Link>

          <Link
            to="/metrics"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Analytics</h3>
            <p className="text-sm text-gray-500 mt-1">See how your automation is performing</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}

function ProductWidgets({ metrics }: { metrics: MetricsData | null }) {
  const slug = config.slug;
  const m = metrics || { leads: 0, meetingsBooked: 0, qualifiedLeads: 0, avgScore: 0, followupsSent: 0, escalatedLeads: 0, activeWorkflows: 0 };

  if (slug === "saas-booker") {
    return (
      <>
        <WidgetCard label="Meetings Booked" value={m.meetingsBooked} accent="blue" />
        <WidgetCard label="Leads in Pipeline" value={m.leads} accent="green" />
      </>
    );
  }

  if (slug === "saas-leadqualifier") {
    return (
      <>
        <WidgetCard label="Leads Qualified" value={m.qualifiedLeads} accent="green" />
        <WidgetCard label="Average Score" value={Math.round(m.avgScore)} accent="blue" />
      </>
    );
  }

  // saas-followup
  return (
    <>
      <WidgetCard label="Messages Sent" value={m.followupsSent} accent="blue" />
      <WidgetCard label="Escalations" value={m.escalatedLeads} accent="red" />
    </>
  );
}

function WidgetCard({ label, value, accent }: { label: string; value: string | number; accent: "green" | "red" | "blue" }) {
  const accentColors = { green: "border-t-green-500", red: "border-t-red-500", blue: "border-t-blue-500" };
  return (
    <div className={`bg-white rounded-lg border border-gray-200 border-t-4 ${accentColors[accent]} p-6`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  );
}
