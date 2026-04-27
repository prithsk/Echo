# Echo — Ditto's Post-Date Intelligence Layer

## The Problem

Ditto already solves the hardest part: getting two people to actually show up. But the moment the date ends, every dating app abandons you.

Both people leave with the same unspoken question — *did they feel it too?* Neither wants to text first and look desperate. So nothing happens. The date just... dissolves.

That's the gap nobody has built for. Echo closes it.

## What It Does

Echo is a blind mutual reveal system that lives after the date:

1. Both users privately submit a reflection — a star rating, a free-text answer to an AI-generated question tailored to their specific date, and whether they'd see this person again
2. Neither person sees the other's response until both have submitted
3. The moment both reflections are in, Echo reveals the outcome to both simultaneously — mutual interest, one-sided, or no match — with an AI-written message shaped to the emotional weight of the result
4. For mutual outcomes, Claude suggests a concrete next step so the connection doesn't die in scheduling ambiguity
5. Every date updates a running preference profile for each user — so Echo gets smarter about what they're actually drawn to over time

No awkward "so did you like me?" text. No ghosting. No ambiguity.

## Architecture

```
frontend/          React + Vite
  src/
    pages/         Welcome, Dashboard, Reflect, Reveal
    components/    StarField (generative canvas bg), ParticleReveal (WebGPU/Canvas2D)
    api.js         Thin fetch wrapper — all API calls in one place

backend/
  main.py          FastAPI app — all routes
  models.py        SQLAlchemy ORM — User, Date, Reflection, Reveal
  schemas.py       Pydantic request/response models
  claude_client.py All Claude API calls — 4 distinct jobs
  database.py      SQLite engine + session factory
  echo.db          SQLite database (local)
```

**Data flow for a reveal:**
```
User A submits reflection
  → Reflection saved
  → Date status: scheduled → awaiting_reflections

User B submits reflection
  → Both reflections present → _trigger_reveal()
  → Claude generates outcome message (outcome-aware tone)
  → If mutual: Claude generates next-step suggestion
  → Claude updates preference profiles for both users
  → Reveal saved, date status: revealed
```

## Tech Choices

**FastAPI** — chosen for automatic OpenAPI docs, native Pydantic integration, and async-ready routing. For a feature demo that needs to move fast, it's the highest signal-to-noise Python web framework available.

**SQLite + SQLAlchemy** — no infrastructure overhead. The data model is relational (users → dates → reflections → reveals), so SQLite with SQLAlchemy ORM gives full relational integrity without spinning up Postgres for a demo. Trivially swappable in production.

**Claude (claude-sonnet-4-6)** — four distinct prompt jobs, each isolated in its own function:

| Job | When | What it produces |
|-----|------|-----------------|
| `generate_reflection_prompt` | Before user submits reflection | A single warm, personalized question about this specific date |
| `generate_outcome_message` | After both reflect | 2–3 sentence reveal message toned to the outcome (mutual / one-sided / no interest) |
| `generate_next_step` | Mutual outcomes only | One concrete, specific next-step suggestion for the pair |
| `infer_preference_update` | After every reveal | Updated running preference profile in second person |

Each job gets its own system prompt with explicit tone guidance. Sonnet 4.6 was chosen over Haiku for output quality on the emotionally sensitive reveal message — this is the moment that either makes the product feel human or kills it.

**React + Vite + Framer Motion** — Vite for fast iteration, Framer Motion for the reveal animation state machine (loading → waiting → sealed → cracking → blooming → revealed). AnimatePresence handles the exit/enter transitions between states so the animation logic stays declarative.

**ParticleReveal (WebGPU + Canvas 2D fallback)** — the mutual reveal burst uses WebGPU compute + render shaders when available (512 particles, GPU-side physics in WGSL), falling back to a Canvas 2D implementation (220 particles, CPU-side) when WebGPU isn't supported. The color palette adapts to the outcome — warm rose/amber for mutual, violet for one-sided, muted slate for no match.

**StarField** — a raw Canvas 2D generative background. 180 stars with independent twinkle frequencies and upward drift. Runs on `requestAnimationFrame`, self-cleans on unmount.

## Running Locally

**Backend**
```bash
cd backend
python -m venv venv
source venv/Scripts/activate   # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env           # add your ANTHROPIC_API_KEY
uvicorn main:app --reload
```

**Frontend**
```bash
cd frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`. The Vite dev server proxies `/api` → `http://localhost:8000`.

## The Demo Flow

1. Create two profiles (Welcome screen)
2. User A schedules a date using User B's ID (Dashboard → Schedule a Date)
3. User A reflects → gets an AI-generated reflection prompt → submits rating + notes + would-see-again
4. User B reflects (same flow from a different browser tab or incognito)
5. Both users are taken to the Reveal screen — the orb animates, the outcome drops, Claude's message appears
6. For a mutual outcome: the next-step suggestion and updated preference profiles show

To demo both outcomes, run the flow twice with different would-see-again answers.
