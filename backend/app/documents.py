"""Catalog of supported documents, loaded from catalog.json and templates/."""

import json
import os
import re
from pathlib import Path

from pydantic import BaseModel

# Repo root locally; the Docker image sets DATA_ROOT=/app.
ROOT = Path(os.environ.get("DATA_ROOT", Path(__file__).parents[2]))

NDA_ID = "mutual-nda"
NDA_COVER = "Mutual-NDA-coverpage.md"
NDA_TERMS = "Mutual-NDA.md"

# Linked terms that name the parties; asked about first.
PARTY_TERMS = ["Provider", "Customer", "Company", "Partner"]

LINK_RE = re.compile(r'<span class="[a-z]+_link">([^<]*)</span>')


class Document(BaseModel):
    id: str
    name: str
    description: str
    body: str
    # Mutual NDA only: the cover page template (it has its own typed fields).
    cover: str | None = None
    # Other documents: fields to collect, extracted from the template's linked terms.
    terms: list[str] = []
    # The party terms (a subset of `terms`, first two are the signatories).
    parties: list[str] = []


def extract_terms(body: str) -> list[str]:
    """Distinct linked terms in order of appearance, parties first, plurals merged."""
    names: list[str] = []
    for raw in LINK_RE.findall(body):
        name = re.sub(r"[’']s$", "", raw.strip())
        if name not in names:
            names.append(name)
    # "Subscription Periods" is the same field as "Subscription Period".
    names = [n for n in names if not (n.endswith("s") and n[:-1] in names)]
    parties = [p for p in PARTY_TERMS if p in names]
    return parties + [n for n in names if n not in parties]


def _read(filename: str) -> str:
    return (ROOT / "templates" / filename).read_text(encoding="utf8")


def load_documents() -> dict[str, Document]:
    docs: dict[str, Document] = {}
    for entry in json.loads((ROOT / "catalog.json").read_text(encoding="utf8")):
        filename = entry["filename"]
        if filename == NDA_COVER:
            continue  # merged into the single Mutual NDA document below
        body = _read(filename)
        if filename == NDA_TERMS:
            docs[NDA_ID] = Document(
                id=NDA_ID,
                name="Mutual Non-Disclosure Agreement",
                description=entry["description"],
                body=body,
                cover=_read(NDA_COVER),
            )
        else:
            doc_id = filename.removesuffix(".md").lower()
            terms = extract_terms(body)
            docs[doc_id] = Document(
                id=doc_id,
                name=entry["name"],
                description=entry["description"],
                body=body,
                terms=terms,
                parties=[t for t in terms if t in PARTY_TERMS],
            )
    return docs


DOCUMENTS = load_documents()
