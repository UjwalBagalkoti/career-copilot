import { useState } from "react";
import mammoth from "mammoth";

const TABS = [
  { id: "match", label: "Resume match" },
  { id: "prep", label: "Interview prep" },
];

async function postJSON(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Try again.");
  return data;
}

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [resumeText, setResumeText] = useState("");
  const [resumePdfBase64, setResumePdfBase64] = useState(null);
  const [resumeFileName, setResumeFileName] = useState(null);
  const [resumeFileError, setResumeFileError] = useState(null);
  const [jdText, setJdText] = useState("");
  const [tab, setTab] = useState("match");

  const [matchResult, setMatchResult] = useState(null);
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState(null);

  const [questions, setQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [questionsError, setQuestionsError] = useState(null);
  const [activeQuestion, setActiveQuestion] = useState(null);
  const [answers, setAnswers] = useState({});

  const hasResume = Boolean(resumeText.trim() || resumePdfBase64);
  const hasJd = Boolean(jdText.trim());

  async function handleFile(file) {
    if (!file) return;
    setResumeFileError(null);
    setResumePdfBase64(null);
    try {
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        const base64 = await readFileAsBase64(file);
        setResumePdfBase64(base64);
        setResumeText("");
      } else if (file.name.toLowerCase().endsWith(".docx")) {
        const buf = await file.arrayBuffer();
        const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
        setResumeText(value.trim());
      } else {
        setResumeText((await file.text()).trim());
      }
      setResumeFileName(file.name);
    } catch (err) {
      setResumeFileError("Couldn't read that file. Try pasting the text instead.");
      setResumeFileName(null);
    }
  }

  function clearResumeFile() {
    setResumeFileName(null);
    setResumePdfBase64(null);
    setResumeFileError(null);
  }

  async function checkMatch() {
    setMatchLoading(true);
    setMatchError(null);
    setMatchResult(null);
    try {
      const data = await postJSON("/api/match", { resumeText, resumePdfBase64, jdText });
      setMatchResult(data);
    } catch (err) {
      setMatchError(err.message);
    } finally {
      setMatchLoading(false);
    }
  }

  async function generateQuestions() {
    setQuestionsLoading(true);
    setQuestionsError(null);
    setQuestions(null);
    setActiveQuestion(null);
    setAnswers({});
    try {
      const data = await postJSON("/api/questions", { resumeText, resumePdfBase64, jdText });
      setQuestions(Array.isArray(data) ? data : []);
    } catch (err) {
      setQuestionsError(err.message);
    } finally {
      setQuestionsLoading(false);
    }
  }

  function setAnswerText(i, text) {
    setAnswers((a) => ({ ...a, [i]: { ...a[i], text, feedback: null, error: null } }));
  }

  async function getFeedback(i, question) {
    const answer = (answers[i]?.text || "").trim();
    if (!answer) return;
    setAnswers((a) => ({ ...a, [i]: { ...a[i], loading: true, error: null } }));
    try {
      const data = await postJSON("/api/feedback", { question, answer });
      setAnswers((a) => ({ ...a, [i]: { ...a[i], loading: false, feedback: data } }));
    } catch (err) {
      setAnswers((a) => ({ ...a, [i]: { ...a[i], loading: false, error: err.message } }));
    }
  }

  return (
    <div className="app">
      <header className="hero">
        <h1>Career Copilot</h1>
        <p className="tagline">
          Paste a resume and a job description. See what matches, what's missing, and what an
          interviewer is likely to ask.
        </p>
      </header>

      <main className="layout">
        <section className="input-col">
          <div className="field-block">
            <label htmlFor="resume-paste">Resume</label>
            <div
              className="dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
            >
              {resumeFileName ? (
                <p>
                  <strong>{resumeFileName}</strong> attached —{" "}
                  <button type="button" className="link-btn" onClick={clearResumeFile}>
                    remove
                  </button>
                </p>
              ) : (
                <>
                  <p>Drop a PDF, DOCX or TXT file here, or</p>
                  <label className="file-btn">
                    choose a file
                    <input
                      type="file"
                      accept=".pdf,.docx,.txt"
                      onChange={(e) => handleFile(e.target.files?.[0])}
                      hidden
                    />
                  </label>
                </>
              )}
            </div>
            {resumeFileError && <p className="error-text">{resumeFileError}</p>}
            <textarea
              id="resume-paste"
              rows={8}
              placeholder="...or paste your resume text here"
              value={resumeText}
              onChange={(e) => {
                setResumeText(e.target.value);
                if (e.target.value.trim()) {
                  setResumePdfBase64(null);
                  setResumeFileName(null);
                }
              }}
            />
          </div>

          <div className="field-block">
            <label htmlFor="jd">Job description</label>
            <textarea
              id="jd"
              rows={10}
              placeholder="Paste the job posting here"
              value={jdText}
              onChange={(e) => setJdText(e.target.value)}
            />
          </div>
        </section>

        <section className="result-col">
          <nav className="tabs">
            {TABS.map((t) => (
              <button
                key={t.id}
                className={tab === t.id ? "tab active" : "tab"}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          {tab === "match" && (
            <div className="panel">
              <button
                className="primary-btn"
                disabled={!hasResume || !hasJd || matchLoading}
                onClick={checkMatch}
              >
                {matchLoading ? "Checking…" : "Check match"}
              </button>
              {!hasResume && <p className="hint">Add a resume to get started.</p>}
              {hasResume && !hasJd && <p className="hint">Add a job description to compare against.</p>}
              {matchError && <p className="error-text">{matchError}</p>}

              {matchResult && (
                <div className="match-result">
                  <div className="score-block">
                    <span className="score-num">{matchResult.score}</span>
                    <span className="score-label">match score</span>
                  </div>

                  <div className="skill-cols">
                    <div>
                      <h3>Matched</h3>
                      <ul className="pills matched">
                        {(matchResult.matched || []).map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <h3>Missing</h3>
                      <ul className="pills missing">
                        {(matchResult.missing || []).map((m) => (
                          <li key={m}>{m}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="suggestions">
                    <h3>Tailoring suggestions</h3>
                    <ol>
                      {(matchResult.suggestions || []).map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === "prep" && (
            <div className="panel">
              <button className="primary-btn" disabled={!hasJd || questionsLoading} onClick={generateQuestions}>
                {questionsLoading ? "Generating…" : "Generate questions"}
              </button>
              {!hasJd && <p className="hint">Add a job description to generate questions.</p>}
              {questionsError && <p className="error-text">{questionsError}</p>}

              {questions && (
                <ul className="question-list">
                  {questions.map((q, i) => {
                    const isOpen = activeQuestion === i;
                    const state = answers[i] || {};
                    return (
                      <li key={i} className={isOpen ? "question open" : "question"}>
                        <button
                          className="question-head"
                          onClick={() => setActiveQuestion(isOpen ? null : i)}
                        >
                          <span className="category">{q.category}</span>
                          <span className="question-text">{q.question}</span>
                        </button>
                        {isOpen && (
                          <div className="answer-block">
                            <textarea
                              rows={4}
                              placeholder="Write or paste your answer here"
                              value={state.text || ""}
                              onChange={(e) => setAnswerText(i, e.target.value)}
                            />
                            <button
                              className="secondary-btn"
                              disabled={!state.text?.trim() || state.loading}
                              onClick={() => getFeedback(i, q.question)}
                            >
                              {state.loading ? "Reviewing…" : "Get feedback"}
                            </button>
                            {state.error && <p className="error-text">{state.error}</p>}
                            {state.feedback && (
                              <div className="feedback">
                                <div>
                                  <h4>Strengths</h4>
                                  <ul>
                                    {(state.feedback.strengths || []).map((s) => (
                                      <li key={s}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4>Areas to improve</h4>
                                  <ul>
                                    {(state.feedback.improvements || []).map((s) => (
                                      <li key={s}>{s}</li>
                                    ))}
                                  </ul>
                                </div>
                                <div>
                                  <h4>Model answer</h4>
                                  <p>{state.feedback.sample_answer}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}