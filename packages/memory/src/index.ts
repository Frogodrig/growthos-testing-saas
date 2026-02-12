import { Prisma, PrismaClient } from "@prisma/client";

// ──────────────────────────────────────────────
// Layer 1: Session Memory (in-process short-term)
// ──────────────────────────────────────────────

interface SessionEntry {
  data: Record<string, unknown>;
  createdAt: number;
  ttlMs: number;
}

export class SessionMemory {
  private store: Map<string, SessionEntry> = new Map();

  set(key: string, data: Record<string, unknown>, ttlMs = 300_000): void {
    this.store.set(key, { data, createdAt: Date.now(), ttlMs });
  }

  get(key: string): Record<string, unknown> | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > entry.ttlMs) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  clear(key: string): void {
    this.store.delete(key);
  }
}

// ──────────────────────────────────────────────
// Layer 2: Entity Memory (persistent via Prisma)
// ──────────────────────────────────────────────

export class EntityMemory {
  constructor(private prisma: PrismaClient) {}

  async getLead(tenantId: string, leadId: string) {
    return this.prisma.lead.findFirst({
      where: { id: leadId, tenantId },
      include: { meetings: true, messages: true },
    });
  }

  async getWorkflow(tenantId: string, workflowId: string) {
    return this.prisma.workflow.findFirst({
      where: { id: workflowId, tenantId },
      include: { agentLogs: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
  }

  async getLeadHistory(tenantId: string, leadId: string) {
    const [messages, meetings, workflows] = await Promise.all([
      this.prisma.message.findMany({ where: { tenantId, leadId }, orderBy: { sentAt: "desc" }, take: 20 }),
      this.prisma.meeting.findMany({ where: { tenantId, leadId }, orderBy: { createdAt: "desc" }, take: 5 }),
      this.prisma.workflow.findMany({ where: { tenantId, leadId }, orderBy: { createdAt: "desc" }, take: 5 }),
    ]);
    return { messages, meetings, workflows };
  }
}

// ──────────────────────────────────────────────
// Layer 3: Pattern Memory (aggregated insights)
// ──────────────────────────────────────────────

export class PatternMemory {
  constructor(private prisma: PrismaClient) {}

  async recordInsight(tenantId: string, insightType: string, data: Prisma.InputJsonValue) {
    return this.prisma.patternInsight.create({
      data: { tenantId, insightType, data },
    });
  }

  async getInsights(tenantId: string, insightType?: string) {
    return this.prisma.patternInsight.findMany({
      where: {
        tenantId,
        ...(insightType ? { insightType } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

// ──────────────────────────────────────────────
// Unified Memory System
// ──────────────────────────────────────────────

export class MemorySystem {
  public session: SessionMemory;
  public entity: EntityMemory;
  public pattern: PatternMemory;

  constructor(prisma: PrismaClient) {
    this.session = new SessionMemory();
    this.entity = new EntityMemory(prisma);
    this.pattern = new PatternMemory(prisma);
  }
}

export function createMemorySystem(prisma: PrismaClient): MemorySystem {
  return new MemorySystem(prisma);
}
