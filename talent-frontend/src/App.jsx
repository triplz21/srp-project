import { useState, useEffect, useRef } from "react"

const API = import.meta.env.VITE_API_URL

/* ---------- minimal inline icon set (no external deps) ---------- */

function Icon({ path, size = 16, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {path}
    </svg>
  )
}

const IconBriefcase = (p) => <Icon {...p} path={<><rect x="2" y="7" width="20" height="14" rx="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></>} />
const IconUsers = (p) => <Icon {...p} path={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />
const IconSparkles = (p) => <Icon {...p} path={<path d="M12 3l1.8 4.9L19 9.7l-5.2 1.8L12 16.4l-1.8-4.9L5 9.7l5.2-1.8L12 3z" />} />
const IconCalendar = (p) => <Icon {...p} path={<><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>} />
const IconCheck = (p) => <Icon {...p} path={<polyline points="20 6 9 17 4 12" />} />
const IconX = (p) => <Icon {...p} path={<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>} />
const IconFile = (p) => <Icon {...p} path={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></>} />
const IconArrowRight = (p) => <Icon {...p} path={<><line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" /></>} />
const IconClock = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>} />
const IconChevronLeft = (p) => <Icon {...p} path={<polyline points="15 18 9 12 15 6" />} />
const IconPlus = (p) => <Icon {...p} path={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />
const IconLock = (p) => <Icon {...p} path={<><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>} />
const IconZap = (p) => <Icon {...p} path={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />} />
const IconLoader = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></>} />
const IconAlert = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>} />

/* ---------- tone helpers (colors read from CSS variables in index.css) ---------- */

function scoreTone(v) {
  if (v >= 70) return { color: "var(--green)", bg: "var(--green-soft)", border: "var(--green-border)", label: "Топ" }
  if (v >= 40) return { color: "var(--yellow)", bg: "var(--yellow-soft)", border: "var(--yellow-border)", label: "Средний" }
  return { color: "var(--red)", bg: "var(--red-soft)", border: "var(--red-border)", label: "Слабый" }
}

function statusTone(status) {
  const map = {
    pending: { color: "var(--yellow)", bg: "var(--yellow-soft)", border: "var(--yellow-border)", label: "На рассмотрении" },
    invited: { color: "var(--green)", bg: "var(--green-soft)", border: "var(--green-border)", label: "Приглашён" },
    rejected: { color: "var(--red)", bg: "var(--red-soft)", border: "var(--red-border)", label: "Отклонён" },
  }
  return map[status] || map.pending
}

function rankTone(i) {
  if (i === 0) return { background: "linear-gradient(135deg,#eab308,#f59e0b)", color: "#1a1200" }
  if (i === 1) return { background: "linear-gradient(135deg,#a1a8b5,#d3d9e0)", color: "#12141a" }
  if (i === 2) return { background: "linear-gradient(135deg,#d9825a,#b45309)", color: "#1a0f05" }
  return { background: "var(--surface-2)", color: "var(--text-secondary)", border: "1px solid var(--border-strong)" }
}

export default function App() {
  const [tab, setTab] = useState("candidate")
  const [jobs, setJobs] = useState([])
  const [selectedJob, setSelectedJob] = useState(null)
  const [candidates, setCandidates] = useState([])
  const [results, setResults] = useState([])
  const [slots, setSlots] = useState([])
  const [analyzing, setAnalyzing] = useState(false)
  const [subPage, setSubPage] = useState("list")
  const [jobForm, setJobForm] = useState({ title: "", description: "", criteria: "" })
  const [candidateForm, setCandidateForm] = useState({ name: "", resume: "" })
  const [pdfFile, setPdfFile] = useState(null)
  const [slotInput, setSlotInput] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [bookingSlot, setBookingSlot] = useState(null)
  const [myCandidateId, setMyCandidateId] = useState(null)
  const [bookedSlotInfo, setBookedSlotInfo] = useState(null)
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
    setSuccess("Вакансия создана!")
    setTimeout(() => setSuccess(""), 3000)
    fetchJobs()
  }

  async function addSlot() {
    if (!slotInput.trim()) { setError("Добавьте хотя бы один слот"); return }
    await fetch(`${API}/slots`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ job_id: selectedJob.id, datetimes: [slotInput] })
    })
    setSlotInput("")
    setError("")
    setSuccess("Слот добавлен!")
    setTimeout(() => setSuccess(""), 3000)
    const res = await fetch(`${API}/jobs/${selectedJob.id}/slots`)
    setSlots(await res.json())
  }

  async function deleteSlot(slotId) {
    await fetch(`${API}/slots/${slotId}`, { method: "DELETE" })
    const res = await fetch(`${API}/jobs/${selectedJob.id}/slots`)
    setSlots(await res.json())
  }

  async function selectJob(job) {
    setSelectedJob(job)
    setMyCandidateId(null)
    setBookedSlotInfo(null)
    const [cRes, rRes, sRes] = await Promise.all([
      fetch(`${API}/jobs/${job.id}/candidates`),
      fetch(`${API}/jobs/${job.id}/results`),
      fetch(`${API}/jobs/${job.id}/slots`),
    ])
    setCandidates(await cRes.json())
    const rData = await rRes.json()
    setResults(rData.results || [])
    setSlots(await sRes.json())
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
    const created = await res.json()
    setCandidateForm({ name: "", resume: "" })
    setPdfFile(null)
    setError("")
    setSuccess("Резюме отправлено!")
    setTimeout(() => setSuccess(""), 3000)
    if (tab === "candidate") setMyCandidateId(created.id)
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

  async function updateStatus(candidateId, status) {
    await fetch(`${API}/candidates/${candidateId}/status?status=${status}`, { method: "PATCH" })
    const res = await fetch(`${API}/jobs/${selectedJob.id}/results`)
    const data = await res.json()
    setResults(data.results || [])
  }

  async function bookSlot(slotId, candidateId) {
    if (!candidateId) return
    const slot = slots.find(sl => sl.id === slotId)
    await fetch(`${API}/slots/${slotId}/book?candidate_id=${candidateId}`, { method: "POST" })
    setSuccess("Интервью забронировано!")
    setTimeout(() => setSuccess(""), 3000)
    setBookingSlot(null)
    if (candidateId === myCandidateId) setBookedSlotInfo(slot?.datetime || null)
    const res = await fetch(`${API}/jobs/${selectedJob.id}/slots`)
    setSlots(await res.json())
    const res2 = await fetch(`${API}/jobs/${selectedJob.id}/results`)
    const data = await res2.json()
    setResults(data.results || [])
  }

  return (
    <div className="app-shell">
      {/* HEADER */}
      <div className="header">
        <div className="logo">
          <span className="logo-mark"><IconZap size={16} /></span>
          Talent AI
        </div>
        <div className="tab-switcher">
          <button className={`tab-btn ${tab === "candidate" ? "active" : ""}`}
            onClick={() => { setTab("candidate"); setSelectedJob(null); setError(""); setMyCandidateId(null); setBookedSlotInfo(null) }}>
            <IconBriefcase size={15} /> Найти работу
          </button>
          <button className={`tab-btn ${tab === "employer" ? "active" : ""}`}
            onClick={() => { setTab("employer"); setSubPage("list"); setSelectedJob(null); setError(""); setMyCandidateId(null); setBookedSlotInfo(null) }}>
            <IconUsers size={15} /> Найти сотрудника
          </button>
        </div>
      </div>

      <div className="container">

        {/* ── КАНДИДАТ ── */}
        {tab === "candidate" && (
          <div className="fade-in">
            <div className="page-title">Открытые вакансии</div>
            <div className="page-subtitle" style={{ marginBottom: "28px" }}>Выберите вакансию и отправьте резюме</div>

            {jobs.length === 0 && <div className="empty-state">Вакансий пока нет</div>}
            {jobs.map(job => (
              <div key={job.id}
                className={`card card-interactive ${selectedJob?.id === job.id ? "card-selected" : ""}`}
                onClick={() => selectJob(job)}>
                <div style={{ fontWeight: 640, fontSize: "15.5px", color: "var(--text)", marginBottom: "6px" }}>{job.title}</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "14px" }}>{job.description?.slice(0, 150)}...</div>
                <span className="tag"><IconArrowRight size={12} /> Подать резюме</span>
              </div>
            ))}

            {selectedJob && (
              <div className="card card-accent fade-in" style={{ marginTop: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
                  <span className="icon-circle"><IconFile size={16} /></span>
                  <span style={{ fontSize: "16.5px", fontWeight: 620, color: "var(--text)" }}>{selectedJob.title}</span>
                </div>
                {error && <div className="alert alert-error"><IconAlert size={14} />{error}</div>}
                {success && <div className="alert alert-success"><IconCheck size={14} />{success}</div>}

                <label className="field-label">Ваше имя</label>
                <input className="field" placeholder="Алия Сейткали" value={candidateForm.name}
                  onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />

                <label className="field-label">Загрузить PDF резюме (текстовый PDF)</label>
                <label className={`dropzone ${pdfFile ? "filled" : ""}`}>
                  {pdfFile ? <><IconCheck size={15} /> {pdfFile.name}</> : <><IconFile size={15} /> Нажмите чтобы загрузить PDF</>}
                  <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
                </label>

                <label className="field-label">Или вставьте текст резюме</label>
                <textarea className="field" placeholder="Вставьте текст резюме..." value={candidateForm.resume}
                  onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.value })} />

                <button className="btn btn-primary" onClick={addCandidate}>
                  Отправить резюме <IconArrowRight size={14} />
                </button>

                {/* Слоты для кандидата — доступны только после отправки резюме */}
                {myCandidateId !== null && (
                  <div className="card" style={{ marginTop: "24px", background: "var(--surface-2)" }}>
                    {bookedSlotInfo ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <span className="icon-circle" style={{ color: "var(--green)", borderColor: "var(--green-border)" }}><IconCheck size={16} /></span>
                        <div>
                          <div style={{ fontWeight: 600, color: "var(--text)" }}>Интервью забронировано</div>
                          <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "2px" }}>{bookedSlotInfo}</div>
                        </div>
                      </div>
                    ) : slots.filter(sl => !sl.is_booked).length > 0 ? (
                      <>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontWeight: 600, color: "var(--text)", marginBottom: "14px" }}>
                          <IconCalendar size={15} /> Доступные слоты для интервью
                        </div>
                        <div className="grid-2">
                          {slots.filter(sl => !sl.is_booked).map(slot => (
                            <button key={slot.id} className="slot-btn" onClick={() => bookSlot(slot.id, myCandidateId)}>
                              <IconClock size={13} /> {slot.datetime}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Свободных слотов для интервью пока нет</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── НАНИМАТЕЛЬ ── */}
        {tab === "employer" && (
          <div className="fade-in">
            <div className="subnav">
              <button className={`subnav-btn ${subPage === "list" ? "active" : ""}`} onClick={() => setSubPage("list")}>Вакансии</button>
              {selectedJob && <button className={`subnav-btn ${subPage === "detail" ? "active" : ""}`} onClick={() => setSubPage("detail")}>Кандидаты ({candidates.length})</button>}
              {selectedJob && results.length > 0 && <button className={`subnav-btn ${subPage === "results" ? "active" : ""}`} onClick={() => setSubPage("results")}>Результаты AI</button>}
              {selectedJob && <button className={`subnav-btn ${subPage === "slots" ? "active" : ""}`} onClick={() => setSubPage("slots")}>Слоты ({slots.length})</button>}
            </div>

            {/* Список вакансий */}
            {subPage === "list" && (
              <>
                <div className="card">
                  <div className="section-title" style={{ marginBottom: "20px" }}>Создать вакансию</div>
                  {error && <div className="alert alert-error"><IconAlert size={14} />{error}</div>}
                  {success && <div className="alert alert-success"><IconCheck size={14} />{success}</div>}
                  <label className="field-label">Название позиции</label>
                  <input className="field" placeholder="Senior Python Developer" value={jobForm.title}
                    onChange={e => setJobForm({ ...jobForm, title: e.target.value })} />
                  <label className="field-label">Описание</label>
                  <textarea className="field" placeholder="Опишите позицию..." value={jobForm.description}
                    onChange={e => setJobForm({ ...jobForm, description: e.target.value })} />
                  <label className="field-label">Критерии отбора (AI будет по ним оценивать)</label>
                  <textarea className="field" placeholder="3+ лет Python, FastAPI, PostgreSQL..." value={jobForm.criteria}
                    onChange={e => setJobForm({ ...jobForm, criteria: e.target.value })} />
                  <button className="btn btn-primary" onClick={createJob}><IconPlus size={14} /> Создать вакансию</button>
                </div>

                <div className="section-title" style={{ margin: "28px 0 16px" }}>Активные вакансии</div>
                {jobs.length === 0 && <div className="empty-state">Вакансий пока нет</div>}
                {jobs.map(job => (
                  <div key={job.id} className="card card-interactive" onClick={() => selectJob(job)}>
                    <div style={{ fontWeight: 640, fontSize: "15.5px", color: "var(--text)", marginBottom: "6px" }}>{job.title}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13.5px", lineHeight: 1.6, marginBottom: "12px" }}>{job.description?.slice(0, 120)}...</div>
                    <span className="tag"><IconArrowRight size={12} /> Открыть</span>
                  </div>
                ))}
              </>
            )}

            {/* Кандидаты */}
            {subPage === "detail" && selectedJob && (
              <>
                <div className="card card-accent">
                  <div style={{ color: "var(--text)", fontSize: "18px", fontWeight: 620, marginBottom: "6px" }}>{selectedJob.title}</div>
                  <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Критерии: {selectedJob.criteria}</div>
                </div>

                <div className="card">
                  <div className="section-title" style={{ marginBottom: "18px" }}>Добавить кандидата</div>
                  {error && <div className="alert alert-error"><IconAlert size={14} />{error}</div>}
                  {success && <div className="alert alert-success"><IconCheck size={14} />{success}</div>}
                  <label className="field-label">Имя кандидата</label>
                  <input className="field" placeholder="Алия Сейткали" value={candidateForm.name}
                    onChange={e => setCandidateForm({ ...candidateForm, name: e.target.value })} />
                  <label className="field-label">Загрузить PDF резюме</label>
                  <label className={`dropzone ${pdfFile ? "filled" : ""}`}>
                    {pdfFile ? <><IconCheck size={15} /> {pdfFile.name}</> : <><IconFile size={15} /> Нажмите чтобы загрузить PDF</>}
                    <input type="file" accept=".pdf" style={{ display: "none" }} onChange={e => setPdfFile(e.target.files[0])} />
                  </label>
                  <label className="field-label">Или вставьте текст</label>
                  <textarea className="field" placeholder="Текст резюме..." value={candidateForm.resume}
                    onChange={e => setCandidateForm({ ...candidateForm, resume: e.target.value })} />
                  <button className="btn btn-primary" onClick={addCandidate}><IconPlus size={14} /> Добавить</button>
                </div>

                <div className="section-title" style={{ marginBottom: "14px" }}>Кандидаты ({candidates.length})</div>
                {candidates.length === 0 && <div className="empty-state">Кандидатов пока нет</div>}
                {candidates.map(cand => (
                  <div key={cand.id} className="card" style={{ padding: "18px 22px" }}>
                    <div style={{ fontWeight: 620, color: "var(--text)" }}>{cand.name}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "5px", lineHeight: 1.5 }}>{cand.resume?.slice(0, 120)}...</div>
                  </div>
                ))}

                {candidates.length > 0 && (
                  <div style={{ textAlign: "center", marginTop: "28px" }}>
                    <button className="btn btn-primary" style={{ padding: "13px 30px", fontSize: "14.5px" }} onClick={analyze} disabled={analyzing}>
                      {analyzing ? <><IconLoader size={15} className="spin" /> AI анализирует резюме...</> : <><IconSparkles size={15} /> Запустить AI анализ</>}
                    </button>
                    <div style={{ color: "var(--text-tertiary)", fontSize: "12px", marginTop: "10px" }}>AI оценит каждого кандидата по критериям вакансии</div>
                  </div>
                )}
              </>
            )}

            {/* Результаты */}
            {subPage === "results" && (
              <>
                <div ref={resultsRef} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "19px", fontWeight: 620, color: "var(--text)" }}>
                    <IconSparkles size={17} /> Результаты AI — {selectedJob?.title}
                  </div>
                  <span className="tag">{results.length} кандидатов</span>
                </div>

                <div className="card card-accent" style={{ marginBottom: "20px", padding: "16px 20px" }}>
                  <p style={{ color: "var(--text-secondary)", fontSize: "13px", margin: 0, lineHeight: 1.6 }}>
                    AI оценил резюме по базовым критериям. Финальное решение за вами — пригласите на интервью тех, кто вас заинтересовал.
                  </p>
                </div>

                {results.map((r, i) => {
                  const stTone = statusTone(r.status)
                  const scTone = scoreTone(r.score)
                  const rTone = rankTone(i)
                  return (
                    <div key={r.candidate_id} className={`card ${i === 0 ? "rank-highlight" : ""}`}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "18px" }}>
                        <div style={{ flex: 1, display: "flex", gap: "14px" }}>
                          <div className="rank-badge" style={rTone}>{i + 1}</div>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px", flexWrap: "wrap" }}>
                              <span style={{ fontWeight: 640, fontSize: "15.5px", color: "var(--text)" }}>{r.name}</span>
                              <span className="badge" style={{ background: stTone.bg, color: stTone.color, border: `1px solid ${stTone.border}` }}>
                                <span className="status-dot" style={{ background: stTone.color }} />{stTone.label}
                              </span>
                            </div>
                            <div style={{ color: "var(--text-secondary)", fontSize: "13px", lineHeight: "1.65", marginBottom: "16px" }}>{r.explanation}</div>
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button className="btn btn-sm btn-success-soft" onClick={() => updateStatus(r.candidate_id, 'invited')}><IconCheck size={13} /> Пригласить</button>
                              <button className="btn btn-sm btn-danger-soft" onClick={() => updateStatus(r.candidate_id, 'rejected')}><IconX size={13} /> Отклонить</button>
                              <button className="btn btn-sm btn-neutral-soft" onClick={() => { setBookingSlot(r.candidate_id); setSubPage("slots") }}><IconCalendar size={13} /> Назначить интервью</button>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: "center", minWidth: "92px" }}>
                          <div style={{ fontSize: "30px", fontWeight: 760, color: scTone.color, letterSpacing: "-0.03em" }}>{r.score}</div>
                          <div className="badge" style={{ background: scTone.bg, color: scTone.color, border: `1px solid ${scTone.border}` }}>{scTone.label}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                <div style={{ textAlign: "center", marginTop: "24px" }}>
                  <button className="btn btn-outline" onClick={() => setSubPage("list")}><IconChevronLeft size={14} /> К вакансиям</button>
                </div>
              </>
            )}

            {/* Слоты */}
            {subPage === "slots" && selectedJob && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: "9px", fontSize: "19px", fontWeight: 620, color: "var(--text)", marginBottom: "22px" }}>
                  <IconCalendar size={17} /> Слоты для интервью — {selectedJob.title}
                </div>

                {bookingSlot && (
                  <div className="card card-accent">
                    <p style={{ color: "var(--text)", fontWeight: 600, marginBottom: "14px", fontSize: "13.5px" }}>Выберите слот для кандидата:</p>
                    <div className="grid-2">
                      {slots.map(slot => (
                        <button key={slot.id} className="slot-btn" disabled={slot.is_booked} onClick={() => bookSlot(slot.id, bookingSlot)}>
                          {slot.is_booked ? <><IconLock size={13} /> Занят</> : <><IconClock size={13} /> {slot.datetime}</>}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="card">
                  <div className="section-title" style={{ marginBottom: "18px" }}>Добавить слот</div>
                  {error && <div className="alert alert-error"><IconAlert size={14} />{error}</div>}
                  {success && <div className="alert alert-success"><IconCheck size={14} />{success}</div>}
                  <input className="field" type="datetime-local" value={slotInput}
                    onChange={e => setSlotInput(e.target.value)} />
                  <button className="btn btn-primary" onClick={addSlot}><IconPlus size={14} /> Добавить слот</button>
                </div>

                <div className="section-title" style={{ marginBottom: "14px" }}>Текущие слоты</div>
                {slots.length === 0 && <div className="empty-state">Слотов пока нет</div>}
                <div className="grid-2">
                  {slots.map(slot => (
                    <div key={slot.id}
                      style={{ padding: "16px", borderRadius: "var(--radius-lg)", background: slot.is_booked ? "var(--green-soft)" : "var(--surface)", border: `1px solid ${slot.is_booked ? "var(--green-border)" : "var(--border)"}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "10px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "7px", fontWeight: 600, color: slot.is_booked ? "var(--green)" : "var(--text)", fontSize: "13.5px" }}>
                          {slot.is_booked ? <><IconCheck size={14} /> Забронирован</> : <><IconClock size={14} /> Свободен</>}
                        </div>
                        <div style={{ color: "var(--text-secondary)", fontSize: "13px", marginTop: "6px" }}>{slot.datetime}</div>
                      </div>
                      {!slot.is_booked && (
                        <button className="btn btn-sm btn-danger-soft" style={{ padding: "6px" }}
                          onClick={() => deleteSlot(slot.id)} aria-label="Удалить слот">
                          <IconX size={13} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
