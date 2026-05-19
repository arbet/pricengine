import { describe, it, expect } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/v1/pricing/route";
import { makeOrgWithKey, makeTest } from "./helpers";

function postRequest(
  body: unknown,
  opts: { key?: string; ip: string }
) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-forwarded-for": opts.ip,
  };
  if (opts.key) headers.authorization = `Bearer ${opts.key}`;
  return new NextRequest("http://localhost/api/v1/pricing", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

describe("POST /api/v1/pricing", () => {
  it("rejects a request with no API key", async () => {
    const res = await POST(postRequest({ organization: "X", test_ids: ["T-1"] }, { ip: "10.0.0.1" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid API key", async () => {
    await makeOrgWithKey();
    const res = await POST(
      postRequest({ organization: "X", test_ids: ["T-1"] }, { key: "bogus", ip: "10.0.0.2" })
    );
    expect(res.status).toBe(401);
  });

  it("prices a panel for a valid key and known tests", async () => {
    const { org, plainKey } = await makeOrgWithKey();
    const test = await makeTest(org.id, { testId: "T-CBC", listPrice: 80, reagentCost: 6 });

    const res = await POST(
      postRequest(
        { organization: org.code, test_ids: [test.testId] },
        { key: plainKey, ip: "10.0.0.3" }
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.total_price).toBeGreaterThan(0);
    expect(body.breakdown.anchor_test.test_id).toBe("T-CBC");
  });

  it("returns 404 when a requested test id does not exist", async () => {
    const { org, plainKey } = await makeOrgWithKey();
    const res = await POST(
      postRequest(
        { organization: org.code, test_ids: ["T-DOES-NOT-EXIST"] },
        { key: plainKey, ip: "10.0.0.4" }
      )
    );
    expect(res.status).toBe(404);
  });

  it("rate limits a single IP after 60 requests/minute", async () => {
    const ip = "203.0.113.99";
    let lastStatus = 0;
    for (let i = 0; i < 60; i++) {
      const res = await POST(postRequest({ organization: "X", test_ids: ["T-1"] }, { key: "bogus", ip }));
      lastStatus = res.status;
    }
    // first 60 are processed (and fail auth), the 61st is throttled
    expect(lastStatus).toBe(401);
    const throttled = await POST(
      postRequest({ organization: "X", test_ids: ["T-1"] }, { key: "bogus", ip })
    );
    expect(throttled.status).toBe(429);
    expect(throttled.headers.get("Retry-After")).toBeTruthy();
  });
});
