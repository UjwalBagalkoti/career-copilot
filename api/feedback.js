import { callGemini, parseJSON } from "../lib/gemini.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { question, answer } = req.body || {};
    if (!question || !answer || !answer.trim()) {
      return res.status(400).json({ error: "Question and answer are required." });
    }

    const system =
      "You are a supportive but honest interview coach. Given a question and a candidate's spoken/written answer, respond ONLY with strict JSON shaped: " +
      '{"strengths": [<max 3 short strings>], "improvements": [<max 3 short strings>], "sample_answer": <a concise 3-5 sentence model answer>}';
    const user = `QUESTION: ${question}\n\nCANDIDATE ANSWER: ${answer}`;

    const raw = await callGemini(system, user);
    res.status(200).json(parseJSON(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
