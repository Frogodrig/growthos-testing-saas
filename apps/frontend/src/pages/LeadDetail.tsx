import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../lib/api";
import { productCopy } from "../lib/product";
import { Layout } from "../components/Layout";

interface AgentLog {
  id: string;
  agentType: string;
  success: boolean;
  durationMs: number;
  output: Record<string, unknown>;
  error?: string | null;
  createdAt: string;
}

interface Workflow {
  id: string;
  workflowType: string;
  currentState: string;
  goal: string;
  createdAt: string;
  agentLogs: AgentLog[];
}

interface Meeting {
  id: string;
  scheduledAt: string;
  duration: number;
  status: string;
}

interface Message {
  id: string;
  direction: string;
  channel: string;
  content: string;
  sentAt: string;
}

interface LeadData {
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
  meetings: Meeting[];
  messages: Message[];
  workflows: Workflow[];
}

export function LeadDetail() {
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadData | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState("");

  const fetchLead = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await api<{ lead: LeadData }>(`/api/leads/${id}`);
      setLead(data.lead);
    } catch {
      setError("Failed to load lead.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  async function handleProcess() {
    if (!id) return;
    setProcessing(true);
    try {
      await api(`/api/leads/${id}/process`, { method: "POST" });
      await fetchLead();
    } catch {
      setError("Processing failed.");
    } finally {
      setProcessing(false);
    }
  }

  if (loading) {
    return (
      <Layout>
        <p className="text-gray-400 text-center py-12">Loading...</p>
      </Layout>
    );
  }

  if (!lead) {
    return (
      <Layout>
        <p className="text-red-600 text-center py-12">{error || "Lead not found."}</p>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">{lead.name}</h1>
          <div className="flex items-center gap-3">
            <button onClick={handleProcess} disabled={processing}
              className="text-sm px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50">
              {processing ? "Processing..." : productCopy.processButtonLabel}
            </button>
            <Link to="/leads" className="text-sm text-blue-600 hover:underline">Back to {productCopy.leadListTitle}</Link>
          </div>
        </div>

        {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">{error}</p>}

        {/* Lead Info */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Lead Info</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Email</span>
              <p className="text-gray-900">{lead.email}</p>
            </div>
            {lead.phone && (
              <div>
                <span className="text-gray-500">Phone</span>
                <p className="text-gray-900">{lead.phone}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Source</span>
              <p className="text-gray-900">{lead.source}</p>
            </div>
            <div>
              <span className="text-gray-500">Status</span>
              <p className="text-gray-900">{lead.status}</p>
            </div>
            <div>
              <span className="text-gray-500">Score</span>
              <p>{lead.score != null ? <ScoreBadge score={lead.score} /> : <span className="text-gray-400">—</span>}</p>
            </div>
            {lead.qualificationReason && (
              <div className="col-span-2">
                <span className="text-gray-500">Qualification Reason</span>
                <p className="text-gray-900">{lead.qualificationReason}</p>
              </div>
            )}
            <div>
              <span className="text-gray-500">Created</span>
              <p className="text-gray-900">{new Date(lead.createdAt).toLocaleString()}</p>
            </div>
            {Boolean(lead.metadata?.jobTitle) && (
              <div>
                <span className="text-gray-500">Job Title</span>
                <p className="text-gray-900">{String(lead.metadata!.jobTitle)}</p>
              </div>
            )}
            {Boolean(lead.metadata?.companySize) && (
              <div>
                <span className="text-gray-500">Company Size</span>
                <p className="text-gray-900">{String(lead.metadata!.companySize)}</p>
              </div>
            )}
            {Boolean(lead.metadata?.budgetRange) && (
              <div>
                <span className="text-gray-500">Budget Range</span>
                <p className="text-gray-900">{String(lead.metadata!.budgetRange)}</p>
              </div>
            )}
            {Boolean(lead.metadata?.timeline) && (
              <div>
                <span className="text-gray-500">Timeline</span>
                <p className="text-gray-900">{String(lead.metadata!.timeline)}</p>
              </div>
            )}
            {Boolean(lead.metadata?.linkedinUrl) && (
              <div>
                <span className="text-gray-500">LinkedIn</span>
                <p><a href={String(lead.metadata!.linkedinUrl)} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">View Profile</a></p>
              </div>
            )}
            {Boolean(lead.metadata?.intent) && (
              <div className="col-span-2">
                <span className="text-gray-500">Intent</span>
                <p className="text-gray-900">{String(lead.metadata!.intent)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Meetings */}
        {lead.meetings.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Meetings</h2>
            <table className="w-full text-sm">
              <thead className="text-left bg-gray-50">
                <tr>
                  <th className="px-4 py-2 font-medium text-gray-500">Scheduled At</th>
                  <th className="px-4 py-2 font-medium text-gray-500">Duration</th>
                  <th className="px-4 py-2 font-medium text-gray-500">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lead.meetings.map((m) => (
                  <tr key={m.id}>
                    <td className="px-4 py-2">{new Date(m.scheduledAt).toLocaleString()}</td>
                    <td className="px-4 py-2">{m.duration} min</td>
                    <td className="px-4 py-2">{m.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Messages */}
        {lead.messages.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">Messages</h2>
            <div className="space-y-3">
              {lead.messages.map((m) => (
                <div key={m.id} className="flex gap-3 text-sm">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.direction === "outbound" ? "bg-blue-100 text-blue-800" : "bg-gray-100 text-gray-800"}`}>
                    {m.direction}
                  </span>
                  <span className="text-gray-400 text-xs">{m.channel}</span>
                  <p className="text-gray-700 flex-1 truncate max-w-[400px]">{m.content}</p>
                  <span className="text-gray-400 text-xs whitespace-nowrap">{new Date(m.sentAt).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Processing Timeline */}
        {lead.workflows.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="font-semibold text-gray-900 mb-4">AI Processing Timeline</h2>
            <div className="space-y-6">
              {lead.workflows.map((wf) => (
                <div key={wf.id} className="border-l-2 border-gray-200 pl-4">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="font-medium text-gray-900">{wf.workflowType}</span>
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">{wf.currentState}</span>
                    <span className="text-xs text-gray-400">Goal: {wf.goal}</span>
                  </div>

                  {wf.agentLogs.length > 0 && (
                    <div className="space-y-3 ml-2">
                      {wf.agentLogs.map((log) => (
                        <div key={log.id} className="bg-gray-50 rounded-md p-3 text-sm">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="font-medium text-gray-800">{log.agentType}</span>
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${log.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                              {log.success ? "success" : "failed"}
                            </span>
                            <span className="text-xs text-gray-400">{log.durationMs}ms</span>
                            <span className="text-xs text-gray-400">{new Date(log.createdAt).toLocaleString()}</span>
                          </div>
                          {log.error && <p className="text-red-600 text-xs mb-1">{log.error}</p>}
                          <AgentOutputDisplay agentType={log.agentType} output={log.output} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}

function AgentOutputDisplay({ agentType, output }: { agentType: string; output: Record<string, unknown> }) {
  if (!output || Object.keys(output).length === 0) return null;

  const fields: { label: string; value: string }[] = [];

  if (agentType === "qualifier") {
    if (output.score != null) fields.push({ label: "Score", value: String(output.score) });
    if (output.qualificationReason) fields.push({ label: "Reason", value: String(output.qualificationReason) });
    if (output.nextAction) fields.push({ label: "Next Action", value: String(output.nextAction) });
  } else if (agentType === "scheduler") {
    if (output.meetingScheduled != null) fields.push({ label: "Meeting Scheduled", value: String(output.meetingScheduled) });
    if (output.proposedTime) fields.push({ label: "Proposed Time", value: String(output.proposedTime) });
    if (output.reason) fields.push({ label: "Reason", value: String(output.reason) });
  } else if (agentType === "followup") {
    if (output.message) fields.push({ label: "Message", value: String(output.message) });
    if (output.channel) fields.push({ label: "Channel", value: String(output.channel) });
    if (output.escalate != null) fields.push({ label: "Escalate", value: String(output.escalate) });
  }

  // Fallback: show all keys if no known agent type matched
  if (fields.length === 0) {
    for (const [key, value] of Object.entries(output)) {
      fields.push({ label: key, value: typeof value === "object" ? JSON.stringify(value) : String(value) });
    }
  }

  return (
    <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
      {fields.map((f) => (
        <div key={f.label} className="contents">
          <dt className="text-gray-500">{f.label}</dt>
          <dd className="text-gray-900">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-100 text-green-800" : score >= 50 ? "bg-yellow-100 text-yellow-800" : "bg-red-100 text-red-800";
  return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>{score}</span>;
}
