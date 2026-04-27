#!/usr/bin/env python
"""
seed.py — Populates the database with two demo-ready reveal scenarios.

Requires the backend server to be running:
  uvicorn main:app --reload

Then run:
  python seed.py
"""
import sys
import httpx
from datetime import datetime, timedelta

BASE = "http://127.0.0.1:8000"


def post(path: str, data: dict) -> dict:
    r = httpx.post(f"{BASE}{path}", json=data, timeout=30)
    r.raise_for_status()
    return r.json()


def main():
    print("Checking server connection...")
    try:
        httpx.get(BASE, timeout=5)
    except Exception:
        print("ERROR: Backend server not running. Start it with: uvicorn main:app --reload")
        sys.exit(1)

    print("Creating demo users...")
    alex = post("/users", {
        "name": "Alex",
        "bio": "Avid hiker and amateur chef. Looking for something real.",
    })
    jordan = post("/users", {
        "name": "Jordan",
        "bio": "Into live music, slow mornings, and good conversation.",
    })
    print(f"  Alex:   {alex['id']}")
    print(f"  Jordan: {jordan['id']}")

    # ── Scenario 1: Mutual ─────────────────────────────────────────────────
    print("\nScenario 1: Mutual reveal (both said yes)...")
    date1 = post("/dates", {
        "user1_id": alex["id"],
        "user2_id": jordan["id"],
        "scheduled_at": (datetime.now() - timedelta(days=2)).isoformat(),
        "location": "Verve Coffee Roasters",
    })
    post("/feedback", {
        "date_id": date1["id"],
        "user_id": alex["id"],
        "rating": 5,
        "notes": "Genuinely surprised how easy the conversation was. Didn't want it to end.",
        "would_see_again": "yes",
    })
    post("/feedback", {
        "date_id": date1["id"],
        "user_id": jordan["id"],
        "rating": 4,
        "notes": "Really liked their energy. Time flew.",
        "would_see_again": "yes",
    })
    print(f"  Date ID: {date1['id']} → mutual reveal ready")

    # ── Scenario 2: One-sided ──────────────────────────────────────────────
    print("\nScenario 2: One-sided reveal (asymmetric interest)...")
    date2 = post("/dates", {
        "user1_id": alex["id"],
        "user2_id": jordan["id"],
        "scheduled_at": (datetime.now() - timedelta(days=9)).isoformat(),
        "location": "Bar Agricole",
    })
    post("/feedback", {
        "date_id": date2["id"],
        "user_id": alex["id"],
        "rating": 4,
        "notes": "Had a genuinely good time but didn't feel that romantic spark.",
        "would_see_again": "no",
    })
    post("/feedback", {
        "date_id": date2["id"],
        "user_id": jordan["id"],
        "rating": 3,
        "notes": "Nice person, just different energy than I was looking for.",
        "would_see_again": "yes",
    })
    print(f"  Date ID: {date2['id']} → one-sided reveal ready")

    # ── Scenario 3: Pending (waiting for second reflection) ────────────────
    print("\nScenario 3: Pending date (only Alex has reflected)...")
    date3 = post("/dates", {
        "user1_id": alex["id"],
        "user2_id": jordan["id"],
        "scheduled_at": (datetime.now() - timedelta(hours=6)).isoformat(),
        "location": "Tartine Manufactory",
    })
    post("/feedback", {
        "date_id": date3["id"],
        "user_id": alex["id"],
        "rating": 4,
        "notes": "Really great energy, would love to see them again.",
        "would_see_again": "yes",
    })
    print(f"  Date ID: {date3['id']} → waiting for Jordan")

    print("\n" + "─" * 50)
    print("Demo data ready.\n")
    print(f"Alex ID:   {alex['id']}")
    print(f"Jordan ID: {jordan['id']}")
    print("\nOpen http://localhost:5173 and sign in with either ID.")
    print("\nReveal states to demo:")
    print(f"  Mutual:    /date/{date1['id']}/reveal?userId={alex['id']}")
    print(f"  One-sided: /date/{date2['id']}/reveal?userId={alex['id']}")
    print(f"  Waiting:   /date/{date3['id']}/reveal?userId={jordan['id']}")


if __name__ == "__main__":
    main()
