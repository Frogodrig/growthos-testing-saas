import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { Layout } from "../components/Layout";

export function Leads() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("website");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ leadId: string; workflowId: string; processing: boolean } | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const data = await api<{ lead: { id: string }; workflowId: string }>(
        "/api/leads",
        { method: "POST", body: JSON.stringify({ name, email, company: company || undefined, source }) }
      );

      setResult({ leadId: data.lead.id, workflowId: data.workflowId, processing: true });

      // Auto-trigger AI processing
      await api(`/api/leads/${data.lead.id}/process`, { method: "POST" });

      setResult({ leadId: data.lead.id, workflowId: data.workflowId, processing: false });

      // Reset form
      setName("");
      setEmail("");
      setCompany("");
      setSource("website");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Submit Test Lead</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 mb-1">
              Name
            </label>
            <input
              id="lead-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="lead-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="john@company.com"
            />
          </div>

          <div>
            <label htmlFor="lead-company" className="block text-sm font-medium text-gray-700 mb-1">
              Company <span className="text-gray-400">(optional)</span>
            </label>
            <input
              id="lead-company"
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Acme Corp"
            />
          </div>

          <div>
            <label htmlFor="lead-source" className="block text-sm font-medium text-gray-700 mb-1">
              Source
            </label>
            <select
              id="lead-source"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="website">Website</option>
              <option value="referral">Referral</option>
              <option value="linkedin">LinkedIn</option>
              <option value="other">Other</option>
            </select>
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Submitting..." : "Submit Lead"}
          </button>
        </form>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-semibold text-green-800">Lead Submitted</h3>
            <dl className="mt-2 space-y-1 text-sm">
              <div className="flex justify-between">
                <dt className="text-green-700">Lead ID</dt>
                <dd className="font-mono text-xs text-green-900">{result.leadId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-green-700">Workflow ID</dt>
                <dd className="font-mono text-xs text-green-900">{result.workflowId}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-green-700">AI Processing</dt>
                <dd className="text-green-900">
                  {result.processing ? "In progress..." : "Queued for processing"}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </div>
    </Layout>
  );
}
