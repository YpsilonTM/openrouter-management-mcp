import { z } from "zod";

/** Drop keys whose value is `undefined` (keeps `null`). */
export function defined(
  obj: Record<string, unknown>,
): Record<string, unknown> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, v]) => v !== undefined),
  );
}

export const paginationSchema = {
  offset: z.number().int().min(0).optional().describe("Records to skip."),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max records (1-100)."),
};

export const workspaceIdSchema = z
  .string()
  .uuid()
  .describe("Workspace UUID (from openrouter_list_workspaces).");

export const workspaceRefSchema = z
  .string()
  .min(1)
  .describe("Workspace UUID or slug (from openrouter_list_workspaces).");

export const uuidSchema = z.string().uuid();

export const confirmSchema = z
  .literal(true)
  .describe("Must be true to confirm this destructive action.");

export const stringListNullable = z
  .array(z.string().min(1))
  .min(1)
  .nullable()
  .optional();

export const uuidList = z.array(z.string().uuid()).optional();

export const dataRegionsSchema = z
  .array(z.enum(["global", "europe", "us"]))
  .min(1)
  .nullable()
  .optional()
  .describe(
    "Ingress regions: global=openrouter.ai, europe=eu.openrouter.ai, us=us.openrouter.ai. null = unrestricted.",
  );

export const guardrailResetSchema = z
  .enum(["daily", "weekly", "monthly"])
  .nullable()
  .optional()
  .describe("Budget reset interval; null clears with limit_usd null.");

export const budgetIntervalSchema = z
  .enum(["daily", "weekly", "monthly", "lifetime"])
  .describe("Budget interval. `lifetime` never resets.");

export const policyTypeSchema = z.enum([
  "budget",
  "model_availability",
  "moderation",
  "rate_limit",
]);

export const jsonObject = z
  .record(z.unknown())
  .describe("JSON object passed through to the OpenRouter API.");

export const jsonValue = z.unknown().describe("Arbitrary JSON value.");
