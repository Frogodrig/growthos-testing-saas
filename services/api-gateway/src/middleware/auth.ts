import { FastifyRequest, FastifyReply } from "fastify";
import jwt from "jsonwebtoken";
import type { AuthPayload } from "@growthos/shared-types";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    reply.status(401).send({ error: "Missing or invalid authorization header" });
    return;
  }

  const token = authHeader.slice(7);

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    (request as any).auth = payload;
  } catch {
    reply.status(401).send({ error: "Invalid or expired token" });
  }
}

export function getAuth(request: FastifyRequest): AuthPayload {
  return (request as any).auth;
}

export function generateToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "24h" });
}
