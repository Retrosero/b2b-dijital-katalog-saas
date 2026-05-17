import { PrismaClient } from "@prisma/client";
import { Request } from "express";
import { randomUUID } from "crypto";

type AuditSeverity = "info" | "warning" | "error" | "critical";
type AuditStatus = "success" | "failed" | "blocked";

type AuditEventInput = {
  tenantId?: string | null;
  userId?: string | null;
  userName?: string | null;
  userRole?: string | null;
  module: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  entityName?: string | null;
  description?: string | null;
  status?: AuditStatus;
  severity?: AuditSeverity;
  ipAddress?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

const SENSITIVE_KEY_PATTERN = /(password|pass|token|refresh_token|refreshToken|secret|secret_key|api_key|apiKey|access_key|accessKey|private|credential|authorization|cookie|r2_secret)/i;
const MAX_DEPTH = 6;

export function maskSensitiveData(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) return value;
  if (depth > MAX_DEPTH) return "[Truncated]";
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map((item) => maskSensitiveData(item, depth + 1));
  if (typeof value !== "object") return value;

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, unknown>>((acc, [key, item]) => {
    acc[key] = SENSITIVE_KEY_PATTERN.test(key) ? "[REDACTED]" : maskSensitiveData(item, depth + 1);
    return acc;
  }, {});
}

export function getAuditRequestContext(req: Request) {
  const forwardedFor = req.headers["x-forwarded-for"];
  const ipAddress = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : String(forwardedFor || req.socket.remoteAddress || req.ip || "").split(",")[0].trim();

  return {
    tenantId: req.user?.tenantId || null,
    userId: req.user?.userId || null,
    userName: req.user?.name || null,
    userRole: req.user?.role || null,
    ipAddress: ipAddress || null,
    userAgent: req.headers["user-agent"] || null
  };
}

export async function writeAuditLog(prisma: PrismaClient, input: AuditEventInput) {
  if (process.env.AUDIT_LOG_ENABLED === "false") return;

  try {
    const data = {
      tenantId: input.tenantId || null,
      userId: input.userId || null,
      userName: input.userName || null,
      userRole: input.userRole || null,
      module: input.module,
      action: input.action,
      entityType: input.entityType || null,
      entityId: input.entityId || null,
      entityName: input.entityName || null,
      description: input.description || null,
      status: input.status || "success",
      severity: input.severity || "info",
      ipAddress: input.ipAddress || null,
      userAgent: input.userAgent || null,
      metadata: input.metadata === undefined ? undefined : maskSensitiveData(input.metadata)
    };

    if ((prisma as any).auditLog?.create) {
      await (prisma as any).auditLog.create({ data });
      return;
    }

    await prisma.$executeRaw`
      INSERT INTO AuditLog (
        id, tenantId, userId, userName, userRole, module, action, entityType, entityId, entityName,
        description, status, severity, ipAddress, userAgent, metadata, createdAt
      ) VALUES (
        ${randomUUID()}, ${data.tenantId}, ${data.userId}, ${data.userName}, ${data.userRole},
        ${data.module}, ${data.action}, ${data.entityType}, ${data.entityId}, ${data.entityName},
        ${data.description}, ${data.status}, ${data.severity}, ${data.ipAddress}, ${data.userAgent},
        ${data.metadata === undefined ? null : JSON.stringify(data.metadata)}, NOW()
      )
    `;
  } catch (error) {
    console.error("[AuditLogError]", error);
  }
}

export async function writeRequestAuditLog(prisma: PrismaClient, req: Request, input: Omit<AuditEventInput, "tenantId" | "userId" | "userName" | "userRole" | "ipAddress" | "userAgent"> & Partial<AuditEventInput>) {
  await writeAuditLog(prisma, {
    ...getAuditRequestContext(req),
    ...input
  });
}
