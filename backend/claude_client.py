import os
import logging
from typing import Optional
import anthropic
from dotenv import load_dotenv

load_dotenv()

MODEL = "claude-sonnet-4-6"
logger = logging.getLogger(__name__)


def _client() -> anthropic.Anthropic:
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("ANTHROPIC_API_KEY not set — add it to backend/.env")
    return anthropic.Anthropic(api_key=key)


_REFLECTION_PROMPTS = [
    "What surprised you most about this person?",
    "When during the date did you feel most like yourself?",
    "What's one thing you'd want to know about them that never came up?",
    "Did anything catch you off guard — in a good way?",
    "How did the conversation feel — easy, effortful, or somewhere in between?",
    "Was there a moment you felt genuinely seen or understood?",
    "What would you do differently if you went on this date again?",
    "Were you being yourself, or a polished version of yourself?",
    "What did this date teach you about what you're actually looking for?",
    "Was there a moment you wanted it to just keep going?",
    "How did you feel an hour after the date ended?",
    "What's one detail about them that's still with you?",
    "Did the conversation go anywhere unexpected?",
    "Was there anything left unsaid that you wish you'd shared?",
    "What's one thing about them you're still thinking about?",
    "When were you most at ease?",
    "Did you feel chemistry, comfort, curiosity — or something else?",
    "What would you tell a close friend about this person?",
    "Did the setting add anything to the experience?",
    "Was there a moment of real connection — even a small one?",
    "How did they make you feel about yourself?",
    "What question do you still have about them?",
    "Did anything about this date surprise you about yourself?",
    "Was the energy more spark, warmth, or something neutral?",
    "What's one thing they said that's still with you?",
    "Were you comfortable in the silences, or did they feel awkward?",
    "If there were a second date, what would you want it to look like?",
    "What did this person seem to bring out in you?",
    "Was there any moment you wanted to leave — or never leave?",
    "Did things feel forced, or did they flow?",
    "What made this date feel different from others you've been on?",
    "How honest were you about who you really are?",
    "Did they seem present with you, or somewhere else?",
    "What does your gut actually say?",
    "What stood out most about your time together?",
]

import random as _random

def generate_reflection_prompt(user_name: str, match_name: str, location: Optional[str] = None) -> str:
    location_ctx = f" at {location}" if location else ""
    try:
        message = _client().messages.create(
            model=MODEL,
            max_tokens=80,
            system=(
                "You write a single introspective reflection question for someone who just went on a date. "
                "Be specific to this person and this date — mention their match's name and the location if given. "
                "Warm, personal, honest. Not generic. One sentence. End with a question mark. "
                "Return only the question, no preamble, no quotes."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"{user_name} just went on a date with {match_name}{location_ctx}. "
                    "Write one personal reflection question for them about this specific date."
                ),
            }],
        )
        return message.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error in generate_reflection_prompt: %s", e)
        return _random.choice(_REFLECTION_PROMPTS)


def generate_outcome_message(
    outcome: str,
    user1_name: str,
    user2_name: str,
    user1_rating: int,
    user2_rating: int,
) -> str:
    fallbacks = {
        "mutual": f"Something real happened between {user1_name} and {user2_name}. You both felt it — now it's yours to explore.",
        "one_sided": "Not every connection lands the same way for both people, and that's okay. What matters is that you showed up honestly.",
        "no_interest": "This one wasn't the right fit — and knowing that clearly is its own kind of gift. On to the next.",
    }
    try:
        message = _client().messages.create(
            model=MODEL,
            max_tokens=300,
            system=(
                "You write the reveal message for Echo, a post-date mutual reveal feature on a dating app. "
                "The message is shown to both people simultaneously after a blind mutual reveal. "
                "Tone: warm, human, never robotic. Avoid clichés. Be specific to the outcome. "
                "For 'mutual': celebrate without being over the top. "
                "For 'one_sided': acknowledge the asymmetry with grace and zero blame. "
                "For 'no_interest': close the loop with quiet dignity. "
                "Return only the message text — 2-3 sentences max, no preamble."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Outcome: {outcome}. "
                        f"Person 1 ({user1_name}) rated the date {user1_rating}/5. "
                        f"Person 2 ({user2_name}) rated the date {user2_rating}/5. "
                        "Write the reveal message."
                    ),
                }
            ],
        )
        return message.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error in generate_outcome_message: %s", e)
        return fallbacks.get(outcome, fallbacks["no_interest"])


def generate_next_step(
    user1_name: str,
    user2_name: str,
    location: Optional[str] = None,
    user1_notes: Optional[str] = None,
    user2_notes: Optional[str] = None,
) -> str:
    context_parts = []
    if location:
        context_parts.append(f"Their date was at {location}.")
    if user1_notes:
        context_parts.append(f"{user1_name} wrote: \"{user1_notes}\"")
    if user2_notes:
        context_parts.append(f"{user2_name} wrote: \"{user2_notes}\"")
    context = " ".join(context_parts)
    try:
        message = _client().messages.create(
            model=MODEL,
            max_tokens=150,
            system=(
                "You write one concrete next-step suggestion for two people who mutually liked each other "
                "on a dating app called Echo. "
                "Read their reflection notes carefully. Build your suggestion on something specific they actually "
                "mentioned — a place, a topic, an interest, a feeling. "
                "If they mentioned something specific, reference it directly. "
                "Feel like advice from a close friend who read what they wrote, not a generic suggestion. "
                "Under 30 words. Return only the suggestion, no preamble, no quotes."
            ),
            messages=[{
                "role": "user",
                "content": (
                    f"{user1_name} and {user2_name} both want to see each other again. "
                    f"{context} "
                    "What's one specific suggestion for their next move?"
                ),
            }],
        )
        return message.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error in generate_next_step: %s", e)
        return "Pick a spot neither of you has been to — somewhere new gives you both something to discover together."


def infer_preference_update(
    existing_summary: Optional[str],
    match_name: str,
    rating: int,
    notes: Optional[str],
    would_see_again: str,
) -> str:
    existing = existing_summary or "No prior preference data."
    try:
        message = _client().messages.create(
            model=MODEL,
            max_tokens=250,
            system=(
                "You maintain a concise preference profile for a dating app user. "
                "Based on their reflection from a date, update the profile to capture what they're actually drawn to or not. "
                "Keep it under 80 words. Write in second person ('You tend to...', 'You're drawn to...'). "
                "Return only the updated profile text."
            ),
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Existing profile: {existing}\n\n"
                        f"New data point: date with {match_name}, rated {rating}/5, "
                        f"would see again: {would_see_again}. "
                        f"Reflection notes: {notes or 'none provided'}.\n\n"
                        "Update the preference profile."
                    ),
                }
            ],
        )
        return message.content[0].text.strip()
    except Exception as e:
        logger.error("Claude API error in infer_preference_update: %s", e)
        return existing_summary or ""
