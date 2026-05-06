import re
from dotenv import load_dotenv
load_dotenv()  # must be first — loads .env before any os.environ reads

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.orm import Session

import models
import schemas
import claude_client
from database import engine, get_db
from auth import (
    hash_password, verify_password, create_access_token, get_current_user
)

models.Base.metadata.create_all(bind=engine)

# Additive migrations
with engine.connect() as _conn:
    for stmt in [
        "ALTER TABLE reveals ADD COLUMN next_step_suggestion TEXT",
        "ALTER TABLE users ADD COLUMN username TEXT",
        "ALTER TABLE users ADD COLUMN password_hash TEXT",
    ]:
        try:
            _conn.execute(text(stmt))
            _conn.commit()
        except Exception:
            pass  # column already exists

app = FastAPI(title="Echo API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Auth ──────────────────────────────────────────────────────────────────

_USERNAME_RE = re.compile(r'^[a-z0-9_]{3,20}$')


@app.post("/auth/register", response_model=schemas.Token, status_code=201)
def register(body: schemas.UserRegister, db: Session = Depends(get_db)):
    username = body.username.lower().lstrip("@").strip()
    if not _USERNAME_RE.match(username):
        raise HTTPException(
            status_code=400,
            detail="Username must be 3-20 characters: letters, numbers, underscores only.",
        )
    if db.query(models.User).filter(models.User.username == username).first():
        raise HTTPException(status_code=409, detail="That username is already taken.")
    user = models.User(
        username=username,
        name=body.name,
        bio=body.bio,
        password_hash=hash_password(body.password),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_access_token(user.id)
    return schemas.Token(
        access_token=token, user_id=user.id,
        username=user.username, name=user.name,
    )


@app.post("/auth/login", response_model=schemas.Token)
def login(body: schemas.UserLogin, db: Session = Depends(get_db)):
    username = body.username.lower().lstrip("@").strip()
    user = db.query(models.User).filter(models.User.username == username).first()
    # Constant-time failure prevents username enumeration
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(user.id)
    return schemas.Token(
        access_token=token, user_id=user.id,
        username=user.username, name=user.name,
    )


@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user


@app.delete("/auth/account", status_code=204)
def delete_account(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    date_ids = [
        d.id for d in db.query(models.Date).filter(
            (models.Date.user1_id == current_user.id) | (models.Date.user2_id == current_user.id)
        ).all()
    ]
    if date_ids:
        db.query(models.Reveal).filter(models.Reveal.date_id.in_(date_ids)).delete(synchronize_session=False)
        db.query(models.Reflection).filter(models.Reflection.date_id.in_(date_ids)).delete(synchronize_session=False)
        db.query(models.Date).filter(models.Date.id.in_(date_ids)).delete(synchronize_session=False)
    db.delete(current_user)
    db.commit()


# ── Users ──────────────────────────────────────────────────────────────────

@app.get("/users/by-username/{username}", response_model=schemas.UserOut)
def get_user_by_username(
    username: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    clean = username.lower().lstrip("@")
    user = db.query(models.User).filter(models.User.username == clean).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/users/{user_id}", response_model=schemas.UserOut)
def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    _: models.User = Depends(get_current_user),
):
    user = db.get(models.User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


# ── Dates ──────────────────────────────────────────────────────────────────

@app.post("/dates", response_model=schemas.DateOut, status_code=201)
def create_date(
    body: schemas.DateCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.user1_id != current_user.id and body.user2_id != current_user.id:
        raise HTTPException(status_code=403, detail="You must be a participant in the date")
    if not db.get(models.User, body.user1_id):
        raise HTTPException(status_code=404, detail="user1 not found")
    if not db.get(models.User, body.user2_id):
        raise HTTPException(status_code=404, detail="user2 not found")
    if body.user1_id == body.user2_id:
        raise HTTPException(status_code=400, detail="A user cannot date themselves")

    date = models.Date(
        user1_id=body.user1_id,
        user2_id=body.user2_id,
        scheduled_at=body.scheduled_at,
        location=body.location,
        status=models.DateStatus.scheduled,
    )
    db.add(date)
    db.commit()
    db.refresh(date)
    return date


@app.get("/dates/{date_id}", response_model=schemas.DateOut)
def get_date(
    date_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    date = db.get(models.Date, date_id)
    if not date:
        raise HTTPException(status_code=404, detail="Date not found")
    if current_user.id not in (date.user1_id, date.user2_id):
        raise HTTPException(status_code=403, detail="Not a participant in this date")
    return date


# ── Reflection Prompt ──────────────────────────────────────────────────────

@app.get("/dates/{date_id}/reflection-prompt", response_model=schemas.ReflectionPromptOut)
def get_reflection_prompt(
    date_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    date = db.get(models.Date, date_id)
    if not date:
        raise HTTPException(status_code=404, detail="Date not found")
    if current_user.id not in (date.user1_id, date.user2_id):
        raise HTTPException(status_code=403, detail="User was not on this date")

    match_id = date.user2_id if current_user.id == date.user1_id else date.user1_id
    match = db.get(models.User, match_id)

    prompt = claude_client.generate_reflection_prompt(
        user_name=current_user.name,
        match_name=match.name,
        location=date.location,
    )
    return {"prompt": prompt}


# ── Reflections ────────────────────────────────────────────────────────────

@app.post("/feedback", response_model=schemas.ReflectionOut, status_code=201)
def submit_feedback(
    body: schemas.FeedbackSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot submit on behalf of another user")
    return _do_reflect(
        date_id=body.date_id, user_id=current_user.id,
        rating=body.rating, notes=body.notes,
        would_see_again=body.would_see_again, db=db,
    )


@app.post("/dates/{date_id}/reflect", response_model=schemas.ReflectionOut, status_code=201)
def submit_reflection(
    date_id: str,
    body: schemas.ReflectionSubmit,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if body.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot submit on behalf of another user")
    return _do_reflect(
        date_id=date_id, user_id=current_user.id,
        rating=body.rating, notes=body.notes,
        would_see_again=body.would_see_again, db=db,
    )


def _do_reflect(*, date_id: str, user_id: str, rating: int, notes, would_see_again: str,
                db: Session):
    date = db.get(models.Date, date_id)
    if not date:
        raise HTTPException(status_code=404, detail="Date not found")

    if user_id not in (date.user1_id, date.user2_id):
        raise HTTPException(status_code=403, detail="User was not on this date")

    existing = (
        db.query(models.Reflection)
        .filter_by(date_id=date_id, user_id=user_id)
        .first()
    )
    if existing:
        raise HTTPException(status_code=409, detail="Reflection already submitted")

    reflection = models.Reflection(
        date_id=date_id,
        user_id=user_id,
        rating=rating,
        notes=notes,
        would_see_again=would_see_again,
    )
    db.add(reflection)

    if date.status == models.DateStatus.scheduled:
        date.status = models.DateStatus.awaiting_reflections

    db.commit()
    db.refresh(reflection)

    reflections = db.query(models.Reflection).filter_by(date_id=date_id).all()
    if len(reflections) == 2:
        _trigger_reveal(date, reflections, db)

    return reflection


def _trigger_reveal(date: models.Date, reflections: list, db: Session):
    r1 = next(r for r in reflections if r.user_id == date.user1_id)
    r2 = next(r for r in reflections if r.user_id == date.user2_id)

    both_yes = r1.would_see_again == "yes" and r2.would_see_again == "yes"
    neither_yes = r1.would_see_again == "no" and r2.would_see_again == "no"

    if both_yes:
        outcome = models.Outcome.mutual
    elif neither_yes:
        outcome = models.Outcome.no_interest
    else:
        outcome = models.Outcome.one_sided

    outcome_message = claude_client.generate_outcome_message(
        outcome=outcome.value,
        user1_name=date.user1.name,
        user2_name=date.user2.name,
        user1_rating=r1.rating,
        user2_rating=r2.rating,
    )

    next_step = None
    if outcome == models.Outcome.mutual:
        next_step = claude_client.generate_next_step(
            user1_name=date.user1.name,
            user2_name=date.user2.name,
            location=date.location,
            user1_notes=r1.notes,
            user2_notes=r2.notes,
        )

    reveal = models.Reveal(
        date_id=date.id,
        outcome=outcome,
        outcome_message=outcome_message,
        next_step_suggestion=next_step,
    )
    db.add(reveal)
    date.status = models.DateStatus.revealed

    for reflection, user in [(r1, date.user1), (r2, date.user2)]:
        match = date.user2 if user.id == date.user1_id else date.user1
        updated_summary = claude_client.infer_preference_update(
            existing_summary=user.preference_summary,
            match_name=match.name,
            rating=reflection.rating,
            notes=reflection.notes,
            would_see_again=reflection.would_see_again,
        )
        user.preference_summary = updated_summary

    db.commit()


# ── Reveal ─────────────────────────────────────────────────────────────────

@app.get("/dates/{date_id}/reveal", response_model=schemas.RevealOut)
def get_reveal(
    date_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    date = db.get(models.Date, date_id)
    if not date:
        raise HTTPException(status_code=404, detail="Date not found")
    if current_user.id not in (date.user1_id, date.user2_id):
        raise HTTPException(status_code=403, detail="User was not on this date")
    if not date.reveal:
        raise HTTPException(status_code=202, detail="Waiting for both reflections")
    return date.reveal


# ── History ────────────────────────────────────────────────────────────────

@app.get("/users/{user_id}/history")
def get_user_history(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Cannot view another user's history")

    all_dates = (
        db.query(models.Date)
        .filter(
            (models.Date.user1_id == current_user.id) | (models.Date.user2_id == current_user.id)
        )
        .order_by(models.Date.scheduled_at.desc())
        .all()
    )

    reflected_date_ids = {
        r.date_id for r in db.query(models.Reflection.date_id)
        .filter(models.Reflection.user_id == current_user.id)
        .all()
    }

    history = []
    for date in all_dates:
        match_id = date.user2_id if date.user1_id == current_user.id else date.user1_id
        match = db.get(models.User, match_id)
        entry = {
            "date_id": date.id,
            "match_name": match.name,
            "scheduled_at": date.scheduled_at.isoformat(),
            "location": date.location,
            "status": date.status.value,
            "has_reflected": date.id in reflected_date_ids,
            "outcome": date.reveal.outcome.value if date.reveal else None,
            "outcome_message": date.reveal.outcome_message if date.reveal else None,
        }
        history.append(entry)

    return history
