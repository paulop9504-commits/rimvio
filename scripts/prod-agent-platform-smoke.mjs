/**
 * Prod smoke: goal-state write + osaka.lodging.basic composite run.
 * Usage: node scripts/prod-agent-platform-smoke.mjs
 */

const BASE = process.env.RIMVIO_PROD_URL ?? "https://rimvio.com";
const ts = new Date().toISOString().replace(/[:.]/g, "-");
const contextEventId = `hub:workspace:prod-smoke-${ts}`;

async function postJson(path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  return { status: res.status, json };
}

async function getJson(path) {
  const res = await fetch(`${BASE}${path}`);
  const json = await res.json();
  return { status: res.status, json };
}

async function main() {
  console.log("contextEventId:", contextEventId);

  const goalPost = await postJson(
    `/api/agent-platform/goal-state/${encodeURIComponent(contextEventId)}`,
    {
      goalKo: "Prod smoke test",
      percent: 25,
      status: "active",
      compositeLoopId: "osaka.lodging.basic",
    },
  );
  console.log("\n[1] POST goal-state:", goalPost.status, JSON.stringify(goalPost.json, null, 2));

  const goalGet = await getJson(
    `/api/agent-platform/goal-state/${encodeURIComponent(contextEventId)}`,
  );
  console.log("\n[2] GET goal-state:", goalGet.status, JSON.stringify(goalGet.json, null, 2));

  console.log("\n[3] POST composite/run (may take up to ~2 min)...");
  const composite = await postJson("/api/agent-platform/composite/run", {
    loopId: "osaka.lodging.basic",
    contextEventId,
    userRequest: "오사카 호텔 검색",
  });
  console.log("composite status:", composite.status);
  console.log(
    JSON.stringify(
      {
        ok: composite.json.ok,
        errorKo: composite.json.errorKo,
        stepsCompleted: composite.json.stepsCompleted,
        goalPercent: composite.json.goalPercent,
        workLogKo: composite.json.workLogKo,
        logs: composite.json.logs?.map((l) => ({
          capabilityId: l.capabilityId,
          ok: l.ok,
          errorKo: l.errorKo,
        })),
        lastInvoke: composite.json.lastInvoke
          ? {
              capabilityId: composite.json.lastInvoke.capabilityId,
              ok: composite.json.lastInvoke.ok,
              sandboxSessionId: composite.json.lastInvoke.sandboxSessionId,
              sandboxCompleted: composite.json.lastInvoke.output?.sandboxCompleted,
              hotelsFound: composite.json.lastInvoke.output?.hotelsFound,
            }
          : null,
      },
      null,
      2,
    ),
  );

  const goalAfter = await getJson(
    `/api/agent-platform/goal-state/${encodeURIComponent(contextEventId)}`,
  );
  console.log("\n[4] GET goal-state after composite:", JSON.stringify(goalAfter.json, null, 2));

  if (!goalPost.json.ok || !composite.json.ok) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
