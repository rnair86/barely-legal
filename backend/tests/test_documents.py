import pytest
from fastapi.testclient import TestClient

from app import db
from app.documents import DOCUMENTS, NDA_ID, extract_terms


@pytest.fixture
def client(tmp_path, monkeypatch):
    monkeypatch.setattr(db, "DB_PATH", tmp_path / "test.db")
    from app.main import app

    with TestClient(app) as c:
        yield c


def test_all_catalog_documents_load_with_nda_merged():
    assert len(DOCUMENTS) == 11
    assert NDA_ID in DOCUMENTS and "mutual-nda-coverpage" not in DOCUMENTS
    assert DOCUMENTS[NDA_ID].cover and not DOCUMENTS[NDA_ID].terms


def test_every_other_document_has_terms_and_a_body():
    for doc in DOCUMENTS.values():
        assert doc.body.strip()
        if doc.id != NDA_ID:
            assert doc.terms, doc.id


def test_parties_are_the_party_terms_and_lead_the_terms():
    for doc in DOCUMENTS.values():
        if doc.id == NDA_ID:
            continue
        assert len(doc.parties) >= 2, doc.id
        assert doc.terms[: len(doc.parties)] == doc.parties


def test_extract_terms_orders_parties_first_and_merges_plurals():
    body = (
        '<span class="orderform_link">Fees</span> <span class="coverpage_link">Customer</span> '
        '<span class="orderform_link">Subscription Periods</span> <span class="orderform_link">Subscription Period</span> '
        '<span class="coverpage_link">Provider’s</span>'
    )
    assert extract_terms(body) == ["Provider", "Customer", "Fees", "Subscription Period"]


def test_list_documents(client):
    r = client.get("/api/documents")
    assert r.status_code == 200
    assert {d["id"] for d in r.json()} == set(DOCUMENTS)


def test_get_document_and_404(client):
    csa = client.get("/api/documents/csa").json()
    assert csa["terms"][:2] == ["Provider", "Customer"]
    assert "Cloud Service Agreement" in csa["body"]
    assert client.get("/api/documents/nope").status_code == 404
