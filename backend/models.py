from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey, Enum
from sqlalchemy.orm import relationship
import enum
import uuid

from database import Base


def gen_id():
    return str(uuid.uuid4())


class DateStatus(str, enum.Enum):
    scheduled = "scheduled"
    awaiting_reflections = "awaiting_reflections"
    revealed = "revealed"


class Outcome(str, enum.Enum):
    mutual = "mutual"
    one_sided = "one_sided"
    no_interest = "no_interest"


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_id)
    username = Column(String, unique=True, index=True, nullable=True)
    name = Column(String, nullable=False)
    bio = Column(Text, nullable=True)
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Preference profile — updated by Claude after each reveal
    preference_summary = Column(Text, nullable=True)

    dates_as_user1 = relationship("Date", foreign_keys="Date.user1_id", back_populates="user1")
    dates_as_user2 = relationship("Date", foreign_keys="Date.user2_id", back_populates="user2")
    reflections = relationship("Reflection", back_populates="user")


class Date(Base):
    __tablename__ = "dates"

    id = Column(String, primary_key=True, default=gen_id)
    user1_id = Column(String, ForeignKey("users.id"), nullable=False)
    user2_id = Column(String, ForeignKey("users.id"), nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    location = Column(String, nullable=True)
    status = Column(Enum(DateStatus), default=DateStatus.scheduled, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user1 = relationship("User", foreign_keys=[user1_id], back_populates="dates_as_user1")
    user2 = relationship("User", foreign_keys=[user2_id], back_populates="dates_as_user2")
    reflections = relationship("Reflection", back_populates="date")
    reveal = relationship("Reveal", back_populates="date", uselist=False)


class Reflection(Base):
    __tablename__ = "reflections"

    id = Column(String, primary_key=True, default=gen_id)
    date_id = Column(String, ForeignKey("dates.id"), nullable=False)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    # 1–5 rating
    rating = Column(Integer, nullable=False)
    # free-text answer to the AI-generated reflection prompt
    notes = Column(Text, nullable=True)
    would_see_again = Column(String, nullable=False)  # "yes" | "no" | "maybe"
    submitted_at = Column(DateTime, default=datetime.utcnow)

    date = relationship("Date", back_populates="reflections")
    user = relationship("User", back_populates="reflections")


class Reveal(Base):
    __tablename__ = "reveals"

    id = Column(String, primary_key=True, default=gen_id)
    date_id = Column(String, ForeignKey("dates.id"), nullable=False, unique=True)
    outcome = Column(Enum(Outcome), nullable=False)
    # Claude-generated outcome message shown to both users
    outcome_message = Column(Text, nullable=False)
    # Claude-generated next step — only populated for mutual outcomes
    next_step_suggestion = Column(Text, nullable=True)
    revealed_at = Column(DateTime, default=datetime.utcnow)

    date = relationship("Date", back_populates="reveal")
