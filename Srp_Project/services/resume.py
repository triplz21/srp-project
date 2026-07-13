from __future__ import annotations
import logging
import fitz
from fastapi import HTTPException
from services.oylan import send_pdf_message, OylanQuotaExceeded, OylanBadRequest

logger = logging.getLogger(__name__)

MIN_TEXT_LENGTH = 50
MIN_TRANSCRIPTION_LENGTH = 30
MAX_PDF_PAGES = 10
MAX_PDF_SIZE_BYTES = 20 * 1024 * 1024


def build_analysis_prompt(job, candidate_name: str, resume_text: str) -> str:
    return f"""You are an HR expert. Analyze this resume against the job criteria and give a score from 0 to 100.

Job Title: {job.title}
Job Description: {job.description}
Required Criteria: {job.criteria}

Candidate Name: {candidate_name}
Resume: {resume_text}

Respond ONLY in this exact format:
SCORE: [number 0-100]
EXPLANATION: [2-3 sentences explaining the score]"""


def build_transcription_prompt() -> str:
    return ('Извлеки весь текст из этого документа дословно, сохраняя структуру '
            '(разделы, списки). Документ может быть на казахском, русском или '
            'английском. Верни только извлечённый текст, без комментариев и выводов.')


async def extract_or_route_resume(contents: bytes, filename: str) -> str:
    """Extracts resume text locally, or - for scanned PDFs with no extractable
    text - routes the PDF file itself to Oylan for transcription."""
    if len(contents) > MAX_PDF_SIZE_BYTES:
        raise HTTPException(400, detail='Файл больше 20MB')

    doc = fitz.open(stream=contents, filetype='pdf')
    if len(doc) > MAX_PDF_PAGES:
        raise HTTPException(400, detail='PDF слишком длинный: максимум 10 страниц')

    extracted = ''
    for page in doc:
        extracted += page.get_text()

    if len(extracted.strip()) >= MIN_TEXT_LENGTH:
        return extracted

    prompt = build_transcription_prompt()
    try:
        transcribed = await send_pdf_message(contents, filename, prompt)
    except OylanQuotaExceeded:
        raise HTTPException(503, detail='Лимит AI-токенов исчерпан, попробуйте позже')
    except OylanBadRequest as e:
        logger.error('Oylan returned 400 for scanned PDF %r: %s', filename, e.body)
        raise HTTPException(400, detail='Не удалось обработать PDF')

    if len(transcribed.strip()) < MIN_TRANSCRIPTION_LENGTH:
        raise HTTPException(400, detail='Не удалось распознать текст в PDF')

    return transcribed
