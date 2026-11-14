"""AI chat that picks a document and gathers its fields, via LiteLLM -> OpenRouter -> Cerebras."""

import json
from typing import Annotated, Literal

from litellm import completion
from pydantic import BaseModel, Field

from .documents import DOCUMENTS, NDA_ID

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


# Constrains the model to real document ids.
DocumentId = Literal[tuple(DOCUMENTS)]


class TermUpdate(BaseModel):
    term: str
    value: str


class ChatTurn(BaseModel):
    # Field order matters: the model fills these in order, so the data is recorded
    # first and `reply` can only confirm what was actually recorded.
    # Set when the user's chosen document is clear (or changes); null to leave unchanged.
    document: DocumentId | None = None
    # Mutual NDA fields that changed this turn.
    updates: MndaUpdates
    # Other documents: values for the document's terms that changed this turn.
    termUpdates: list[TermUpdate]
    reply: str


Text = Annotated[str, Field(max_length=2000)]


class Message(BaseModel):
    role: Literal["user", "assistant"]
    content: Annotated[str, Field(max_length=4000)]


class PartyValues(BaseModel):
    company: Text = ""
    name: Text = ""
    title: Text = ""
    noticeAddress: Text = ""


class MndaValues(BaseModel):
    """Current document state sent by the client (typed so it is safe to put in the prompt)."""

    purpose: Text = ""
    effectiveDate: Annotated[str, Field(max_length=10)] = ""
    mndaTerm: Literal["expires", "continues"] = "expires"
    mndaTermYears: Annotated[int, Field(ge=1, le=100)] = 1
    confidentiality: Literal["years", "perpetuity"] = "years"
    confidentialityYears: Annotated[int, Field(ge=1, le=100)] = 1
    governingLaw: Text = ""
    jurisdiction: Text = ""
    modifications: Text = ""
    party1: PartyValues = PartyValues()
    party2: PartyValues = PartyValues()


PROMPT_INTRO = """You help a user draft a legal agreement through friendly chat, using fixed Common Paper templates.
Never rewrite the legal text; you only choose the document and collect its details.

Supported documents (id: name - description). Fields to collect are given after "Terms:":
{catalog}

Choosing the document:
- Work out what the user needs. When it is clear and supported, set `document` to its id.
- If the user wants something we do not support, say plainly that we cannot generate it, then offer the closest supported document and ask if they want it. Do not set `document` until they agree.
- If the need is unclear, ask a short question; companions such as the SLA, DPA and AI Addendum are meant to accompany the Cloud Service Agreement, but we draft one document at a time.

Recording details:
- Mutual NDA fields go in `updates` (leave `termUpdates` empty). Every other document's fields go in `termUpdates` as {{term, value}} pairs, using exactly that document's term names above (leave `updates` all null).
- Party terms (Provider, Customer, Company, Partner) take the party's legal name. The user is usually the provider or the first party, unless they say otherwise.
- Anything you confirm in `reply` MUST be recorded in the same turn. When you select a document, immediately record every detail the user has already given.
- Also record anything the user said earlier in the conversation that is missing from the current values.
- Never invent values. Resolve relative dates like "today" using today's date.

Guiding the user:
- Ask about a few related fields at a time, in plain language, most important first (parties, then key commercial terms). Do not interrogate.
- If the user says to leave something blank or skip it, move on.
- In `reply`, briefly confirm what you recorded and ask the next question. When the essentials are filled in, tell the user the document is ready to download.

Mutual NDA fields:
- purpose: how Confidential Information may be used
- effectiveDate: YYYY-MM-DD
- mndaTerm: "expires" (after mndaTermYears) or "continues" (until terminated)
- confidentiality: "years" (confidentialityYears) or "perpetuity"
- governingLaw: a US state; jurisdiction: city or county and state
- modifications: optional changes to the standard terms
- party1 and party2: company, name, title, noticeAddress

Today's date: {today}
Currently selected document: {document}
"""


def _catalog() -> str:
    lines = []
    for d in DOCUMENTS.values():
        terms = "the Mutual NDA fields below" if d.id == NDA_ID else json.dumps(d.terms)
        lines.append(f"- {d.id}: {d.name} - {d.description} Terms: {terms}")
    return "\n".join(lines)


def build_system_prompt(document: str | None, values: MndaValues, terms: dict[str, str], today: str) -> str:
    prompt = PROMPT_INTRO.format(catalog=_catalog(), today=today, document=document or "none yet")
    if document == NDA_ID:
        prompt += f"Current values (JSON): {values.model_dump_json()}\n"
    elif document:
        prompt += f"Current values (JSON): {json.dumps(terms)}\n"
    return prompt


def run_chat(
    messages: list[Message], document: str | None, values: MndaValues, terms: dict[str, str], today: str
) -> ChatTurn:
    system = build_system_prompt(document, values, terms, today)
    response = completion(
        model=MODEL,
        messages=[{"role": "system", "content": system}, *[m.model_dump() for m in messages]],
        response_format=ChatTurn,
        reasoning_effort="low",
        extra_body=EXTRA_BODY,
    )
    return ChatTurn.model_validate_json(response.choices[0].message.content)
