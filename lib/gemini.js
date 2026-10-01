const PRIMARY_MODEL = "gemini-3.8-flash";
const FALLBACK_MODEL = "gemini-3.7-flash";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";
const MAX_RETRIES = 2;
const RETRY_DELAYS_MS = [1500, 3500];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isTemporaryFailure(status, message = "") {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504 ||
    /high demand|overload|temporarily|rate.?limit|unavailable|try again later/i.test(message);
}

async function requestInteraction(model, system, input, apiKey) {
  const response = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
    body: JSON.stringify({
      model,
      system_instruction: system,
      input,
      generation_config: { thinking_level: "low" },
    }),
  });

  const data = await response.json().catch(() => ({}));
  const message = data?.error?.message || data?.errors?.[0]?.message || "";

  if (!response.ok || data.error) {
    const error = new Error(message || "Gemini API request failed (" + response.status + ")");
    error.status = response.status;
    error.temporary = isTemporaryFailure(response.status, message);
    throw error;
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

export async function callGemini(system, userContent) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY is not set. Add it to the Render service environment variables.");

  const input = typeof userContent === "string"
    ? [{ type: "text", text: userContent }]
    : userContent;

  let lastError = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await requestInteraction(PRIMARY_MODEL, system, input, apiKey);
    } catch (error) {
      lastError = error;
      if (!error.temporary || attempt === MAX_RETRIES) break;
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }

  if (lastError?.temporary) {
    try {
      return await requestInteraction(FALLBACK_MODEL, system, input, apiKey);
    } catch (fallbackError) {
      lastError = fallbackError;
    }
  }

  if (lastError?.temporary) {
    throw new Error("Gemini is temporarily busy. Please wait a few seconds and try again.");
  }
  throw lastError || new Error("Gemini API request failed.");
}

export function parseJSON(text) {
  const cleaned = String(text)
    .replace(/^\s*\`\`\`json\s*/i, "")
    .replace(/^\s*\`\`\`\s*/i, "")
    .replace(/\s*\`\`\`\s*$/i, "")
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const objectStart = cleaned.indexOf("{");
    const arrayStart = cleaned.indexOf("[");
    const start = objectStart === -1 ? arrayStart :
      arrayStart === -1 ? objectStart : Math.min(objectStart, arrayStart);
    const end = Math.max(cleaned.lastIndexOf("}"), cleaned.lastIndexOf("]"));
    if (start < 0 || end < start) throw new Error("Gemini returned invalid JSON.");
    return JSON.parse(cleaned.slice(start, end + 1));
  }
}

export function buildResumeContent({ resumeText, resumePdfBase64 }, instruction) {
  if (resumePdfBase64) {
    return [
      { type: "document", mime_type: "application/pdf", data: resumePdfBase64 },
      { type: "text", text: instruction },
    ];
  }

  return [{
    type: "text",
    text: "RESUME:\n" + (resumeText || "") + "\n\n" + instruction,
  }];
}
