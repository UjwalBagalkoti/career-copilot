# Career Copilot

An AI-powered job application assistant. Paste or upload a resume against a job description and get a match score, skill gaps, tailoring suggestions, likely interview questions, and live feedback on your practice answers — all backed by Google Gemini.

## Features

- **Resume ↔ JD Match** — upload your resume as PDF, DOCX, or plain text (or just paste it), paste a job description, and get:
  - A 0–100 match score
  - Matched skills/requirements
  - Missing skills/requirements (gaps)
  - Concrete tailoring suggestions for your bullets
- **Interview Prep** — generates likely interview questions (technical, behavioral, system design) tailored to the specific role
- **Mock Answer Feedback** — pick a generated question, write your answer, and get structured feedback: strengths, areas to improve, and a model answer

## Tech Stack

- **Frontend:** React 18 + Vite, hand-rolled CSS (no framework), `mammoth` for in-browser DOCX text extraction
- **Backend:** Vercel serverless functions (Node.js) under `/api`, so the Gemini API key never reaches the browser
- **AI:** Google Gemini API (gemini-2.5-flash), including native PDF document understanding for resume uploads

## Project Structure

```
career-copilot/
├── api/                # Vercel serverless functions (Gemini API proxy)
│   ├── match.js
│   ├── questions.js
│   └── feedback.js
├── lib/
│   └── gemini.js       # shared Gemini API + JSON-parsing helpers
├── src/
│   ├── App.jsx          # main UI and logic
│   └── main.jsx
├── index.html
├── vite.config.js
└── package.json
```

## Deploying on Vercel

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo. Vercel auto-detects the Vite framework and the `/api` folder as serverless functions — no config needed.
3. In the project's **Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` = your Google Gemini API key (free tier available at aistudio.google.com/apikey)
4. Deploy. That's it — one project, frontend and API together.

**Note on file size:** Vercel serverless functions cap request bodies at 4.5MB. Since PDFs are base64-encoded before being sent (~33% larger), keep uploaded resumes under ~3MB.

## Local Development

Install the [Vercel CLI](https://vercel.com/docs/cli) so `/api` functions run alongside the frontend:

```bash
npm install
npm i -g vercel
vercel dev
```

Add your key to a local `.env` file first:
```
GEMINI_API_KEY=your_api_key_here
```

Alternatively, `npm run dev` runs just the Vite frontend, but the `/api` routes won't work without `vercel dev` or a similar local function runner.

## License

MIT — see [LICENSE](./LICENSE).
"# career-copilot-" 
