import json
import sys
from pathlib import Path

import pytest
from sqlmodel import Session, SQLModel, create_engine

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from app.enums import ExportFormat, ExportLevel, PiiStrategy, ReviewDecision, Role, SentenceStatus  # noqa: E402
from app.models import (  # noqa: E402
    Annotation,
    FailedSubmission,
    Project,
    Review,
    Sentence,
)
from app.services.export import ExportRequest, ExportService  # noqa: E402
from app.services.export_worker import ExportWorker  # noqa: E402
from app.services.job_queue import ExportJobQueue  # noqa: E402


@pytest.fixture()
def session():
    engine = create_engine("sqlite://")
    SQLModel.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def seed_project(session: Session) -> Project:
    project = Project(name="Demo", language="tr")
    session.add(project)
    session.commit()
    session.refresh(project)
    return project


def seed_sentences(session: Session, project: Project) -> dict[str, Sentence]:
    gold = Sentence(project_id=project.id, text="Altın cümle", status=SentenceStatus.ACCEPTED, source="corpus-A")
    silver = Sentence(
        project_id=project.id, text="Gümüş cümle", status=SentenceStatus.IN_REVIEW, source="corpus-B", difficulty_tag="hard"
    )
    draft = Sentence(project_id=project.id, text="Taslak cümle", status=SentenceStatus.NEW, source="corpus-C")
    session.add_all([gold, silver, draft])
    session.commit()
    session.refresh(gold)
    session.refresh(silver)
    session.refresh(draft)
    return {"gold": gold, "silver": silver, "draft": draft}


def seed_annotations(session: Session, sentences: dict[str, Sentence]) -> None:
    ann = Annotation(sentence_id=sentences["gold"].id, author_id=5, penman_text="(a / annotate)")
    session.add(ann)
    session.commit()
    session.refresh(ann)
    review = Review(annotation_id=ann.id, reviewer_id=7, decision=ReviewDecision.APPROVE, score=0.9)
    session.add(review)
    session.commit()
    session.refresh(review)


def seed_failures(session: Session, project: Project, sentences: dict[str, Sentence]) -> None:
    failed = FailedSubmission(
        project_id=project.id,
        sentence_id=sentences["draft"].id,
        assignment_id=11,
        annotation_id=None,
        user_id=13,
        reviewer_id=None,
        failure_type="validation_error",
        reason="parse error",
        details={"email": "fail@example.com", "ip": "1.1.1.1"},
        amr_version="1.0",
        role_set_version="tr-propbank",
        rule_version="v1",
        submitted_penman="(x / wrong)",
    )
    rejected = FailedSubmission(
        project_id=project.id,
        sentence_id=sentences["silver"].id,
        assignment_id=12,
        annotation_id=None,
        user_id=14,
        reviewer_id=99,
        failure_type="review_reject",
        reason="quality",
        details={"email": "reject@example.com"},
        submitted_penman="(y / rejected)",
    )
    session.add_all([failed, rejected])
    session.commit()


def test_export_respects_failed_and_rejected_filters(session: Session, tmp_path: Path):
    project = seed_project(session)
    sentences = seed_sentences(session, project)
    seed_failures(session, project, sentences)
    service = ExportService(session)

    base_request = ExportRequest(
        project_id=project.id,
        level=ExportLevel.ALL,
        format=ExportFormat.JSON,
        pii_strategy=PiiStrategy.INCLUDE,
        include_manifest=True,
    )

    payload = service.export(base_request, actor_role=Role.ADMIN)
    assert payload["failed_submissions"] == []

    payload_with_failed = service.export(
        ExportRequest(**{**base_request.__dict__, "include_failed": True}), actor_role=Role.ADMIN
    )
    assert len(payload_with_failed["failed_submissions"]) == 1
    assert payload_with_failed["manifest"]["export"]["failed_count"] == 1

    payload_with_rejected = service.export(
        ExportRequest(**{**base_request.__dict__, "include_rejected": True}), actor_role=Role.ADMIN
    )
    assert len(payload_with_rejected["failed_submissions"]) == 1
    assert payload_with_rejected["failed_submissions"][0]["failure_type"] == "review_reject"


def test_pii_anonymize_and_strip(session: Session):
    project = seed_project(session)
    sentences = seed_sentences(session, project)
    seed_annotations(session, sentences)
    seed_failures(session, project, sentences)
    service = ExportService(session)

    anonymized = service.export(
        ExportRequest(
            project_id=project.id,
            level=ExportLevel.ALL,
            format=ExportFormat.JSON,
            pii_strategy=PiiStrategy.ANONYMIZE,
            include_manifest=True,
            include_failed=True,
            include_rejected=True,
        ),
        actor_role=Role.ADMIN,
    )
    annotation = anonymized["records"][0]["annotations"][0]
    assert annotation["author_id"] is not None
    assert annotation["author_id"] != 5
    failed_details = anonymized["failed_submissions"][0]["details"]
    assert failed_details is not None
    assert failed_details.get("email", "").endswith("@example.local")

    stripped = service.export(
        ExportRequest(
            project_id=project.id,
            level=ExportLevel.ALL,
            format=ExportFormat.JSON,
            pii_strategy=PiiStrategy.STRIP,
            include_failed=True,
            include_rejected=True,
        ),
        actor_role=Role.ADMIN,
    )
    annotation = stripped["records"][0]["annotations"][0]
    assert annotation["author_id"] is None
    assert stripped["records"][0]["sentence"]["source"] is None
    assert stripped["failed_submissions"][0]["user_id"] is None
    assert stripped["failed_submissions"][0]["details"]["email"] is None


def test_worker_creates_result_file_with_manifest(session: Session, tmp_path: Path):
    project = seed_project(session)
    sentences = seed_sentences(session, project)
    seed_annotations(session, sentences)
    seed_failures(session, project, sentences)

    queue = ExportJobQueue(session)
    job = queue.enqueue(
        project_id=project.id,
        created_by=1,
        level=ExportLevel.ALL,
        format=ExportFormat.MANIFEST_JSON,
        pii_strategy=PiiStrategy.INCLUDE,
        include_manifest=True,
        include_failed=True,
        include_rejected=True,
    )

    worker = ExportWorker(session, output_dir=tmp_path)
    completed = worker.run_job(job)
    assert completed.status.value == "completed"
    assert completed.result_path is not None

    archive_path = Path(completed.result_path)
    assert archive_path.exists()
    assert archive_path.suffix == ".zip"

    from zipfile import ZipFile

    with ZipFile(archive_path) as archive:
        assert set(archive.namelist()) >= {"data.json", "manifest.json"}
        data = json.loads(archive.read("data.json"))
        manifest = json.loads(archive.read("manifest.json"))

    assert data["records"]
    assert manifest["export"]["include_failed"] is True
    assert manifest["export"]["include_rejected"] is True
