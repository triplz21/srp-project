import { useState } from "react"
import { apiFetch } from "./api"

function Icon({ path, size = 16, className, style }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round" className={className} style={style}>
      {path}
    </svg>
  )
}

const IconZap = (p) => <Icon {...p} path={<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />} />
const IconAlert = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>} />
const IconLoader = (p) => <Icon {...p} path={<><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></>} />

export default function AuthScreen({ onAuthSuccess }) {
  const [mode, setMode] = useState("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [role, setRole] = useState("candidate")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit() {
    if (!email.trim() || !password || (mode === "register" && !name.trim())) {
      setError("Заполните все поля")
      return
    }
    setLoading(true)
    setError("")
    const path = mode === "login" ? "/auth/login" : "/auth/register"
    const body = mode === "login" ? { email, password } : { email, password, name, role }
    try {
      const res = await apiFetch(path, { method: "POST", body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok) {
        setError(typeof data.detail === "string" ? data.detail : "Ошибка авторизации")
        setLoading(false)
        return
      }
      onAuthSuccess(data)
    } catch {
      setError("Не удалось связаться с сервером")
      setLoading(false)
    }
  }

  function onKeyDown(e) {
    if (e.key === "Enter") submit()
  }

  return (
    <div className="auth-page">
      <div className="card auth-card fade-in">
        <div className="logo" style={{ justifyContent: "center", marginBottom: "24px" }}>
          <span className="logo-mark"><IconZap size={16} /></span>
          Talent AI
        </div>

        <div className="tab-switcher" style={{ width: "100%", marginBottom: "22px" }}>
          <button className={`tab-btn ${mode === "login" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setMode("login"); setError("") }}>Вход</button>
          <button className={`tab-btn ${mode === "register" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { setMode("register"); setError("") }}>Регистрация</button>
        </div>

        {error && <div className="alert alert-error"><IconAlert size={14} />{error}</div>}

        <label className="field-label">Email</label>
        <input className="field" type="email" placeholder="you@example.com" value={email}
          onChange={e => setEmail(e.target.value)} onKeyDown={onKeyDown} />

        <label className="field-label">Пароль</label>
        <input className="field" type="password" placeholder="••••••••" value={password}
          onChange={e => setPassword(e.target.value)} onKeyDown={onKeyDown} />

        {mode === "register" && (
          <>
            <label className="field-label">Имя</label>
            <input className="field" placeholder="Алия Сейткали" value={name}
              onChange={e => setName(e.target.value)} onKeyDown={onKeyDown} />

            <label className="field-label">Я — </label>
            <div className="tab-switcher" style={{ width: "100%", marginBottom: "18px" }}>
              <button type="button" className={`tab-btn ${role === "candidate" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setRole("candidate")}>Кандидат</button>
              <button type="button" className={`tab-btn ${role === "employer" ? "active" : ""}`} style={{ flex: 1, justifyContent: "center" }}
                onClick={() => setRole("employer")}>Работодатель</button>
            </div>
          </>
        )}

        <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center", marginTop: "6px" }}
          onClick={submit} disabled={loading}>
          {loading ? <IconLoader size={15} className="spin" /> : null}
          {mode === "login" ? "Войти" : "Зарегистрироваться"}
        </button>
      </div>
    </div>
  )
}
