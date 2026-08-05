import { callGemini, parseJSON, buildResumeContent } from "../lib/gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { resumeText, resumePdfBase64, jdText } = req.body || {};
    if ((!resumeText || !resumeText.trim()) && !resumePdfBase64) {
      return res.status(400).json({ error: "Resume is required." });
    }
    if (!jdText || !jdText.trim()) {
      return res.status(400).json({ error: "Job description is required." });
    }

    const system =
      "You are a precise technical recruiter. Compare a resume against a job description. Respond ONLY with strict JSON, no preamble, no markdown fences, matching this shape: " +
      '{"score": <integer 0-100>, "matched": [<short skill/requirement strings, max 8>], "missing": [<short skill/requirement strings, max 8>], "suggestions": [<short actionable bullet-rewrite tips, max 5>]}';
    const instruction = `JOB DESCRIPTION:\n${jdText}\n\nCompare the resume above/attached against this job description and return the JSON described in the system prompt.`;
    const userContent = buildResumeContent({ resumeText, resumePdfBase64 }, instruction);

    const raw = await callGemini(system, userContent);
    res.status(200).json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
