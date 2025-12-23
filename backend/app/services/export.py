from __future__ import annotations

import json
import tempfile
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Iterable
from pathlib import Path
from zipfile import ZipFile

from sqlmodel import Session, select

from ..enums import ExportLevel, ExportFormat, PiiStrategy, Role, SentenceStatus
from ..models import (
    Adjudication,
    Annotation,
    FailedSubmission,
    Project,
    Review,
    Sentence,
)
from ..services.validation import ValidationService


class ExportAccessError(PermissionError):
    pass


class ExportNotFoundError(LookupError):
    pass


class ExportValidationError(ValueError):
    pass


@dataclass
class ExportRequest:
    project_id: int
    level: ExportLevel
    format: ExportFormat
    pii_strategy: PiiStrategy
    include_manifest: bool = True
    include_failed: bool = False
    include_rejected: bool = False


class PiiFilter:
    def __init__(self, strategy: PiiStrategy) -> None:
        self.strategy = strategy

    def apply_user(self, user_id: int | None) -> int | None:
        if user_id is None:
            return None
        if self.strategy == PiiStrategy.INCLUDE:
            return user_id
        if self.strategy == PiiStrategy.STRIP:
            return None
        return hash(f"user-{user_id}") % 10_000_000

    def apply_source(self, source: str | None) -> str | None:
        if source is None:
            return None
        if self.strategy == PiiStrategy.INCLUDE:
            return source
        if self.strategy == PiiStrategy.STRIP:
            return None
        return f"src-{abs(hash(source)) % 1_000_000}"

    def apply_ip(self, ip_address: str | None) -> str | None:
        if ip_address is None:
            return None
        if self.strategy == PiiStrategy.INCLUDE:
            return ip_address
        if self.strategy == PiiStrategy.STRIP:
            return None
        return "0.0.0.0"

    def cleanse_details(self, details: dict | None) -> dict | None:
        if details is None:
            return None
        sanitized: dict = {}
        for key, value in details.items():
            lowered = str(key).lower()
            if "email" in lowered and isinstance(value, str):
                if self.strategy == PiiStrategy.STRIP:
                    sanitized[key] = None
                elif self.strategy == PiiStrategy.ANONYMIZE:
                    sanitized[key] = f"user-{abs(hash(value)) % 1_000_000}@example.local"
                else:
                    sanitized[key] = value
            elif "ip" in lowered and isinstance(value, str):
                sanitized[key] = self.apply_ip(value)
            elif ("source_id" in lowered or lowered == "source") and isinstance(value, str):
                sanitized[key] = self.apply_source(value)
            else:
                sanitized[key] = value
        return sanitized


