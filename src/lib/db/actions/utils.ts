import { ZodError } from "zod";

/**
 * Messages explicitly thrown by server actions that are safe to surface to the
 * client. Anything not in this set (Prisma/driver internals, unexpected errors)
 * is logged server-side and replaced with a generic message.
 */
const SAFE_MESSAGES = new Set([
  "Unauthorized",
  "Forbidden",
  "No organization",
  "No organization assigned",
  "Not found",
  "Panel not found",
  "Organization not found",
  "Invalid test selection",
  "No valid tests found",
]);

const GENERIC_MESSAGE = "Something went wrong. Please try again.";

export function formatError(e: unknown): string {
  if (e instanceof ZodError) {
    return e.issues.map((err: { message: string }) => err.message).join(", ");
  }
  if (e instanceof Error) {
    if (e.message.includes("Unique constraint")) {
      return "A record with that value already exists.";
    }
    if (SAFE_MESSAGES.has(e.message)) {
      return e.message;
    }
  }
  console.error("[server-action] unexpected error:", e);
  return GENERIC_MESSAGE;
}
