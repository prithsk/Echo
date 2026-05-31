import re
from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, field_validator


def _require_uuid(v: str) -> str:
    try:
        val = UUID(v)
    except (ValueError, AttributeError):
        raise ValueError('Invalid ID format')
    return str(val)


def _strip_tags(v: str) -> str:
    """Remove HTML/script tags from free-text user input."""
    return re.sub(r'<[^>]+>', '', v).strip()


# ── Auth ───────────────────────────────────────────────────────────────────

class UserRegister(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=8, max_length=128)
    bio: Optional[str] = Field(None, max_length=500)

    @field_validator('password')
    @classmethod
    def validate_password_strength(cls, v):
        errors = []
        if not re.search(r'[A-Z]', v):
            errors.append('one uppercase letter')
        if not re.search(r'[a-z]', v):
            errors.append('one lowercase letter')
        if not re.search(r'\d', v):
            errors.append('one number')
        if errors:
            raise ValueError(f"Password must contain at least {', '.join(errors)}")
        return v

    @field_validator('name', 'bio', mode='before')
    @classmethod
    def sanitize_register_text(cls, v):
        if v is None:
            return v
        return _strip_tags(str(v))


class UserLogin(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    password: str = Field(..., min_length=1, max_length=128)


class AuthResponse(BaseModel):
    user_id: str
    username: str
    name: str


# ── Users ──────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str = Field(..., min_length=3, max_length=20)
    name: str = Field(..., min_length=1, max_length=100)
    bio: Optional[str] = Field(None, max_length=500)

    @field_validator('name', 'bio', mode='before')
    @classmethod
    def sanitize_text(cls, v):
        if v is None:
            return v
        return _strip_tags(str(v))


class UserOut(BaseModel):
    id: str
    username: Optional[str]
    name: str
    bio: Optional[str]
    preference_summary: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Dates ──────────────────────────────────────────────────────────────────

class DateCreate(BaseModel):
    user1_id: str
    user2_id: str
    scheduled_at: datetime
    location: Optional[str] = Field(None, max_length=200)

    @field_validator('user1_id', 'user2_id')
    @classmethod
    def validate_ids(cls, v):
        return _require_uuid(v)

    @field_validator('location', mode='before')
    @classmethod
    def sanitize_location(cls, v):
        if v is None:
            return v
        return _strip_tags(str(v))


class DateOut(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    scheduled_at: datetime
    location: Optional[str]
    status: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Reflections ────────────────────────────────────────────────────────────

class ReflectionSubmit(BaseModel):
    user_id: str
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=2000)
    would_see_again: str = Field(..., pattern=r'^(yes|no|maybe)$')

    @field_validator('user_id')
    @classmethod
    def validate_id(cls, v):
        return _require_uuid(v)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_notes(cls, v):
        if v is None:
            return v
        return _strip_tags(str(v))


class FeedbackSubmit(BaseModel):
    date_id: str
    user_id: str
    rating: int = Field(..., ge=1, le=5)
    notes: Optional[str] = Field(None, max_length=2000)
    would_see_again: str = Field(..., pattern=r'^(yes|no|maybe)$')

    @field_validator('date_id', 'user_id')
    @classmethod
    def validate_ids(cls, v):
        return _require_uuid(v)

    @field_validator('notes', mode='before')
    @classmethod
    def sanitize_notes(cls, v):
        if v is None:
            return v
        return _strip_tags(str(v))


class ReflectionOut(BaseModel):
    id: str
    date_id: str
    user_id: str
    rating: int
    notes: Optional[str]
    would_see_again: str
    submitted_at: datetime

    model_config = {"from_attributes": True}


# ── Reveals ────────────────────────────────────────────────────────────────

class RevealOut(BaseModel):
    id: str
    date_id: str
    outcome: str
    outcome_message: str
    next_step_suggestion: Optional[str]
    revealed_at: datetime

    model_config = {"from_attributes": True}


# ── Reflection Prompt ──────────────────────────────────────────────────────

class ReflectionPromptOut(BaseModel):
    prompt: str

class AuthResponse(BaseModel):
    user_id: str
    username: str
    name: str
