import { subscribeSandboxSession } from "@/lib/sandbox/event-stream";
import { sandboxController, serializeSandboxSession } from "@/lib/sandbox/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: Promise<{ sessionId: string }> };

const TERMINAL = new Set(["COMPLETED", "FAILED", "CANCELLED"]);

export async function GET(request: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = sandboxController.getSession(sessionId);
  if (!session) {
    return new Response(JSON.stringify({ error: "session_not_found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let closed = false;

  const stream = new ReadableStream({
    start(controller) {
      const send = (payload: unknown) => {
        if (closed) {
          return;
        }
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };

      send({
        type: "session",
        session: serializeSandboxSession(session),
      });

      unsubscribe = subscribeSandboxSession(sessionId, ({ session: updated, event }) => {
        send({
          type: "session",
          session: serializeSandboxSession(updated),
          event,
        });
        if (TERMINAL.has(updated.lifecycleStatus)) {
          closed = true;
          unsubscribe?.();
          controller.close();
        }
      });

      const heartbeat = setInterval(() => {
        if (closed) {
          clearInterval(heartbeat);
          return;
        }
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15_000);

      request.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(heartbeat);
        unsubscribe?.();
        try {
          controller.close();
        } catch {
          /* ignore */
        }
      });
    },
    cancel() {
      closed = true;
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
