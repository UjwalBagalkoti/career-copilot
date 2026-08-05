const MODEL = "gemini-2.5-flash"; // free-tier model; swap in ai.google.dev/gemini-api/docs/models if this one is retired

export async function callGemini(system, userContent) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set. Add it in your Vercel project's Environment Variables.");
  }
  const parts = typeof userContent === "string" ? [{ text: userContent }] : userContent;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts }],
        generationConfig: { temperature: 0.3 },
      }),
    }
  );

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error.message || "Gemini API error");
  }
  const candidate = data.candidates && data.candidates[0];
  const text = (candidate?.content?.parts || []).map((p) => p.text || "").join("\n");
  if (!text) {
    throw new Error(
      "Gemini returned no content" + (candidate?.finishReason ? ` (finishReason: ${candidate.finishReason})` : "")
    );
  }
  return text;
}

export function parseJSON(text) {
  const cleaned = text.replace(/```json/g, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{") === -1 ? cleaned.indexOf("[") : cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}") === -1 ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  const slice = start >= 0 && end >= 0 ? cleaned.slice(start, end + 1) : cleaned;
  return JSON.parse(slice);
}

export function buildResumeContent({ resumeText, resumePdfBase64 }, instruction) {
  if (resumePdfBase64) {
    return [
      { inline_data: { mime_type: "application/pdf", data: resumePdfBase64 } },
      { text: instruction },
    ];
  }
  return [{ text: `RESUME:\n${resumeText || ""}\n\n${instruction}` }];
}