class ExportService:
    def __init__(self, session: Session) -> None:
        self.session = session

    def _require_access(self, actor_role: Role) -> None:
        if actor_role not in {Role.ADMIN, Role.CURATOR}:
            raise ExportAccessError("Yalnızca admin veya curator export alabilir")

    def export(self, request: ExportRequest, *, actor_role: Role) -> dict:
        self._require_access(actor_role)
        project = self.session.get(Project, request.project_id)
        if not project:
            raise ExportNotFoundError("Proje bulunamadı")

        pii = PiiFilter(request.pii_strategy)
        only_failed = request.level in {ExportLevel.FAILED, ExportLevel.REJECTED}
        sentences = [] if only_failed else self._fetch_sentences(project.id, request.level)
        annotations = {} if only_failed else self._fetch_annotations(sentences)
        adjudications = {} if only_failed else self._fetch_adjudications(sentences)
        reviews = {} if only_failed else self._fetch_reviews(annotations)
        include_failed = request.include_failed or request.level == ExportLevel.FAILED
        include_rejected = request.include_rejected or request.level == ExportLevel.REJECTED
        failed = self._fetch_failed(project.id, include_failed, include_rejected, pii)

        validator = ValidationService(
            amr_version=project.amr_version,
            role_set_version=project.role_set_version,
            rule_version=project.validation_rule_version,
        )

        records: list[dict] = []
        for sentence in sentences:
            sentence_data = self._serialize_sentence(sentence, pii)
            sentence_annotations = annotations.get(sentence.id, [])
            sentence_reviews = [review for review in reviews.get(sentence.id, [])]
            sentence_adjudication = adjudications.get(sentence.id)
            record = {
                "sentence": sentence_data,
                "annotations": [self._serialize_annotation(a, validator, pii) for a in sentence_annotations],
                "reviews": [self._serialize_review(r, pii) for r in sentence_reviews],
                "adjudication": self._serialize_adjudication(sentence_adjudication, pii),
            }
            records.append(record)

        manifest = None
        if request.include_manifest:
            manifest = self._build_manifest(project, records, failed, request)

        return {
            "project_id": project.id,
            "exported_at": datetime.utcnow().isoformat(),
            "records": records,
            "failed_submissions": failed,
            "manifest": manifest,
        }

    def write_export_file(
        self,
        payload: dict,
        request: ExportRequest,
        *,
        directory: Path,
        job_id: int | None = None,
    ) -> str:
        directory.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.utcnow().strftime("%Y%m%d-%H%M%S")
        base_name = f"project-{payload['project_id']}-{request.level.value}"
        if job_id:
            base_name += f"-job-{job_id}"
        base_name += f"-{timestamp}"

        if request.format == ExportFormat.JSON:
            path = directory / f"{base_name}.json"
            with path.open("w", encoding="utf-8") as fp:
                json.dump(payload, fp, ensure_ascii=False, indent=2)
            return str(path)

        if request.format == ExportFormat.MANIFEST_JSON:
            archive_path = directory / f"{base_name}.zip"
            with tempfile.TemporaryDirectory() as tmpdir:
                temp_dir = Path(tmpdir)
                data_payload = {
                    "project_id": payload.get("project_id"),
                    "exported_at": payload.get("exported_at"),
                    "records": payload.get("records", []),
                    "failed_submissions": payload.get("failed_submissions", []),
                }
                data_path = temp_dir / "data.json"
                with data_path.open("w", encoding="utf-8") as fp:
                    json.dump(data_payload, fp, ensure_ascii=False, indent=2)

                manifest = payload.get("manifest")
                if manifest:
                    manifest_path = temp_dir / "manifest.json"
                    with manifest_path.open("w", encoding="utf-8") as fp:
                        json.dump(manifest, fp, ensure_ascii=False, indent=2)
                with ZipFile(archive_path, "w") as archive:
                    archive.write(data_path, arcname="data.json")
                    manifest_file = temp_dir / "manifest.json"
                    if manifest_file.exists():
                        archive.write(manifest_file, arcname="manifest.json")
            return str(archive_path)

        raise ExportValidationError(f"Desteklenmeyen export formatı: {request.format}")

    def _fetch_sentences(self, project_id: int, level: ExportLevel) -> list[Sentence]:
        query = select(Sentence).where(Sentence.project_id == project_id)
        if level == ExportLevel.GOLD:
            query = query.where(Sentence.status == SentenceStatus.ACCEPTED)
        elif level == ExportLevel.SILVER:
            query = query.where(Sentence.status.in_([SentenceStatus.ADJUDICATED, SentenceStatus.IN_REVIEW]))
        return list(self.session.exec(query))

    def _fetch_annotations(self, sentences: Iterable[Sentence]) -> dict[int, list[Annotation]]:
        sentence_ids = [s.id for s in sentences if s.id is not None]
        if not sentence_ids:
            return {}
        rows = self.session.exec(select(Annotation).where(Annotation.sentence_id.in_(sentence_ids))).all()
        grouped: dict[int, list[Annotation]] = defaultdict(list)
        for annotation in rows:
            if annotation.sentence_id is not None:
                grouped[annotation.sentence_id].append(annotation)
        return grouped

    def _fetch_reviews(self, annotations: dict[int, list[Annotation]]) -> dict[int, list[Review]]:
        annotation_ids = [ann.id for anns in annotations.values() for ann in anns if ann.id is not None]
        if not annotation_ids:
            return {}
        rows = self.session.exec(select(Review).where(Review.annotation_id.in_(annotation_ids))).all()
        grouped: dict[int, list[Review]] = defaultdict(list)
        for review in rows:
            grouped[review.annotation_id].append(review)
        return grouped

    def _fetch_adjudications(self, sentences: Iterable[Sentence]) -> dict[int, Adjudication]:
        sentence_ids = [s.id for s in sentences if s.id is not None]
        if not sentence_ids:
            return {}
        rows = self.session.exec(select(Adjudication).where(Adjudication.sentence_id.in_(sentence_ids))).all()
        return {adj.sentence_id: adj for adj in rows if adj.sentence_id is not None}

    def _fetch_failed(
        self, project_id: int, include_failed: bool, include_rejected: bool, pii: PiiFilter
    ) -> list[dict]:
        if not (include_failed or include_rejected):
            return []
        query = select(FailedSubmission).where(FailedSubmission.project_id == project_id)
        rows = self.session.exec(query).all()
        payload: list[dict] = []
        for failure in rows:
            if not include_failed and failure.failure_type != "review_reject":
                continue
            if not include_rejected and failure.failure_type == "review_reject":
                continue
            payload.append(self._serialize_failed(failure, pii))
        return payload

    def _serialize_sentence(self, sentence: Sentence, pii: PiiFilter) -> dict:
        return {
            "id": sentence.id,
            "text": sentence.text,
            "source": pii.apply_source(sentence.source),
            "difficulty_tag": sentence.difficulty_tag,
            "status": sentence.status.value if sentence.status else None,
            "created_at": sentence.created_at.isoformat() if sentence.created_at else None,
            "updated_at": sentence.updated_at.isoformat() if sentence.updated_at else None,
        }

    def _serialize_annotation(self, annotation: Annotation, validator: ValidationService, pii: PiiFilter) -> dict:
        report = None
        if annotation.validity_report:
            try:
                report = json.loads(annotation.validity_report)
            except json.JSONDecodeError:
                report = validator.validate(annotation.penman_text).to_dict()
        return {
            "id": annotation.id,
            "sentence_id": annotation.sentence_id,
            "author_id": pii.apply_user(annotation.author_id),
            "penman": annotation.penman_text,
            "validity_report": report,
            "created_at": annotation.created_at.isoformat() if annotation.created_at else None,
        }

    def _serialize_review(self, review: Review, pii: PiiFilter) -> dict:
        return {
            "id": review.id,
            "annotation_id": review.annotation_id,
            "reviewer_id": pii.apply_user(review.reviewer_id),
            "decision": review.decision.value if review.decision else None,
            "score": review.score,
            "comment": review.comment,
            "created_at": review.created_at.isoformat() if review.created_at else None,
        }

    def _serialize_adjudication(self, adjudication: Adjudication | None, pii: PiiFilter) -> dict | None:
        if not adjudication:
            return None
        return {
            "id": adjudication.id,
            "sentence_id": adjudication.sentence_id,
            "curator_id": pii.apply_user(adjudication.curator_id),
            "final_penman": adjudication.final_penman,
            "decision_note": adjudication.decision_note,
            "source_annotation_ids": adjudication.source_annotation_ids,
            "created_at": adjudication.created_at.isoformat() if adjudication.created_at else None,
        }

    def _serialize_failed(self, failure: FailedSubmission, pii: PiiFilter) -> dict:
        return {
            "id": failure.id,
            "sentence_id": failure.sentence_id,
            "assignment_id": failure.assignment_id,
            "annotation_id": failure.annotation_id,
            "user_id": pii.apply_user(failure.user_id),
            "reviewer_id": pii.apply_user(failure.reviewer_id),
            "failure_type": failure.failure_type,
            "reason": failure.reason,
            "details": pii.cleanse_details(failure.details),
            "amr_version": failure.amr_version,
            "role_set_version": failure.role_set_version,
            "rule_version": failure.rule_version,
            "submitted_penman": failure.submitted_penman,
            "created_at": failure.created_at.isoformat() if failure.created_at else None,
        }

    def _build_manifest(
        self,
        project: Project,
        records: list[dict],
        failed: list[dict],
        request: ExportRequest,
    ) -> dict:
        return {
            "project": {
                "id": project.id,
                "name": project.name,
                "language": project.language,
                "amr_version": project.amr_version,
                "role_set_version": project.role_set_version,
                "validation_rule_version": project.validation_rule_version,
                "version_tag": project.version_tag,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            },
            "export": {
                "level": request.level.value,
                "format": request.format.value,
                "pii_strategy": request.pii_strategy.value,
                "include_failed": request.include_failed,
                "include_rejected": request.include_rejected,
                "record_count": len(records),
                "failed_count": len(failed),
                "generated_at": datetime.utcnow().isoformat(),
            },
        }
