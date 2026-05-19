import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { formatError } from "@/lib/db/actions/utils";

const GENERIC = "Something went wrong. Please try again.";

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => {
  vi.restoreAllMocks();
});

describe("formatError", () => {
  it("joins Zod validation messages", () => {
    const result = z.object({ name: z.string().min(1, "Name is required") }).safeParse({ name: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(formatError(result.error)).toContain("Name is required");
    }
  });

  it("maps unique-constraint errors to a friendly message", () => {
    const msg = formatError(new Error("Unique constraint failed on the fields: (`email`)"));
    expect(msg).toBe("A record with that value already exists.");
  });

  it("passes through allowlisted safe messages", () => {
    expect(formatError(new Error("Unauthorized"))).toBe("Unauthorized");
    expect(formatError(new Error("Forbidden"))).toBe("Forbidden");
    expect(formatError(new Error("Invalid test selection"))).toBe("Invalid test selection");
  });

  it("replaces unexpected error messages with a generic message", () => {
    const leaky = new Error('relation "users" column "password_hash" violates ...');
    expect(formatError(leaky)).toBe(GENERIC);
    expect(console.error).toHaveBeenCalled();
  });

  it("returns the generic message for non-Error values", () => {
    expect(formatError("a raw string")).toBe(GENERIC);
    expect(formatError(undefined)).toBe(GENERIC);
  });
});
