import { useState, useEffect, useCallback, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api, ApiError } from "../lib/api";
import { config } from "../lib/config";
import { productCopy } from "../lib/product";
import { Layout } from "../components/Layout";

interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  source: string;
  status: string;
  score?: number | null;
  qualificationReason?: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export function Leads() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [source, setSource] = useState("website");
  const [jobTitle, setJobTitle] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [intent, setIntent] = useState("");
  const [budgetRange, setBudgetRange] = useState("");
  const [timeline, setTimeline] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ leadId: string; processing: boolean } | null>(null);

  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(true);

  const fetchLeads = useCallback(async () => {
    setLeadsLoading(true);
    try {
      const data = await api<{ leads: Lead[] }>("/api/leads?limit=50");
      setLeads(data.leads);
    } catch {
      // silently fail
    } finally {
      setLeadsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setResult(null);
    setLoading(true);

    try {
      const metadata: Record<string, string> = {};
      if (jobTitle) metadata.jobTitle = jobTitle;
      if (companySize) metadata.companySize = companySize;
      if (intent) metadata.intent = intent;
      if (budgetRange) metadata.budgetRange = budgetRange;
      if (timeline) metadata.timeline = timeline;
      if (linkedinUrl) metadata.linkedinUrl = linkedinUrl;

      const data = await api<{ lead: { id: string }; workflowId: string }>(
        "/api/leads",
        { method: "POST", body: JSON.stringify({
          name, email, company: company || undefined, source,
          ...(Object.keys(metadata).length > 0 ? { metadata } : {}),
        }) }
      );

      setResult({ leadId: data.lead.id, processing: true });

      // Auto-trigger AI processing
      await api(`/api/leads/${data.lead.id}/process`, { method: "POST" });

      setResult({ leadId: data.lead.id, processing: false });

      setName("");
      setEmail("");
      setCompany("");
      setSource("website");
      setJobTitle("");
      setCompanySize("");
      setIntent("");
      setBudgetRange("");
      setTimeline("");
      setLinkedinUrl("");
      fetchLeads();
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
          <h1 className="text-2xl font-bold text-gray-900">{productCopy.leadListTitle}</h1>
          <Link to="/dashboard" className="text-sm text-blue-600 hover:underline">
            Back to Dashboard
          </Link>
        </div>

        {/* Submit Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{productCopy.leadFormTitle}</h2>
            <p className="text-sm text-gray-500 mt-0.5">{productCopy.leadFormDescription}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="lead-name" className="block text-sm font-medium text-gray-700 mb-1">{productCopy.leadNameLabel}</label>
              <input id="lead-name" type="text" required value={name} onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder={productCopy.leadNamePlaceholder} />
            </div>
            <div>
              <label htmlFor="lead-email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input id="lead-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="john@company.com" />
            </div>
            <div>
              <label htmlFor="lead-company" className="block text-sm font-medium text-gray-700 mb-1">Company <span className="text-gray-400">(optional)</span></label>
              <input id="lead-company" type="text" value={company} onChange={(e) => setCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Acme Corp" />
            </div>
            <div>
              <label htmlFor="lead-source" className="block text-sm font-medium text-gray-700 mb-1">Source</label>
              <select id="lead-source" value={source} onChange={(e) => setSource(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                <option value="website">Website</option>
                <option value="referral">Referral</option>
                <option value="linkedin">LinkedIn</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {/* Enrichment Fields */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Additional Context <span className="text-gray-400">(helps AI qualify better)</span></p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="lead-jobtitle" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input id="lead-jobtitle" type="text" value={jobTitle} onChange={(e) => setJobTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="VP of Sales" />
              </div>
              <div>
                <label htmlFor="lead-companysize" className="block text-sm font-medium text-gray-700 mb-1">Company Size</label>
                <select id="lead-companysize" value={companySize} onChange={(e) => setCompanySize(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Not specified</option>
                  <option value="1-10">1-10 employees</option>
                  <option value="11-50">11-50 employees</option>
                  <option value="51-200">51-200 employees</option>
                  <option value="201-1000">201-1000 employees</option>
                  <option value="1000+">1000+ employees</option>
                </select>
              </div>
              <div>
                <label htmlFor="lead-budget" className="block text-sm font-medium text-gray-700 mb-1">Budget Range</label>
                <select id="lead-budget" value={budgetRange} onChange={(e) => setBudgetRange(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Not specified</option>
                  <option value="<$1k">Less than $1k</option>
                  <option value="$1k-$5k">$1k - $5k</option>
                  <option value="$5k-$25k">$5k - $25k</option>
                  <option value="$25k-$100k">$25k - $100k</option>
                  <option value="$100k+">$100k+</option>
                </select>
              </div>
              <div>
                <label htmlFor="lead-timeline" className="block text-sm font-medium text-gray-700 mb-1">Timeline</label>
                <select id="lead-timeline" value={timeline} onChange={(e) => setTimeline(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                  <option value="">Not specified</option>
                  <option value="Immediate">Immediate</option>
                  <option value="1-3 months">1-3 months</option>
                  <option value="3-6 months">3-6 months</option>
                  <option value="6+ months">6+ months</option>
                </select>
              </div>
              <div className="col-span-2">
                <label htmlFor="lead-linkedin" className="block text-sm font-medium text-gray-700 mb-1">LinkedIn Profile URL</label>
                <input id="lead-linkedin" type="url" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/johndoe" />
              </div>
              <div className="col-span-2">
                <label htmlFor="lead-intent" className="block text-sm font-medium text-gray-700 mb-1">What are they looking for?</label>
                <textarea id="lead-intent" value={intent} onChange={(e) => setIntent(e.target.value)} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Looking for help automating outbound sales..." />
              </div>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="py-2 px-4 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
            {loading ? "Processing..." : productCopy.leadSubmitLabel}
          </button>
        </form>

        {result && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm text-green-700">
              {result.processing ? "AI is processing..." : "Done! Click the entry below to see results."}
            </p>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-lg border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Recent Activity</h2>
            <button onClick={fetchLeads} disabled={leadsLoading}
              className="text-sm px-3 py-1 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50">
              {leadsLoading ? "Loading..." : "Refresh"}
            </button>
          </div>

          {leads.length === 0 && !leadsLoading ? (
            <p className="px-6 py-8 text-center text-gray-400 text-sm">{productCopy.leadEmptyState}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-500">Name</th>
                    <th className="px-6 py-3 font-medium text-gray-500">Email</th>
                    {config.slug === "saas-booker" && (
                      <>
                        <th className="px-6 py-3 font-medium text-gray-500">Score</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Source</th>
                      </>
                    )}
                    {config.slug === "saas-leadqualifier" && (
                      <>
                        <th className="px-6 py-3 font-medium text-gray-500">Score</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Why</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Next Step</th>
                      </>
                    )}
                    {config.slug === "saas-followup" && (
                      <>
                        <th className="px-6 py-3 font-medium text-gray-500">Status</th>
                        <th className="px-6 py-3 font-medium text-gray-500">Source</th>
                      </>
                    )}
                    <th className="px-6 py-3 font-medium text-gray-500">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leads.map((lead) => (
                    <tr key={lead.id}
                      onClick={() => navigate(`/leads/${lead.id}`)}
                      className="hover:bg-gray-50 cursor-pointer">
                      <td className="px-6 py-3 font-medium text-gray-900">{lead.name}</td>
                      <td className="px-6 py-3 text-gray-600">{lead.email}</td>
                      {config.slug === "saas-booker" && (
                        <>
                          <td className="px-6 py-3"><ScoreBadge score={lead.score} /></td>
                          <td className="px-6 py-3"><StatusBadge status={lead.status} /></td>
                          <td className="px-6 py-3 text-gray-600">{lead.source}</td>
                        </>
                      )}
                      {config.slug === "saas-leadqualifier" && (
                        <>
                          <td className="px-6 py-3"><ScoreBadge score={lead.score} /></td>
                          <td className="px-6 py-3 text-gray-600 max-w-[200px] truncate">
                            {lead.qualificationReason || "—"}
                          </td>
                          <td className="px-6 py-3 text-gray-600">
                            {(lead.metadata as Record<string, unknown>)?.nextAction as string || "—"}
                          </td>
                        </>
                      )}
                      {config.slug === "saas-followup" && (
                        <>
                          <td className="px-6 py-3"><StatusBadge status={lead.status} /></td>
                          <td className="px-6 py-3 text-gray-600">{lead.source}</td>
                        </>
                      )}
                      <td className="px-6 py-3 text-gray-400 text-xs">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}

function ScoreBadge({ score }: { score?: number | null }) {
  if (score == null) return <span className="text-gray-400">—</span>;
  const color = score >= 80 ? "bg-green-100 text-green-800" : score >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{score}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    new: "bg-gray-100 text-gray-800",
    qualified: "bg-green-100 text-green-800",
    converted: "bg-blue-100 text-blue-800",
    unqualified: "bg-red-100 text-red-800",
    contacted: "bg-yellow-100 text-yellow-800",
    meeting_scheduled: "bg-purple-100 text-purple-800",
    lost: "bg-red-100 text-red-800",
  };
  const color = colors[status] || "bg-gray-100 text-gray-800";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{status}</span>;
}
