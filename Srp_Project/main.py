from __future__ import annotations
from fastapi import FastAPI, HTTPException, Depends, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from database import engine, Base, get_db
import models
from models import Job, Candidate, Result, InterviewSlot, User
from services.oylan import send_message
from services.chat import save_message, get_history
from services.resume import extract_or_route_resume, build_analysis_prompt
from auth import hash_password, verify_password, create_access_token, get_current_user, require_role

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

class ChatRequest(BaseModel):
    message: str
    session_id: str = 'default'

@app.get('/')
def root(): return {'message': 'Talent AI is running!'}

@app.get('/health')
def health(): return {'status': 'ok'}

# ── Авторизация ──────────────────────────────────────
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str
    role: str

class LoginRequest(BaseModel):
    email: str
    password: str

@app.post('/auth/register')
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == data.email))
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail='Email уже занят')

    user = User(
        email=data.email,
        password_hash=hash_password(data.password),
        name=data.name,
        role=data.role,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)

    token = create_access_token({'sub': str(user.id)})
    return {'access_token': token, 'token_type': 'bearer', 'role': user.role, 'name': user.name}

@app.post('/auth/login')
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(401, detail='Неверный email или пароль')

    token = create_access_token({'sub': str(user.id)})
    return {'access_token': token, 'token_type': 'bearer', 'role': user.role, 'name': user.name}

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
async def create_job(
    data: JobCreate,
    current_user: User = Depends(require_role('employer')),
    db: AsyncSession = Depends(get_db),
):
    job = Job(title=data.title, description=data.description, criteria=data.criteria, owner_id=current_user.id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    return job

async def get_owned_job(job_id: int, current_user: User, db: AsyncSession) -> Job:
    result = await db.execute(select(Job).where(Job.id == job_id))
    job = result.scalar_one_or_none()
    if not job:
        raise HTTPException(404, detail='Job not found')
    if job.owner_id is None:
        raise HTTPException(403, detail='Вакансия создана до введения аккаунтов')
    if job.owner_id != current_user.id:
        raise HTTPException(403, detail='Вы не являетесь владельцем этой вакансии')
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

# ── Слоты на интервью ────────────────────────────────
class SlotCreate(BaseModel):
    job_id: int
    datetimes: list[str]

@app.post('/slots')
async def create_slots(
    data: SlotCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_job(data.job_id, current_user, db)
    for dt in data.datetimes:
        slot = InterviewSlot(job_id=data.job_id, datetime=dt)
        db.add(slot)
    await db.commit()
    return {'message': f'{len(data.datetimes)} слотов создано'}

@app.get('/jobs/{job_id}/slots')
async def get_slots(job_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(InterviewSlot).where(InterviewSlot.job_id == job_id)
    )
    return result.scalars().all()

@app.delete('/slots/{slot_id}')
async def delete_slot(
    slot_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    slot_result = await db.execute(select(InterviewSlot).where(InterviewSlot.id == slot_id))
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, detail='Слот не найден')
    await get_owned_job(slot.job_id, current_user, db)
    if slot.is_booked:
        raise HTTPException(400, detail='Нельзя удалить забронированный слот')
    await db.delete(slot)
    await db.commit()
    return {'message': 'Слот удалён'}

@app.post('/slots/{slot_id}/book')
async def book_slot(
    slot_id: int,
    current_user: User = Depends(require_role('candidate')),
    db: AsyncSession = Depends(get_db),
):
    slot_result = await db.execute(select(InterviewSlot).where(InterviewSlot.id == slot_id))
    slot = slot_result.scalar_one_or_none()
    if not slot:
        raise HTTPException(404, detail='Слот не найден')
    if slot.is_booked:
        raise HTTPException(400, detail='Слот уже занят')

    candidate_result = await db.execute(
        select(Candidate).where(Candidate.job_id == slot.job_id, Candidate.user_id == current_user.id)
    )
    candidate = candidate_result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(403, detail='У вас нет отклика на эту вакансию')
    if candidate.status != 'invited':
        raise HTTPException(400, detail='Бронирование доступно только после приглашения на интервью')

    slot.is_booked = 1
    candidate.slot_id = slot_id
    await db.commit()
    return {'message': 'Слот забронирован', 'datetime': slot.datetime}

# ── Кандидаты ────────────────────────────────────────
@app.post('/candidates')
async def create_candidate(
    job_id: str = Form(...),
    name: str = Form(...),
    resume_text: str = Form(""),
    file: UploadFile = File(None),
    current_user: User = Depends(require_role('candidate')),
    db: AsyncSession = Depends(get_db)
):
    job_id_int = int(job_id)
    existing = await db.execute(
        select(Candidate).where(Candidate.job_id == job_id_int, Candidate.name == name)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(400, detail='Кандидат с таким именем уже добавлен')

    if file and file.filename and file.filename.endswith('.pdf'):
        contents = await file.read()
        if contents:
            resume_text = await extract_or_route_resume(contents, file.filename)

    if not resume_text.strip():
        raise HTTPException(400, detail='Резюме не может быть пустым')

    candidate = Candidate(job_id=job_id_int, name=name, resume=resume_text, user_id=current_user.id)
    db.add(candidate)
    await db.commit()
    await db.refresh(candidate)
    return candidate

@app.get('/jobs/{job_id}/candidates')
async def list_candidates(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_job(job_id, current_user, db)
    result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    return result.scalars().all()

@app.patch('/candidates/{candidate_id}/status')
async def update_status(
    candidate_id: int,
    status: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Candidate).where(Candidate.id == candidate_id))
    candidate = result.scalar_one_or_none()
    if not candidate:
        raise HTTPException(404, detail='Кандидат не найден')
    await get_owned_job(candidate.job_id, current_user, db)
    candidate.status = status
    await db.commit()
    return candidate

# ── Анализ ───────────────────────────────────────────
@app.post('/jobs/{job_id}/analyze')
async def analyze(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    job = await get_owned_job(job_id, current_user, db)

    candidates_result = await db.execute(select(Candidate).where(Candidate.job_id == job_id))
    candidates = candidates_result.scalars().all()
    if not candidates:
        raise HTTPException(400, detail='No candidates found')

    results = []
    for candidate in candidates:
        prompt = build_analysis_prompt(job, candidate.name, candidate.resume)
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
        results.append({'candidate_id': candidate.id, 'candidate': candidate.name, 'score': score, 'explanation': explanation})

    return {'job_id': job_id, 'results': sorted(results, key=lambda x: x['score'], reverse=True)}

# ── Результаты ───────────────────────────────────────
@app.get('/jobs/{job_id}/results')
async def get_results(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_owned_job(job_id, current_user, db)
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
                'explanation': r.Result.explanation,
                'status': r.Candidate.status,
                'slot_id': r.Candidate.slot_id,
            }
            for r in rows
        ]
    }

# ── Мои отклики ──────────────────────────────────────
@app.get('/me/applications')
async def my_applications(
    current_user: User = Depends(require_role('candidate')),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Candidate, Job)
        .join(Job, Candidate.job_id == Job.id)
        .where(Candidate.user_id == current_user.id)
        .order_by(Candidate.created_at.desc())
    )
    rows = result.all()

    applications = []
    for candidate, job in rows:
        score_result = await db.execute(
            select(Result.score).where(Result.job_id == job.id, Result.candidate_id == candidate.id)
        )
        score = score_result.scalar_one_or_none()

        booked_slot = None
        if candidate.slot_id:
            slot_result = await db.execute(select(InterviewSlot).where(InterviewSlot.id == candidate.slot_id))
            slot = slot_result.scalar_one_or_none()
            if slot:
                booked_slot = {'id': slot.id, 'datetime': slot.datetime}

        available_slots = []
        if candidate.status == 'invited':
            slots_result = await db.execute(
                select(InterviewSlot).where(InterviewSlot.job_id == job.id, InterviewSlot.is_booked == 0)
            )
            available_slots = [{'id': s.id, 'datetime': s.datetime} for s in slots_result.scalars().all()]

        applications.append({
            'id': candidate.id,
            'job_title': job.title,
            'status': candidate.status,
            'score': score,
            'booked_slot': booked_slot,
            'available_slots': available_slots,
        })

    return applications