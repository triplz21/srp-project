import { useState, useEffect } from "react"

const API = import.meta.env.VITE_API_URL

export default function App() {
  const [page, setPage] = useState("jobs")
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [analyzing, setAnalyzing] = useState(false)

  const [jobForm, setJobForm] = useState({ title: "", description: "", criteria: "" })
  const [candidateForm, setCandidateForm] = useState({ name: "", resume: "" })

  useEffect(() => { fetchJobs() }, [])

  async function fetchJobs() {
    const res = await fetch(`${API}/jobs`)
    setJobs(await res.json())
  }

  async function createJob() {
    if (!jobForm.title || !jobForm.criteria) return
    await fetch(`${API}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobForm)
    })
    setJobForm({ title: "", description: "", criteria: "" })
    fetchJobs()
  }

  async function selectJob(job) {
    setSelectedJob(job)
    setPage("candidates")
    const res = await fetch(`${API}/jobs/${job.id}/candidates`)
    setCandidates(await res.json())
    const res2 = await fetch(`${API}/jobs/${job.id}/results`)
    const data = await res2.json()
    setResults(data.results || [])
  }

  async function addCandidate() {
    if (!candidateForm.name || !candidateForm.resume) return
    await fetch(`${API}/candidates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...candidateForm, job_id: selectedJob.id })
    })
    setCandidateForm({ name: "", resume: "" })
    const res = await fetch(`${API}/jobs/${selectedJob.id}/candidates`)
    setCandidates(await res.json())
  }

  async function analyze() {
    setAnalyzing(true)
    await fetch(`${API}/jobs/${selectedJob.id}/analyze`, { method: "POST" })
    const res = await fetch(`${API}/jobs/${selectedJob.id}/results`)
    const data = await res.json()
    setResults(data.results || [])
    setAnalyzing(false)
    setPage("results")
  }

  const styles = {
    app: { minHeight: "100vh", background: "#0f1117", color: "#e2e8f0", fontFamily: "system-ui, sans-serif", padding: "24px" },
    header: { textAlign: "center", marginBottom: "32px" },
    title: { fontSize: "28px", fontWeight: "bold", color: "#7c3aed", margin: 0 },
    subtitle: { color: "#64748b", marginTop: "8px" },
    nav: { display: "flex", gap: "8px", justifyContent: "center", marginBottom: "32px" },
    navBtn: (active) => ({ padding: "8px 20px", borderRadius: "8px", border: "none", cursor: "pointer", background: active ? "#7c3aed" : "#1e2130", color: active ? "white" : "#94a3b8", fontWeight: "500" }),
    card: { background: "#1e2130", borderRadius: "12px", padding: "20px", marginBottom: "16px", border: "1px solid #2d3348" },
    input: { width: "100%", padding: "10px 12px", background: "#0f1117", border: "1px solid #2d3348", borderRadius: "8px", color: "#e2e8f0", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px" },
    textarea: { width: "100%", padding: "10px 12px", background: "#0f1117", border: "1px solid #2d3348", borderRadius: "8px", color: "#e2e8f0", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px", minHeight: "100px", resize: "vertical" },
    btn: (color) => ({ padding: "10px 20px", background: color || "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontWeight: "500", fontSize: "14px" }),
    jobCard: { background: "#1e2130", borderRadius: "12px", padding: "16px", marginBottom: "12px", border: "1px solid #2d3348", cursor: "pointer", transition: "border-color 0.2s" },
    score: (s) => ({ fontSize: "24px", fontWeight: "bold", color: s >= 70 ? "#22c55e" : s >= 40 ? "#f59e0b" : "#ef4444" }),
    label: { fontSize: "12px", color: "#64748b", marginBottom: "4px", display: "block" },
    section: { maxWidth: "720px", margin: "0 auto" },
  }

  return (
    <div style={styles.app}>
      <div style={styles.header}>
        <h1 style={styles.title}>⚡ Talent AI</h1>
        <p style={styles.subtitle}>AI-powered candidate screening</p>
      </div>

      <div style={styles.nav}>
        <button style={styles.navBtn(page === "jobs")} onClick={() => setPage("jobs")}>Вакансии</button>
        {selectedJob && <button style={styles.navBtn(page === "candidates")} onClick={() => setPage("candidates")}>Кандидаты</button>}
        {selectedJob && results.length > 0 && <button style={styles.navBtn(page === "results")} onClick={() => setPage("results")}>Результаты</button>}
      </div>

      <div style={styles.section}>

        {/* ВАКАНСИИ */}
        {page === "jobs" && (
          <>
            <div style={styles.card}>
              <h2 style={{ margin: "0 0 16px", color: "#a78bfa" }}>Создать вакансию</h2>
              <label style={styles.label}>Название вакансии</label>
              <input style={styles.input} placeholder="например: Senior Python Developer" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
              <label style={styles.label}>Описание</label>
              <textarea style={styles.textarea} placeholder="Опишите позицию..." value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
              <label style={styles.label}>Критерии отбора</label>
              <textarea style={styles.textarea} placeholder="Например: 3+ лет Python, опыт FastAPI, знание SQL..." value={jobForm.criteria} onChange={e => setJobForm({ ...jobForm, criteria: e.target.value })} />
              <button style={styles.btn()} onClick={createJob}>+ Создать вакансию</button>
            </div>

            <h2 style={{ color: "#a78bfa", marginBottom: "12px" }}>Активные вакансии</h2>
            {jobs.length === 0 && <p style={{ color: "#64748b" }}>Вакансий пока нет</p>}
            {jobs.map(job => (
              <div key={job.id} style={styles.jobCard} onClick={() => selectJob(job)}>
                <div style={{ fontWeight: "bold", fontSize: "16px" }}>{job.title}</div>
                <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>{job.description?.slice(0, 100)}...</div>
                <div style={{ color: "#7c3aed", fontSize: "12px", marginTop: "8px" }}>Нажми чтобы открыть →</div>
              </div>
            ))}
          </>
        )}

        {/* КАНДИДАТЫ */}
        {page === "candidates" && selectedJob && (
          <>
            <div style={{ marginBottom: "20px" }}>
              <h2 style={{ color: "#a78bfa", margin: "0 0 4px" }}>{selectedJob.title}</h2>
              <p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>Критерии: {selectedJob.criteria}</p>
            </div>

            <div style={styles.card}>
              <h3 style={{ margin: "0 0 16px", color: "#a78bfa" }}>Добавить кандидата</h3>
              <label style={styles.label}>Имя кандидата</label>
              <input style={styles.input} placeholder="Алия Сейткали" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />
              <label style={styles.label}>Резюме</label>
              <textarea style={styles.textarea} placeholder="Вставьте текст резюме..." value={candidateForm.resume} onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.value })} />
              <button style={styles.btn()} onClick={addCandidate}>+ Добавить</button>
            </div>

            <h3 style={{ color: "#a78bfa" }}>Кандидаты ({candidates.length})</h3>
            {candidates.length === 0 && <p style={{ color: "#64748b" }}>Кандидатов пока нет</p>}
            {candidates.map(c => (
              <div key={c.id} style={styles.card}>
                <div style={{ fontWeight: "bold" }}>{c.name}</div>
                <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>{c.resume?.slice(0, 150)}...</div>
              </div>
            ))}

            {candidates.length > 0 && (
              <div style={{ textAlign: "center", marginTop: "24px" }}>
                <button style={styles.btn(analyzing ? "#374151" : "#7c3aed")} onClick={analyze} disabled={analyzing}>
                  {analyzing ? "⏳ Анализирую..." : "🚀 Запустить AI анализ"}
                </button>
              </div>
            )}
          </>
        )}

        {/* РЕЗУЛЬТАТЫ */}
        {page === "results" && (
          <>
            <h2 style={{ color: "#a78bfa", marginBottom: "16px" }}>Результаты анализа — {selectedJob?.title}</h2>
            {results.map((r, i) => (
              <div key={r.candidate_id} style={{ ...styles.card, borderColor: i === 0 ? "#7c3aed" : "#2d3348" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                      {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}{r.name}
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "13px", marginTop: "6px" }}>{r.explanation}</div>
                  </div>
                  <div style={{ textAlign: "center", minWidth: "70px" }}>
                    <div style={styles.score(r.score)}>{r.score}</div>
                    <div style={{ color: "#64748b", fontSize: "11px" }}>/ 100</div>
                  </div>
                </div>
              </div>
            ))}
            <div style={{ textAlign: "center", marginTop: "16px" }}>
              <button style={styles.btn("#374151")} onClick={() => setPage("jobs")}>← Назад к вакансиям</button>
            </div>
          </>
        )}

      </div>
    </div>
  )
}