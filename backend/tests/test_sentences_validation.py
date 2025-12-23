import sys
from pathlib import Path

import penman
import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, SQLModel, select

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.database import engine, get_session  # noqa: E402
from app.dependencies import CurrentUser, get_current_user  # noqa: E402
from app.enums import Role, SentenceStatus  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Assignment, FailedSubmission, Project, Sentence  # noqa: E402


@pytest.fixture(autouse=True)
def _reset_db():
    SQLModel.metadata.drop_all(engine)
    SQLModel.metadata.create_all(engine)
    yield
    SQLModel.metadata.drop_all(engine)


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def override_get_session():
    with Session(engine) as session:
        yield session


def setup_client(user_context: CurrentUser) -> TestClient:
    app.dependency_overrides[get_session] = override_get_session
    app.dependency_overrides[get_current_user] = lambda: user_context
    return TestClient(app)


def test_validate_endpoint_returns_canonical_and_warnings():
    user_context = CurrentUser(user_id=1, role=Role.ANNOTATOR, project_id=None, project_role=None)
    client = setup_client(user_context)
    with Session(engine) as session:
        project = Project(name="Demo", description=None)
        session.add(project)
        session.flush()
        sentence = Sentence(project_id=project.id, text="hello world")
        session.add(sentence)
        session.commit()
        session.refresh(sentence)
        user_context.project_id = project.id

    penman_text = " (b / buy-01 :ARG0 (p / person) )"
    response = client.post(f"/sentences/{sentence.id}/validate", json={"penman_text": penman_text})
    assert response.status_code == 200
    payload = response.json()
    assert payload["canonical_penman"] == penman.encode(penman.decode(penman_text.strip()), indent=None)
    assert payload["errors"] == []
    assert payload["triple_count"] == len(penman.decode(penman_text).triples)
    warning_codes = {issue["code"] for issue in payload["warnings"]}
    assert "leading_trailing_whitespace" in warning_codes


def test_submit_invalid_records_failed_submission_with_versions():
    user_context = CurrentUser(user_id=99, role=Role.ANNOTATOR, project_id=None, project_role=None)
    client = setup_client(user_context)
    with Session(engine) as session:
        project = Project(name="Validation Project", description=None)
        session.add(project)
        session.flush()
        sentence = Sentence(project_id=project.id, text="submit me", status=SentenceStatus.ASSIGNED)
        session.add(sentence)
        session.flush()
        session.refresh(sentence)
        assignment = Assignment(sentence_id=sentence.id, user_id=user_context.user_id)
        session.add(assignment)
        session.commit()
        session.refresh(sentence)
        session.refresh(assignment)
        user_context.project_id = project.id

    response = client.post(
        f"/sentences/{sentence.id}/submit",
        json={"penman_text": "(b / broken"},
    )
    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["canonical_penman"] is None
    assert detail["triple_count"] is None
    error_codes = {issue["code"] for issue in detail["errors"]}
    assert "parse_error" in error_codes
    assert detail["rule_version"] == project.validation_rule_version
    assert detail["amr_version"] == project.amr_version
    assert detail["role_set_version"] == project.role_set_version

    with Session(engine) as session:
        failures = list(session.exec(select(FailedSubmission)))
        assert len(failures) == 1
        failure = failures[0]
        assert failure.reason == "Validasyon başarısız."
        assert failure.details is not None
        assert failure.details["error_codes"] == ["parse_error"]
        assert failure.details["rule_version"] == project.validation_rule_version
        assert failure.details["amr_version"] == project.amr_version
        assert failure.details["role_set_version"] == project.role_set_version
