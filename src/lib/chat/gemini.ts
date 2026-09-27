import "server-only";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export class GeminiError extends Error {
  constructor(
    public status: number,
    detail: string,
  ) {
    super(`Gemini request failed (${status}): ${detail}`);
  }
}

type GeminiPart = { text?: string; thought?: boolean };
type GeminiChunk = { candidates?: { content?: { parts?: GeminiPart[] } }[] };

function extractText(json: GeminiChunk) {
  return (
    json.candidates?.[0]?.content?.parts
      ?.filter((p) => !p.thought)
      .map((p) => p.text ?? "")
      .join("") ?? ""
  );
}

/**
 * Calls Gemini's streaming endpoint and returns a stream of plain UTF-8 text
 * (the SSE envelope is unwrapped here so the browser just appends chunks).
 */
export async function streamGemini({
  apiKey,
  model,
  system,
  messages,
  signal,
}: {
  apiKey: string;
  model: string;
  system: string;
  messages: ChatMessage[];
  signal?: AbortSignal;
}): Promise<ReadableStream<Uint8Array>> {
  const base = (process.env.GEMINI_API_BASE_URL || "https://generativelanguage.googleapis.com/v1beta").replace(/\/$/, "");
  const url = `${base}/models/${encodeURIComponent(model)}:streamGenerateContent?alt=sse`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: messages.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.4, maxOutputTokens: 1024 },
    }),
    signal,
    cache: "no-store",
  });

  if (!response.ok || !response.body) {
    const detail = await response.text().catch(() => "");
    throw new GeminiError(response.status, detail.slice(0, 300));
  }

  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";

  const flushEvents = (controller: TransformStreamDefaultController<Uint8Array>, final: boolean) => {
    const events = buffer.split(/\r?\n\r?\n/);
    buffer = final ? "" : (events.pop() ?? "");
    for (const event of events) {
      for (const line of event.split(/\r?\n/)) {
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        try {
          const text = extractText(JSON.parse(data) as GeminiChunk);
          if (text) controller.enqueue(encoder.encode(text));
        } catch {
          // ignore keep-alives / partial frames
        }
      }
    }
  };

  return response.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        flushEvents(controller, false);
      },
      flush(controller) {
        buffer += decoder.decode();
        flushEvents(controller, true);
      },
    }),
  );
}
