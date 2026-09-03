import Anthropic from "@anthropic-ai/sdk";
import { ASSISTANT_SYSTEM_PROMPT, answerLocally, renderContext } from "@/lib/assistant";
import type { AssistantContext } from "@/lib/assistant";

/**
 * The assistant endpoint.
 *
 * With ANTHROPIC_API_KEY set, the request is answered by Claude, streamed back
 * as plain text. Without one — the default for a fresh clone or a preview
 * deploy — the built-in rule engine answers instead, so the AI features are
 * never a dead end. The `x-assistant-engine` header tells the client which
 * one replied, and the UI labels the message accordingly.
 */

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = "claude-opus-5";
const MAX_HISTORY_TURNS = 12;
const MAX_MESSAGE_CHARS = 4000;

interface RequestBody {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  context: AssistantContext;
}

function textStream(text: string, engine: "local" | "claude"): Response {
  return new Response(text, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "x-assistant-engine": engine,
    },
  });
}

function isValidBody(value: unknown): value is RequestBody {
  if (!value || typeof value !== "object") return false;
  const body = value as Partial<RequestBody>;
  return (
    typeof body.message === "string" &&
    body.message.trim().length > 0 &&
    Array.isArray(body.history) &&
    typeof body.context === "object" &&
    body.context !== null
  );
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  if (!isValidBody(body)) {
    return new Response("Expected { message, history, context }", { status: 400 });
  }

  const message = body.message.slice(0, MAX_MESSAGE_CHARS);
  const context = body.context;
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return textStream(answerLocally(message, context), "local");
  }

  // Keep the transcript bounded — the grounding snapshot matters more than
  // deep history, and an unbounded transcript is an easy cost leak.
  const history = body.history
    .filter(
      (turn) =>
        (turn.role === "user" || turn.role === "assistant") &&
        typeof turn.content === "string" &&
        turn.content.trim().length > 0,
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) => ({
      role: turn.role,
      content: turn.content.slice(0, MAX_MESSAGE_CHARS),
    }));

  try {
    const client = new Anthropic({ apiKey });

    const stream = client.beta.messages.stream({
      model: MODEL,
      max_tokens: 8000,
      // The prompt is stable across requests, so it caches; the volatile
      // pipeline snapshot goes after the breakpoint, in the user turn.
      system: [
        {
          type: "text",
          text: ASSISTANT_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [
        ...history,
        {
          role: "user" as const,
          content: `${renderContext(context)}\n\n---\n\n${message}`,
        },
      ],
      // A sales chat wants a fast, direct answer rather than deep deliberation.
      output_config: { effort: "low" },
      // If a safety classifier declines the request, the server retries it on
      // an appropriate fallback model rather than returning nothing.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
    });

    const iterator = stream[Symbol.asyncIterator]();

    // Pull the first event before committing to a response, so an auth or rate
    // limit failure still falls back to the local engine instead of streaming
    // an empty reply.
    const first = await iterator.next();

    const encoder = new TextEncoder();
    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        let produced = false;

        const push = (event: Anthropic.Beta.BetaRawMessageStreamEvent) => {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            produced = true;
            controller.enqueue(encoder.encode(event.delta.text));
          }
          // Safety classifiers can decline a request with HTTP 200.
          if (event.type === "message_delta" && event.delta.stop_reason === "refusal") {
            controller.enqueue(
              encoder.encode(
                produced
                  ? "\n\n_The assistant stopped early on this request._"
                  : "I can't help with that request. Ask me about your pipeline, a specific deal, or an email draft.",
              ),
            );
            produced = true;
          }
        };

        try {
          if (!first.done && first.value) push(first.value);
          for (;;) {
            const next = await iterator.next();
            if (next.done) break;
            push(next.value);
          }
          if (!produced) {
            controller.enqueue(encoder.encode(answerLocally(message, context)));
          }
        } catch {
          controller.enqueue(
            encoder.encode(
              produced
                ? "\n\n_The connection dropped before the answer finished._"
                : answerLocally(message, context),
            ),
          );
        } finally {
          controller.close();
        }
      },
      cancel() {
        stream.abort();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
        "x-assistant-engine": "claude",
      },
    });
  } catch (error) {
    console.error("Assistant request failed, falling back to the local engine:", error);
    return textStream(answerLocally(message, context), "local");
  }
}
