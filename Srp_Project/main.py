from __future__ import annotations
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import engine, Base, get_db
import models
import fitz
from models import Job, Candidate, Result
from services.oylan import send_message
from services.chat import save_message, get_history

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:5174", "http://localhost:3000", "https://srp-project.vercel.app"],
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

@app.on_event('startup')
async def startup():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

# ── Чат ──────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str
    session_id: str = 'default'

@app.get('/')
def root(): return {'message': 'Talent AI is running!'}

@app.get('/health')
def health(): return {'status': 'ok'}

@app.post('/chat')
async def chat(req: ChatRequest, db: AsyncSession = Depends(get_db)):
    if not req.message.strip():
        raise HTTPException(400, detail='Message cannot be empty')
    try:
        history = await get_history(db, req.session_id)
        reply = await send_message(req.message, history)
        await save_message(db, req.session_id, 'user', req.message)
        await save_message(db, req.session_id, 'assistant', reply)
        return {'reply': reply, 'session_id': req.session_id}
    except Exception as e:
        raise HTTPException(500, detail=str(e))

@app.get('/history/{session_id}')
async def history(session_id: str, db: AsyncSession = Depends(get_db)):
    msgs = await get_history(db, session_id, limit=50)
    return {'session_id': session_id, 'messages': msgs}

# ── Вакансии ─────────────────────────────────────────
class JobCreate(BaseModel):
    title: str
    description: str
    criteria: str

@app.post('/jobs')
async def create_job(data: JobCreate, db: AsyncSession = Depends(get_db)):
    job = Job(title=data.title, description=data.description, criteria=data.criteria)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

@app.get('/jobs')
async def list_jobs(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).order_by(Job.created_at.desc()))
    return result.scalars().all()

@app.get('/jobs/{job_id}')
async def get_job(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, detail='Job not found')
    return job

# ── Кандидаты ────────────────────────────────────────
@app.post('/candidates')
async def create_candidate(
    job_id: str = Form(...),
    name: str = Form(...),
    resume_text: str = Form(""),
    file: UploadFile = File(None),
    db: AsyncSession = Depends(get_db)
):
    job_id_int = int(job_id)

    existing = await db.execute(
        select(Candidate).where(Candidate.job_id == job_id_int, Candidate.name == name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail='Кандидат с таким именем уже добавлен')

    if file and file.filename.endswith('.pdf'):
        contents = await file.read()
        doc = fitz.open(stream=contents, filetype="pdf")
        resume_text = ""
        for page in doc:
            resume_text += page.get_text()

    if not resume_text.strip():
        raise HTTPException(400, detail='Резюме не может быть пустым')

    candidate = Candidate(job_id=job_id_int, name=name, resume=resume_text)
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate

@app.get('/jobs/{job_id}/candidates')
async def list_candidates(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    return result.scalars().all()

# ── Анализ ───────────────────────────────────────────
@app.post('/jobs/{job_id}/analyze')
async def analyze(job_id: int, db: AsyncSession = Depends(get_db)):
    job_result = await db.execute(select(Job).where(Job.id == job_id))
    job = job_result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, detail='Job not found')

    candidates_result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    candidates = candidates_result.scalars().all()

    if not candidates:
        raise HTTPException(400, detail='No candidates found')

    results = []
    for candidate in candidates:
        prompt = f"""You are an HR expert. Analyze this resume against the job criteria and give a score from 0 to 100.

Job Title: {job.title}
Job Description: {job.description}
Required Criteria: {job.criteria}

Candidate Name: {candidate.name}
Resume: {candidate.resume}

Respond ONLY in this exact format:
SCORE: [number 0-100]
EXPLANATION: [2-3 sentences explaining the score]"""

        reply = await send_message(prompt)

        score = 0.0
        explanation = reply
        for line in reply.split('\n'):
            if line.startswith('SCORE:'):
                try:
                    score = float(line.replace('SCORE:', '').strip())
                except:
                    pass
            if line.startswith('EXPLANATION:'):
                explanation = line.replace('EXPLANATION:', '').strip()

        existing = await db.execute(
            select(Result).where(Result.job_id == job_id, Result.candidate_id == candidate.id)
        )
        existing_result = existing.scalar_one_or_none()

        if existing_result:
            existing_result.score = score
            existing_result.explanation = explanation
        else:
            result = Result(job_id=job_id, candidate_id=candidate.id, score=score, explanation=explanation)
            db.add(result)

        await db.commit()
        results.append({'candidate': candidate.name, 'score': score, 'explanation': explanation})

    return {'job_id': job_id, 'results': sorted(results, key=lambda x: x['score'], reverse=True)}

# ── Результаты ───────────────────────────────────────
@app.get('/jobs/{job_id}/results')
async def get_results(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Result, Candidate)
        .join(Candidate, Result.candidate_id == Candidate.id)
        .where(Result.job_id == job_id)
        .order_by(Result.score.desc())
    )
    rows = result.all()
    return {
        'job_id': job_id,
        'results': [
            {
                'candidate_id': r.Candidate.id,
                'name': r.Candidate.name,
                'score': r.Result.score,
                'explanation': r.Result.explanation
            }
            for r in rows
        ]
    }