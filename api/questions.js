import { callGemini, parseJSON, buildResumeContent } from "../lib/gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { resumeText, resumePdfBase64, jdText } = req.body || {};
    if (!jdText || !jdText.trim()) {
      return res.status(400).json({ error: "Job description is required." });
    }

    const system =
      'You are an interview panel lead. Given a job description (and optionally a resume), generate likely interview questions. Respond ONLY with strict JSON: an array of up to 8 objects shaped {"category": <string, e.g. Technical, Behavioral, System Design>, "question": <string>}. No markdown fences, no preamble.';
    const instruction = `JOB DESCRIPTION:\n${jdText}\n\nUse the resume above/attached as optional context if present. Generate the questions described in the system prompt.`;
    const hasResume = Boolean((resumeText && resumeText.trim()) || resumePdfBase64);
    const userContent = hasResume ? buildResumeContent({ resumeText, resumePdfBase64 }, instruction) : instruction;

    const raw = await callGemini(system, userContent);
    res.status(200).json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
