"""AI chat that gathers Mutual NDA fields, via LiteLLM -> OpenRouter -> Cerebras."""

from datetime import date
from typing import Literal

from litellm import completion
from pydantic import BaseModel

MODEL = "openrouter/openai/gpt-oss-120b"
EXTRA_BODY = {"provider": {"order": ["cerebras"]}}

# Field names mirror MndaValues in frontend/lib/mnda.ts.


class PartyUpdate(BaseModel):
    company: str | None = None
    name: str | None = None
    title: str | None = None
    noticeAddress: str | None = None


class MndaUpdates(BaseModel):
    """Only the fields that changed this turn; everything else stays null."""

    purpose: str | None = None
    effectiveDate: str | None = None  # YYYY-MM-DD
    mndaTerm: Literal["expires", "continues"] | None = None
    mndaTermYears: int | None = None
    confidentiality: Literal["years", "perpetuity"] | None = None
    confidentialityYears: int | None = None
    governingLaw: str | None = None
    jurisdiction: str | None = None
    modifications: str | None = None
    party1: PartyUpdate | None = None
    party2: PartyUpdate | None = None


class ChatTurn(BaseModel):
    reply: str
    updates: MndaUpdates


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: str


SYSTEM_PROMPT = """You help a user draft a Mutual Non-Disclosure Agreement (Common Paper Mutual NDA) through friendly chat.
Only the Mutual NDA is supported. If the user wants another document, say it is not available yet and offer the Mutual NDA.

Fields to fill in (current values are given below as JSON):
- purpose: how Confidential Information may be used
- effectiveDate: YYYY-MM-DD
- mndaTerm: "expires" (after mndaTermYears) or "continues" (until terminated)
- confidentiality: "years" (confidentialityYears) or "perpetuity"
- governingLaw: a US state; jurisdiction: city or county and state
- modifications: optional changes to the standard terms
- party1 and party2: company, name, title, noticeAddress

Rules:
- Ask about a few related fields at a time, in plain language. Do not interrogate.
- Put in `updates` only fields the user just gave or changed; leave all others null.
- Never invent values the user has not given. Resolve relative dates like "today" using today's date.
- In `reply`, briefly confirm what you recorded and ask the next question.
  When everything is filled in, tell the user the document is ready to download.

Today's date: {today}
Current values: {values}
"""


def run_chat(messages: list[Message], values: dict) -> ChatTurn:
    system = SYSTEM_PROMPT.format(today=date.today().isoformat(), values=values)
    response = completion(
        model=MODEL,
        messages=[{"role": "system", "content": system}, *[m.model_dump() for m in messages]],
        response_format=ChatTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return ChatTurn.model_validate_json(response.choices[0].message.content)
