const MODEL = "gemini-3.8-flash";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

export async function callGemini(system, userContent) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Add it in your Vercel project Environment Variables.");
  const input = typeof userContent === "string" ? [{ type: "text", text: userContent }] : userContent;

  const response = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model: MODEL,
      system_instruction: system,
      input,
      generation_config: { thinking_level: "low" },
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.error) {
    const message = data?.error?.message || data?.errors?.[0]?.message || "Gemini API request failed (" + response.status + ")";
    throw new Error(message);
  }

  const text = data.output_text || (data.steps || [])
    .filter((step) => step.type === "model_output")
    .flatMap((step) => step.content || [])
    .filter((part) => part.type === "text")
    .map((part) => part.text || "")
    .join("\n");

  if (!text.trim()) throw new Error("Gemini returned no content.");
  return text;
}

export function parseJSON(text) {
  const cleaned = String(text).replace(/^\s*```json\s*/i, "").replace(/^\s*```\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  try { return JSON.parse(cleaned); }
  catch {
    const objectStart = cleaned.indexOf("{");
    const arrayStart = cleaned.indexOf("[");
    const start = objectStart === -1 ? arrayStart : arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start < 0 || end < start) throw new Error("Gemini returned invalid JSON.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export function buildResumeContent({ resumeText, resumePdfBase64 }, instruction) {
  if (resumePdfBase64) return [
    { type: "document", mime_type: "application/pdf", data: resumePdfBase64 },
    { type: "text", text: instruction },
  ];
  return [{ type: "text", text: "RESUME:\n" + (resumeText || "") + "\n\n" + instruction }];
}
