import { z } from "zod";
import { buildSystemPrompt } from "@/lib/chat/knowledge";
import { streamGemini } from "@/lib/chat/gemini";
import { offlineAnswer } from "@/lib/chat/offline";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const maxDuration = 30;

const DEFAULT_MODEL = "gemini-3.5-flash-lite";

const bodySchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(2000),
      }),
    )
    .min(1)
    .max(40),
});

function textResponse(text: string, mode: "offline" | "gemini", status = 200) {
  return new Response(text, {
    status,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Assistant-Mode": mode },
  });
}

export async function POST(request: Request) {
  const limit = rateLimit(`chat:${clientIp(request)}`, { limit: 20, windowMs: 5 * 60_000 });
  if (!limit.ok) {
    return Response.json(
      { error: `You're sending messages quickly — please wait ${limit.retryAfter}s and try again.` },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter) } },
    );
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "Invalid chat request." }, { status: 400 });
  }

  // Keep the last few turns; the knowledge base already carries the context.
  const messages = parsed.data.messages.slice(-12);
  if (messages[0]?.role === "assistant") messages.shift();
  const last = messages[messages.length - 1];
  if (!last || last.role !== "user") {
    return Response.json({ error: "The last message must come from the user." }, { status: 400 });
  }

  const knowledge = await buildSystemPrompt();
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return textResponse(offlineAnswer(last.content, knowledge), "offline");
  }

  try {
    const stream = await streamGemini({
      apiKey,
      model: process.env.GEMINI_MODEL || DEFAULT_MODEL,
      system: knowledge.prompt,
      messages,
      signal: request.signal,
    });
    return new Response(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Assistant-Mode": "gemini" },
    });
  } catch (error) {
    console.error("[chat] Gemini unavailable, using offline answers:", error);
    return textResponse(offlineAnswer(last.content, knowledge), "offline");
  }
}
