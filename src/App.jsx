import { useState } from "react";
import mammoth from "mammoth";

async function postJSON(path, body) {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function Dial({ score }) {
  const s = Math.max(0, Math.min(100, score || 0));
  const circumference = 2 * Math.PI * 70;
  const offset = circumference - (s / 100) * circumference;
  const color = s >= 75 ? "#2E7D6B" : s >= 45 ? "#C99A2E" : "#C1502E";
  return (
    <div className="dial-wrap">
      <svg width="170" height="170" viewBox="0 0 170 170">
        <circle cx="85" cy="85" r="70" fill="none" stroke="#E4DFD3" strokeWidth="14" />
        <circle
          cx="85"
          cy="85"
          r="70"
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform="rotate(-90 85 85)"
          style={{ transition: "stroke-dashoffset 1s ease, stroke 0.6s ease" }}
        />
        <text x="85" y="78" textAnchor="middle" className="dial-num" fill="#241F16">
          {s}
        </text>
        <text x="85" y="102" textAnchor="middle" className="dial-label" fill="#6B6455">
          MATCH
        </text>
      </svg>
    </div>
  );
}

function Tag({ children, kind }) {
  return <span className={`tag tag-${kind}`}>{children}</span>;
}

function Spinner({ label }) {
  return (
    <div className="spinner-row">
      <span className="spinner" />
      <span>{label}</span>
    </div>
  );
}

export default function App() {
  const [tab, setTab] = useState("match");

  const [resumeMode, setResumeMode] = useState("paste");
  const [resumeText, setResumeText] = useState("");
  const [resumeFile, setResumeFile] = useState(null); // { name, base64 } for PDFs only
  const [fileProcessing, setFileProcessing] = useState(false);
  const [fileError, setFileError] = useState("");

  const [jdText, setJdText] = useState("");
  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");

  const [questions, setQuestions] = useState(null);
  const [qLoading, setQLoading] = useState(false);
  const [qError, setQError] = useState("");

  const [selectedQ, setSelectedQ] = useState(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [fbLoading, setFbLoading] = useState(false);
  const [fbError, setFbError] = useState("");

  const hasResume = Boolean(resumeText.trim() || resumeFile);

  async function handleFileUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setFileError("");
    setFileProcessing(true);
    setResumeFile(null);
    setResumeText("");
    try {
      const lower = file.name.toLowerCase();
      if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
        const buf = await file.arrayBuffer();
        const base64 = arrayBufferToBase64(buf);
        setResumeFile({ name: file.name, base64 });
      } else if (lower.endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer: buf });
        setResumeText(result.value);
      } else if (lower.endsWith(".txt") || file.type.startsWith("text/")) {
        const text = await file.text();
        setResumeText(text);
      } else {
        setFileError("Unsupported file type. Use PDF, DOCX, or TXT.");
      }
    } catch (err) {
      setFileError("Couldn't read that file. Try another format, or paste the text instead.");
    } finally {
      setFileProcessing(false);
    }
  }

  async function runMatch() {
    if (!hasResume || !jdText.trim()) {
      setMatchError("Add your resume (paste or upload) and the job description first.");
      return;
    }
    setMatchLoading(true);
    setMatchError("");
    setMatchResult(null);
    try {
      const parsed = await postJSON("/api/match", {
        resumeText,
        resumePdfBase64: resumeFile ? resumeFile.base64 : null,
        jdText,
      });
      setMatchResult(parsed);
    } catch (e) {
      setMatchError("Couldn't analyze that pair. Try again in a moment.");
    } finally {
      setMatchLoading(false);
    }
  }

  async function runQuestions() {
    if (!jdText.trim()) {
      setQError("Paste a job description in the Match tab first.");
      return;
    }
    setQLoading(true);
    setQError("");
    setQuestions(null);
    try {
      const parsed = await postJSON("/api/questions", {
        resumeText,
        resumePdfBase64: resumeFile ? resumeFile.base64 : null,
        jdText,
      });
      setQuestions(parsed);
    } catch (e) {
      setQError("Couldn't generate questions. Try again in a moment.");
    } finally {
      setQLoading(false);
    }
  }

  async function runFeedback() {
    if (!selectedQ || !answer.trim()) {
      setFbError("Pick a question and write an answer first.");
      return;
    }
    setFbLoading(true);
    setFbError("");
    setFeedback(null);
    try {
      const parsed = await postJSON("/api/feedback", {
        question: selectedQ.question,
        answer,
      });
      setFeedback(parsed);
    } catch (e) {
      setFbError("Couldn't score that answer. Try again in a moment.");
    } finally {
      setFbLoading(false);
    }
  }

  return (
    <div className="cc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

        .cc-root {
          --paper: #F1ECE0;
          --paper-2: #E9E2D2;
          --ink: #241F16;
          --ink-soft: #6B6455;
          --rule: #C9C0AC;
          --match: #2E7D6B;
          --missing: #C1502E;
          --accent: #C99A2E;
          font-family: 'IBM Plex Sans', sans-serif;
          background: var(--paper);
          color: var(--ink);
          min-height: 100%;
          padding: 28px 20px 60px;
          box-sizing: border-box;
        }
        .cc-root * { box-sizing: border-box; }

        .cc-header {
          max-width: 880px;
          margin: 0 auto 22px;
          border-bottom: 2px solid var(--ink);
          padding-bottom: 14px;
        }
        .cc-title {
          font-family: 'Fraunces', serif;
          font-weight: 700;
          font-size: 34px;
          letter-spacing: -0.01em;
          margin: 0;
        }
        .cc-sub {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: var(--ink-soft);
        }

        .cc-tabs {
          max-width: 880px;
          margin: 0 auto;
          display: flex;
          gap: 4px;
        }
        .cc-tab {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          padding: 10px 18px;
          background: var(--paper-2);
          border: 1px solid var(--rule);
          border-bottom: none;
          border-radius: 6px 6px 0 0;
          cursor: pointer;
          color: var(--ink-soft);
          position: relative;
          top: 1px;
        }
        .cc-tab.active {
          background: #FDFBF6;
          color: var(--ink);
          border-color: var(--ink);
          font-weight: 500;
        }
        .cc-tab:focus-visible { outline: 2px solid var(--match); outline-offset: 2px; }

        .cc-panel {
          max-width: 880px;
          margin: 0 auto;
          background: #FDFBF6;
          border: 1px solid var(--ink);
          border-radius: 0 6px 6px 6px;
          padding: 26px;
        }

        .field-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 6px;
          display: block;
        }
        .cc-textarea {
          width: 100%;
          min-height: 140px;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13.5px;
          line-height: 1.5;
          padding: 12px 14px;
          border: 1px solid var(--rule);
          border-radius: 6px;
          background: #FBF9F3;
          color: var(--ink);
          resize: vertical;
        }
        .cc-textarea:focus-visible { outline: 2px solid var(--match); outline-offset: 1px; }
        .cc-textarea:disabled { color: var(--ink-soft); background: var(--paper-2); }

        .grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 18px;
          margin-bottom: 18px;
          align-items: start;
        }
        @media (max-width: 620px) {
          .grid-2 { grid-template-columns: 1fr; }
        }

        .mode-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 6px;
        }
        .mode-toggle { display: flex; gap: 4px; }
        .mode-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10.5px;
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: var(--paper-2);
          border: 1px solid var(--rule);
          color: var(--ink-soft);
          padding: 4px 10px;
          border-radius: 4px;
          cursor: pointer;
        }
        .mode-btn.active { background: var(--ink); color: #FDFBF6; border-color: var(--ink); }

        .file-zone {
          border: 1px dashed var(--rule);
          border-radius: 6px;
          padding: 16px;
          background: #FBF9F3;
          min-height: 140px;
        }
        .file-input { display: none; }
        .file-label {
          display: inline-block;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          letter-spacing: 0.04em;
          background: var(--ink);
          color: #FDFBF6;
          padding: 9px 16px;
          border-radius: 5px;
          cursor: pointer;
        }
        .file-hint { font-size: 11px; color: var(--ink-soft); margin-top: 8px; }
        .file-chip {
          margin-top: 12px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          background: var(--paper-2);
          border: 1px solid var(--match);
          color: var(--match);
          padding: 6px 10px;
          border-radius: 5px;
        }
        .chip-x {
          background: none;
          border: none;
          color: var(--match);
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
        }
        .extracted-preview { margin-top: 12px; }
        .extracted-text {
          font-size: 12.5px;
          line-height: 1.5;
          color: var(--ink-soft);
          background: var(--paper-2);
          border-radius: 5px;
          padding: 10px 12px;
          max-height: 110px;
          overflow-y: auto;
          white-space: pre-wrap;
        }

        .cc-btn {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12.5px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          background: var(--ink);
          color: #FDFBF6;
          border: none;
          padding: 11px 20px;
          border-radius: 5px;
          cursor: pointer;
        }
        .cc-btn:hover { background: #3a3323; }
        .cc-btn:focus-visible { outline: 2px solid var(--match); outline-offset: 2px; }
        .cc-btn:disabled { opacity: 0.5; cursor: not-allowed; }

        .error-note {
          font-size: 13px;
          color: var(--missing);
          margin-top: 10px;
        }

        .spinner-row {
          display: flex;
          align-items: center;
          gap: 10px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          color: var(--ink-soft);
          margin-top: 14px;
        }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid var(--rule);
          border-top-color: var(--ink);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .result-block { margin-top: 24px; padding-top: 20px; border-top: 1px dashed var(--rule); }
        .dial-wrap { display: flex; justify-content: center; margin-bottom: 10px; }
        .dial-num { font-family: 'Fraunces', serif; font-size: 30px; font-weight: 700; }
        .dial-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.12em; }

        .col-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-soft);
          margin-bottom: 8px;
        }
        .tag-list { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 18px; }
        .tag {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 12px;
          padding: 5px 10px;
          border-radius: 4px;
          border: 1px solid;
          transform: rotate(-0.6deg);
        }
        .tag-matched { background: #E4F0EC; border-color: var(--match); color: var(--match); }
        .tag-missing { background: #F6E6DE; border-color: var(--missing); color: var(--missing); }

        .suggestion-list { margin: 0; padding-left: 18px; }
        .suggestion-list li { margin-bottom: 8px; font-size: 13.5px; line-height: 1.5; }

        .q-list { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
        .q-item {
          text-align: left;
          background: var(--paper-2);
          border: 1px solid var(--rule);
          border-radius: 6px;
          padding: 12px 14px;
          cursor: pointer;
        }
        .q-item:hover { border-color: var(--ink); }
        .q-cat {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--ink-soft);
          display: block;
          margin-bottom: 4px;
        }
        .q-text { font-size: 13.5px; }

        .fb-col-title-good { color: var(--match); }
        .fb-col-title-bad { color: var(--missing); }
        .sample-answer {
          background: var(--paper-2);
          border-left: 3px solid var(--accent);
          padding: 12px 14px;
          font-size: 13.5px;
          line-height: 1.55;
          border-radius: 0 6px 6px 0;
        }
      `}</style>

      <div className="cc-header">
        <p className="cc-sub">Career Copilot</p>
        <h1 className="cc-title">Application Case File</h1>
      </div>

      <div className="cc-tabs">
        <button className={`cc-tab ${tab === "match" ? "active" : ""}`} onClick={() => setTab("match")}>
          01 · Resume Match
        </button>
        <button className={`cc-tab ${tab === "questions" ? "active" : ""}`} onClick={() => setTab("questions")}>
          02 · Interview Prep
        </button>
        <button className={`cc-tab ${tab === "mock" ? "active" : ""}`} onClick={() => setTab("mock")}>
          03 · Mock Answer
        </button>
      </div>

      <div className="cc-panel">
        {tab === "match" && (
          <div>
            <div className="grid-2">
              <div>
                <div className="mode-row">
                  <label className="field-label" style={{ marginBottom: 0 }}>Your Resume</label>
                  <div className="mode-toggle">
                    <button className={`mode-btn ${resumeMode === "paste" ? "active" : ""}`} onClick={() => setResumeMode("paste")}>
                      Paste
                    </button>
                    <button className={`mode-btn ${resumeMode === "file" ? "active" : ""}`} onClick={() => setResumeMode("file")}>
                      Upload
                    </button>
                  </div>
                </div>

                {resumeMode === "paste" && (
                  <textarea
                    className="cc-textarea"
                    placeholder="Paste your resume text here..."
                    value={resumeText}
                    onChange={(e) => {
                      setResumeText(e.target.value);
                      setResumeFile(null);
                    }}
                  />
                )}

                {resumeMode === "file" && (
                  <div className="file-zone">
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt,application/pdf,text/plain"
                      onChange={handleFileUpload}
                      className="file-input"
                      id="resume-file"
                    />
                    <label htmlFor="resume-file" className="file-label">
                      {fileProcessing ? "Reading file..." : "Choose PDF, DOCX, or TXT"}
                    </label>
                    <p className="file-hint">Max ~3MB (PDFs are base64-encoded before sending).</p>

                    {resumeFile && (
                      <div className="file-chip">
                        📎 {resumeFile.name}
                        <button className="chip-x" onClick={() => setResumeFile(null)} aria-label="Remove file">×</button>
                      </div>
                    )}

                    {resumeText && !resumeFile && (
                      <div className="extracted-preview">
                        <div className="col-title">Extracted Text</div>
                        <p className="extracted-text">
                          {resumeText.slice(0, 600)}
                          {resumeText.length > 600 ? "…" : ""}
                        </p>
                      </div>
                    )}

                    {fileError && <p className="error-note">{fileError}</p>}
                  </div>
                )}
              </div>

              <div>
                <label className="field-label">Job Description</label>
                <textarea
                  className="cc-textarea"
                  placeholder="Paste the job description here..."
                  value={jdText}
                  onChange={(e) => setJdText(e.target.value)}
                />
              </div>
            </div>
            <button className="cc-btn" onClick={runMatch} disabled={matchLoading}>
              {matchLoading ? "Analyzing..." : "Analyze Match"}
            </button>
            {matchLoading && <Spinner label="Reading both documents..." />}
            {matchError && <p className="error-note">{matchError}</p>}

            {matchResult && (
              <div className="result-block">
                <Dial score={matchResult.score} />
                <div className="col-title">Matched</div>
                <div className="tag-list">
                  {(matchResult.matched || []).map((m, i) => (
                    <Tag key={i} kind="matched">{m}</Tag>
                  ))}
                </div>
                <div className="col-title">Gaps</div>
                <div className="tag-list">
                  {(matchResult.missing || []).map((m, i) => (
                    <Tag key={i} kind="missing">{m}</Tag>
                  ))}
                </div>
                <div className="col-title">Tailoring Suggestions</div>
                <ul className="suggestion-list">
                  {(matchResult.suggestions || []).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "questions" && (
          <div>
            <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 0 }}>
              Uses the job description from the Match tab. Generates the questions you're most likely to face.
            </p>
            <button className="cc-btn" onClick={runQuestions} disabled={qLoading}>
              {qLoading ? "Generating..." : "Generate Questions"}
            </button>
            {qLoading && <Spinner label="Studying the role..." />}
            {qError && <p className="error-note">{qError}</p>}

            {questions && (
              <div className="result-block">
                <div className="col-title">Likely Questions</div>
                <div className="q-list">
                  {questions.map((q, i) => (
                    <div key={i} className="q-item" onClick={() => { setSelectedQ(q); setTab("mock"); setFeedback(null); setAnswer(""); }}>
                      <span className="q-cat">{q.category}</span>
                      <span className="q-text">{q.question}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "mock" && (
          <div>
            {!selectedQ && (
              <p style={{ fontSize: 13.5, color: "var(--ink-soft)", marginTop: 0 }}>
                Pick a question from Interview Prep to practice your answer here.
              </p>
            )}
            {selectedQ && (
              <div>
                <div className="col-title">Question</div>
                <p style={{ fontSize: 15, marginTop: 0 }}>{selectedQ.question}</p>
                <label className="field-label">Your Answer</label>
                <textarea
                  className="cc-textarea"
                  placeholder="Type or paste your answer..."
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <div style={{ marginTop: 14 }}>
                  <button className="cc-btn" onClick={runFeedback} disabled={fbLoading}>
                    {fbLoading ? "Scoring..." : "Get Feedback"}
                  </button>
                </div>
                {fbLoading && <Spinner label="Reviewing your answer..." />}
                {fbError && <p className="error-note">{fbError}</p>}

                {feedback && (
                  <div className="result-block">
                    <div className="col-title fb-col-title-good">Strengths</div>
                    <ul className="suggestion-list">
                      {(feedback.strengths || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                    <div className="col-title fb-col-title-bad">Improve</div>
                    <ul className="suggestion-list">
                      {(feedback.improvements || []).map((s, i) => <li key={i}>{s}</li>)}
                    </ul>
                    <div className="col-title">Model Answer</div>
                    <p className="sample-answer">{feedback.sample_answer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
