import { ZodError } from "zod";

export function formatError(e: unknown): string {
  if (e instanceof ZodError) {
    return e.issues.map((err: { message: string }) => err.message).join(", ");
  }
  if (e instanceof Error) {
    if (e.message.includes("Unique constraint")) {
      return "A record with that value already exists.";
    }
    return e.message;
  }
  return "An unexpected error occurred.";
}
