import { useState, useEffect, useRef } from "react"

const API = import.meta.env.VITE_API_URL

const s = {
  app: { minHeight: "100vh", background: "#0a0a0f", color: "#e2e8f0", fontFamily: "system-ui, sans-serif" },
  header: { background: "#13131a", borderBottom: "1px solid #2d2d3d", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 },
  logo: { fontSize: "22px", fontWeight: "800", background: "linear-gradient(135deg, #7c3aed, #a78bfa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  tabs: { display: "flex", gap: "4px", background: "#0a0a0f", borderRadius: "12px", padding: "4px" },
  tab: (active) => ({ padding: "10px 24px", borderRadius: "10px", border: "none", cursor: "pointer", background: active ? "#7c3aed" : "transparent", color: active ? "white" : "#94a3b8", fontWeight: "600", fontSize: "14px", transition: "all 0.2s" }),
  main: { maxWidth: "760px", margin: "0 auto", padding: "32px 24px" },
  card: { background: "#13131a", borderRadius: "14px", padding: "24px", marginBottom: "16px", border: "1px solid #2d2d3d" },
  label: { display: "block", fontSize: "12px", color: "#64748b", marginBottom: "6px", fontWeight: "500" },
  input: { width: "100%", padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2d2d3d", borderRadius: "8px", color: "#e2e8f0", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px", outline: "none" },
  textarea: { width: "100%", padding: "10px 12px", background: "#0a0a0f", border: "1px solid #2d2d3d", borderRadius: "8px", color: "#e2e8f0", marginBottom: "12px", boxSizing: "border-box", fontSize: "14px", minHeight: "90px", resize: "vertical", outline: "none" },
  btn: (bg, full) => ({ padding: "11px 24px", background: bg || "#7c3aed", color: "white", border: "none", borderRadius: "10px", cursor: "pointer", fontWeight: "600", fontSize: "14px", width: full ? "100%" : "auto" }),
  jobCard: { background: "#13131a", borderRadius: "14px", padding: "20px", marginBottom: "12px", border: "1px solid #2d2d3d", cursor: "pointer" },
  tag: { display: "inline-block", padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: "600", background: "#1e1a2e", color: "#a78bfa" },
  score: (v) => ({ fontSize: "28px", fontWeight: "800", color: v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444" }),
  badge: (v) => ({ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "600", background: v >= 70 ? "#14532d" : v >= 40 ? "#451a03" : "#450a0a", color: v >= 70 ? "#22c55e" : v >= 40 ? "#f59e0b" : "#ef4444" }),
  fileBtn: { padding: "10px 16px", background: "#1e1a2e", border: "1px dashed #7c3aed", borderRadius: "8px", color: "#a78bfa", cursor: "pointer", fontSize: "13px", textAlign: "center", marginBottom: "12px", display: "block", width: "100%", boxSizing: "border-box" },
  error: { color: "#ef4444", fontSize: "13px", marginBottom: "12px" },
  subNav: { display: "flex", gap: "8px", marginBottom: "24px" },
  subBtn: (active) => ({ padding: "7px 16px", borderRadius: "8px", border: "none", cursor: "pointer", background: active ? "#1e1a2e" : "transparent", color: active ? "#a78bfa" : "#64748b", fontWeight: "500", fontSize: "13px", borderBottom: active ? "2px solid #7c3aed" : "2px solid transparent" }),
}

export default function App() {
  const [tab, setTab] = useState("candidate")
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [subPage, setSubPage] = useState("list")
  const [jobForm, setJobForm] = useState({ title: "", description: "", criteria: "" })
  const [candidateForm, setCandidateForm] = useState({ name: "", resume: "" })
  const [pdfFile, setPdfFile] = useState(null)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const resultsRef = useRef(null)

  useEffect(() => { fetchJobs() }, [])

  async function fetchJobs() {
    const res = await fetch(`${API}/jobs`)
    setJobs(await res.json())
  }

  async function createJob() {
    if (!jobForm.title || !jobForm.criteria) { setError("Заполните название и критерии"); return }
    await fetch(`${API}/jobs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(jobForm)
    })
    setJobForm({ title: "", description: "", criteria: "" })
    setError("")
    setSuccess("Вакансия создана! ✅")
    setTimeout(() => setSuccess(""), 3000)
    fetchJobs()
  }

  async function selectJob(job) {
    setSelectedJob(job)
    const res = await fetch(`${API}/jobs/${job.id}/candidates`)
    setCandidates(await res.json())
    const res2 = await fetch(`${API}/jobs/${job.id}/results`)
    const data = await res2.json()
    setResults(data.results || [])
    if (tab === "employer") setSubPage("detail")
  }

  async function addCandidate() {
    if (!candidateForm.name) { setError("Введите имя"); return }
    if (!pdfFile && !candidateForm.resume) { setError("Загрузите PDF или введите текст резюме"); return }

    const formData = new FormData()
    formData.append("job_id", String(selectedJob.id))
    formData.append("name", candidateForm.name)
    formData.append("resume_text", candidateForm.resume || "")
    if (pdfFile) formData.append("file", pdfFile)

    const res = await fetch(`${API}/candidates`, { method: "POST", body: formData })
    if (!res.ok) {
      const data = await res.json()
      setError(typeof data.detail === "string" ? data.detail : "Ошибка при добавлении")
      return
    }
    setCandidateForm({ name: "", resume: "" })
    setPdfFile(null)
    setError("")
    setSuccess("Резюме отправлено! ✅")
    setTimeout(() => setSuccess(""), 3000)
    const res2 = await fetch(`${API}/jobs/${selectedJob.id}/candidates`)
    setCandidates(await res2.json())
  }

  async function analyze() {
    setAnalyzing(true)
    setError("")
    await fetch(`${API}/jobs/${selectedJob.id}/analyze`, { method: "POST" })
    const res = await fetch(`${API}/jobs/${selectedJob.id}/results`)
    const data = await res.json()
    setResults(data.results || [])
    setAnalyzing(false)
    setSubPage("results")
    setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }

  return (
    <div style={s.app}>
      <div style={s.header}>
        <span style={s.logo}>⚡ Talent AI</span>
        <div style={s.tabs}>
          <button style={s.tab(tab === "candidate")} onClick={() => { setTab("candidate"); setSelectedJob(null); setError("") }}>
            🔍 Ищу работу
          </button>
          <button style={s.tab(tab === "employer")} onClick={() => { setTab("employer"); setSubPage("list"); setSelectedJob(null); setError("") }}>
            🏢 Ищу сотрудника
          </button>
        </div>
      </div>

      <div style={s.main}>

        {/* КАНДИДАТ */}
        {tab === "candidate" && (
          <>
            <h2 style={{ color: "#a78bfa", marginBottom: "8px" }}>Открытые вакансии</h2>
            <p style={{ color: "#64748b", fontSize: "13px", marginBottom: "24px" }}>Выберите вакансию и отправьте резюме</p>
            {jobs.length === 0 && <p style={{ color: "#64748b" }}>Вакансий пока нет</p>}
            {jobs.map(job => (
              <div key={job.id} style={{ ...s.jobCard, borderColor: selectedJob?.id === job.id ? "#7c3aed" : "#2d2d3d" }} onClick={() => selectJob(job)}>
                <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>{job.title}</div>
                <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>{job.description?.slice(0, 120)}...</div>
                <span style={s.tag}>Подать резюме →</span>
              </div>
            ))}

            {selectedJob && (
              <div style={{ ...s.card, border: "1px solid #7c3aed", marginTop: "8px" }}>
                <h3 style={{ color: "#a78bfa", margin: "0 0 16px" }}>📄 Подать резюме — {selectedJob.title}</h3>
                {error && <p style={s.error}>{error}</p>}
                {success && <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "12px" }}>{success}</p>}
                <label style={s.label}>Ваше имя</label>
                <input style={s.input} placeholder="Алия Сейткали" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />
                <label style={s.label}>Загрузить PDF резюме</label>
                <label style={s.fileBtn}>
                  {pdfFile ? `✅ ${pdfFile.name}` : "📄 Нажмите чтобы загрузить PDF"}
                  <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
                </label>
                <label style={s.label}>Или вставьте текст резюме</label>
                <textarea style={s.textarea} placeholder="Вставьте текст резюме..." value={candidateForm.resume} onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.value })} />
                <button style={s.btn("#7c3aed", true)} onClick={addCandidate}>Отправить резюме →</button>
              </div>
            )}
          </>
        )}

        {/* НАНИМАТЕЛЬ */}
        {tab === "employer" && (
          <>
            <div style={s.subNav}>
              <button style={s.subBtn(subPage === "list")} onClick={() => setSubPage("list")}>Вакансии</button>
              {selectedJob && <button style={s.subBtn(subPage === "detail")} onClick={() => setSubPage("detail")}>Кандидаты</button>}
              {selectedJob && results.length > 0 && <button style={s.subBtn(subPage === "results")} onClick={() => setSubPage("results")}>Результаты</button>}
            </div>

            {subPage === "list" && (
              <>
                <div style={s.card}>
                  <h2 style={{ margin: "0 0 20px", color: "#a78bfa" }}>Создать вакансию</h2>
                  {error && <p style={s.error}>{error}</p>}
                  {success && <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "12px" }}>{success}</p>}
                  <label style={s.label}>Название</label>
                  <input style={s.input} placeholder="Senior Python Developer" value={jobForm.title} onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
                  <label style={s.label}>Описание</label>
                  <textarea style={s.textarea} placeholder="Опишите позицию..." value={jobForm.description} onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
                  <label style={s.label}>Критерии отбора</label>
                  <textarea style={s.textarea} placeholder="3+ лет Python, FastAPI, PostgreSQL..." value={jobForm.criteria} onChange={e => setJobForm({ ...jobForm, criteria: e.target.value })} />
                  <button style={s.btn()} onClick={createJob}>+ Создать вакансию</button>
                </div>
                <h2 style={{ color: "#a78bfa", margin: "0 0 16px" }}>Активные вакансии</h2>
                {jobs.length === 0 && <p style={{ color: "#64748b" }}>Вакансий пока нет</p>}
                {jobs.map(job => (
                  <div key={job.id} style={s.jobCard} onClick={() => selectJob(job)}>
                    <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>{job.title}</div>
                    <div style={{ color: "#64748b", fontSize: "13px", marginBottom: "10px" }}>{job.description?.slice(0, 100)}...</div>
                    <span style={s.tag}>Открыть →</span>
                  </div>
                ))}
              </>
            )}

            {subPage === "detail" && selectedJob && (
              <>
                <div style={{ marginBottom: "24px" }}>
                  <h2 style={{ color: "#a78bfa", margin: "0 0 6px" }}>{selectedJob.title}</h2>
                  <p style={{ color: "#64748b", margin: 0, fontSize: "13px" }}>Критерии: {selectedJob.criteria}</p>
                </div>
                <div style={s.card}>
                  <h3 style={{ margin: "0 0 16px", color: "#a78bfa" }}>Добавить кандидата</h3>
                  {error && <p style={s.error}>{error}</p>}
                  {success && <p style={{ color: "#22c55e", fontSize: "13px", marginBottom: "12px" }}>{success}</p>}
                  <label style={s.label}>Имя кандидата</label>
                  <input style={s.input} placeholder="Алия Сейткали" value={candidateForm.name} onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />
                  <label style={s.label}>Загрузить PDF резюме</label>
                  <label style={s.fileBtn}>
                    {pdfFile ? `✅ ${pdfFile.name}` : "📄 Нажмите чтобы загрузить PDF"}
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
                  </label>
                  <label style={s.label}>Или вставьте текст</label>
                  <textarea style={s.textarea} placeholder="Текст резюме..." value={candidateForm.resume} onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.value })} />
                  <button style={s.btn()} onClick={addCandidate}>+ Добавить</button>
                </div>
                <h3 style={{ color: "#a78bfa" }}>Кандидаты ({candidates.length})</h3>
                {candidates.length === 0 && <p style={{ color: "#64748b" }}>Кандидатов пока нет</p>}
                {candidates.map(c => (
                  <div key={c.id} style={s.card}>
                    <div style={{ fontWeight: "700" }}>{c.name}</div>
                    <div style={{ color: "#64748b", fontSize: "13px", marginTop: "4px" }}>{c.resume?.slice(0, 120)}...</div>
                  </div>
                ))}
                {candidates.length > 0 && (
                  <div style={{ textAlign: "center", marginTop: "24px" }}>
                    <button style={s.btn(analyzing ? "#374151" : "#7c3aed")} onClick={analyze} disabled={analyzing}>
                      {analyzing ? "⏳ Анализирую..." : "🚀 Запустить AI анализ"}
                    </button>
                  </div>
                )}
              </>
            )}

            {subPage === "results" && (
              <>
                <div ref={resultsRef} />
                <h2 style={{ color: "#a78bfa", marginBottom: "20px" }}>📊 Результаты — {selectedJob?.title}</h2>
                {results.map((r, i) => (
                  <div key={r.candidate_id} style={{ ...s.card, borderColor: i === 0 ? "#7c3aed" : "#2d2d3d" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "6px" }}>
                          {i === 0 ? "🥇 " : i === 1 ? "🥈 " : i === 2 ? "🥉 " : `${i + 1}. `}{r.name}
                        </div>
                        <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5" }}>{r.explanation}</div>
                      </div>
                      <div style={{ textAlign: "center", minWidth: "80px", marginLeft: "16px" }}>
                        <div style={s.score(r.score)}>{r.score}</div>
                        <div style={s.badge(r.score)}>{r.score >= 70 ? "Топ" : r.score >= 40 ? "Средний" : "Слабый"}</div>
                      </div>
                    </div>
                  </div>
                ))}
                <div style={{ textAlign: "center", marginTop: "20px" }}>
                  <button style={s.btn("#1e1a2e")} onClick={() => setSubPage("list")}>← К вакансиям</button>
                </div>
              </>
            )}
          </>
        )}

      </div>
    </div>
  )
}