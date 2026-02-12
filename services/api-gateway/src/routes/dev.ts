import { FastifyInstance } from "fastify";
import { CoreEngine } from "@growthos/core-engine";
import { generateToken } from "../middleware/auth";

// Development-only routes for bootstrapping test data.
// These should NOT be exposed in production.

export function registerDevRoutes(app: FastifyInstance, engine: CoreEngine): void {
  // Create a test tenant and return a JWT for immediate API access
  app.post("/dev/bootstrap", async (request, reply) => {
    const { tenantName, userEmail } = request.body as {
      tenantName?: string;
      userEmail?: string;
    };

    const name = tenantName || "Test Tenant";
    const email = userEmail || "admin@test.com";

    // Create tenant
    const tenant = await engine.prisma.tenant.create({
      data: {
        name,
        domain: name.toLowerCase().replace(/\s+/g, "-") + ".test",
        plan: "pro",
      },
    });

    // Create admin user
    const user = await engine.prisma.user.create({
      data: {
        tenantId: tenant.id,
        email,
        name: "Admin",
        role: "admin",
      },
    });

    // Generate JWT
    const token = generateToken({
      userId: user.id,
      tenantId: tenant.id,
      role: "admin",
    });

    console.log(`[Dev] Bootstrapped tenant="${name}" id=${tenant.id}`);

    return reply.status(201).send({
      tenant,
      user,
      token,
      usage: `curl -H "Authorization: Bearer ${token}" http://localhost:3001/api/leads`,
    });
  });
}
