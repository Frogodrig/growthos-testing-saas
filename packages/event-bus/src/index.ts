import { Queue, Worker, Job } from "bullmq";
import type { DomainEvent, EventType } from "@growthos/shared-types";

export interface EventBusConfig {
  redisUrl: string;
}

type EventHandler = (event: DomainEvent) => Promise<void>;

function parseRedisUrl(url: string): { host: string; port: number } {
  const parsed = new URL(url);
  return {
    host: parsed.hostname || "localhost",
    port: parseInt(parsed.port || "6379", 10),
  };
}

export class EventBus {
  private queues: Map<string, Queue> = new Map();
  private workers: Map<string, Worker> = new Map();
  private connectionOpts: { host: string; port: number };

  constructor(private config: EventBusConfig) {
    this.connectionOpts = parseRedisUrl(config.redisUrl);
  }

  private getQueue(eventType: EventType): Queue {
    if (!this.queues.has(eventType)) {
      this.queues.set(
        eventType,
        new Queue(eventType, { connection: this.connectionOpts })
      );
    }
    return this.queues.get(eventType)!;
  }

  async publish(event: DomainEvent): Promise<void> {
    const queue = this.getQueue(event.type);
    try {
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("EventBus publish timeout (5s)")), 5000)
      );
      await Promise.race([
        queue.add(event.type, event, {
          removeOnComplete: 1000,
          removeOnFail: 5000,
        }),
        timeout,
      ]);
      console.log(`[EventBus] Published: ${event.type} tenant=${event.tenantId}`);
    } catch (err) {
      console.error(`[EventBus] Failed to publish ${event.type}: ${err instanceof Error ? err.message : err}`);
    }
  }

  subscribe(eventType: EventType, handler: EventHandler): void {
    if (this.workers.has(eventType)) {
      throw new Error(`Handler already registered for ${eventType}`);
    }

    const worker = new Worker(
      eventType,
      async (job: Job<DomainEvent>) => {
        console.log(`[EventBus] Processing: ${eventType} id=${job.data.id}`);
        await handler(job.data);
      },
      { connection: this.connectionOpts }
    );

    worker.on("failed", (job, err) => {
      console.error(`[EventBus] Failed: ${eventType} id=${job?.data?.id}`, err.message);
    });

    this.workers.set(eventType, worker);
    console.log(`[EventBus] Subscribed to: ${eventType}`);
  }

  async shutdown(): Promise<void> {
    for (const [, worker] of this.workers) {
      await worker.close();
    }
    for (const [, queue] of this.queues) {
      await queue.close();
    }
    console.log("[EventBus] Shut down.");
  }
}

export function createEventBus(config: EventBusConfig): EventBus {
  return new EventBus(config);
}
