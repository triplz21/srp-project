from sqlalchemy import Column, Integer, String, Text, DateTime, Float, ForeignKey, func
from database import Base

class User(Base):
    __tablename__ = 'users'
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(256), unique=True, index=True)
    password_hash = Column(String(256))
    name = Column(String(256))
    role = Column(String(16))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Message(Base):
    __tablename__ = 'messages'
    id = Column(Integer, primary_key=True, index=True)
    session_id = Column(String(64), index=True)
    role = Column(String(16))
    content = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Job(Base):
    __tablename__ = 'jobs'
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(256))
    description = Column(Text)
    criteria = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class InterviewSlot(Base):
    __tablename__ = 'interview_slots'
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'))
    datetime = Column(String(64))
    is_booked = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Candidate(Base):
    __tablename__ = 'candidates'
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'))
    name = Column(String(256))
    resume = Column(Text)
    status = Column(String(32), default='pending')
    slot_id = Column(Integer, ForeignKey('interview_slots.id'), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Result(Base):
    __tablename__ = 'results'
    id = Column(Integer, primary_key=True, index=True)
    job_id = Column(Integer, ForeignKey('jobs.id'))
    candidate_id = Column(Integer, ForeignKey('candidates.id'))
    score = Column(Float)
    explanation = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())