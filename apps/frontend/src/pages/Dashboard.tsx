import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { config } from "../lib/config";
import { Layout } from "../components/Layout";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  trialing: "bg-blue-100 text-blue-800",
  canceled: "bg-red-100 text-red-800",
  none: "bg-gray-100 text-gray-800",
};

export function Dashboard() {
  const { tenant } = useAuth();

  const status = tenant?.subscriptionStatus || "none";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.none;

  return (
    <Layout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{config.productName}</h1>
          <p className="text-gray-500 mt-1">{tenant?.name}</p>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Account Status</h2>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
              {status}
            </span>
          </div>

          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-gray-500">Tenant ID</dt>
              <dd className="text-gray-900 font-mono text-xs">{tenant?.id}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Plan</dt>
              <dd className="text-gray-900">{tenant?.plan}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Product</dt>
              <dd className="text-gray-900">{tenant?.saasProduct || "—"}</dd>
            </div>
          </dl>

          {status === "pending" && (
            <p className="mt-4 text-sm text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-md p-3">
              Your account is pending activation. Please contact support.
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/leads"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">Submit Test Lead</h3>
            <p className="text-sm text-gray-500 mt-1">Send a lead through the AI pipeline</p>
          </Link>

          <Link
            to="/metrics"
            className="bg-white rounded-lg border border-gray-200 p-6 hover:border-blue-300 transition-colors"
          >
            <h3 className="font-semibold text-gray-900">View Metrics</h3>
            <p className="text-sm text-gray-500 mt-1">See leads, meetings, and workflows</p>
          </Link>
        </div>
      </div>
    </Layout>
  );
}
