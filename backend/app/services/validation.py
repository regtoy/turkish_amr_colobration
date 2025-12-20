import json
import re
from dataclasses import dataclass, field
from typing import Any, Iterable


@dataclass
class ValidationIssue:
    code: str
    message: str
    context: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message}
        if self.context:
            payload["context"] = self.context
        return payload


@dataclass
class ValidationReport:
    is_valid: bool
    amr_version: str
    role_set_version: str
    rule_version: str
    canonical_penman: str | None = None
    errors: list[ValidationIssue] = field(default_factory=list)
    warnings: list[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "amr_version": self.amr_version,
            "role_set_version": self.role_set_version,
            "rule_version": self.rule_version,
            "canonical_penman": self.canonical_penman,
            "errors": [issue.to_dict() for issue in self.errors],
            "warnings": [issue.to_dict() for issue in self.warnings],
        }

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), ensure_ascii=False)


class ValidationService:
    def __init__(self, *, amr_version: str, role_set_version: str, rule_version: str) -> None:
        self.amr_version = amr_version
        self.role_set_version = role_set_version
        self.rule_version = rule_version
        self._allowed_roles = self._build_allowed_roles(role_set_version)

    def validate(self, penman_text: str) -> ValidationReport:
        normalized = self._normalize(penman_text)
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        if not normalized:
            errors.append(ValidationIssue(code="empty_input", message="AMR içeriği boş olamaz."))
            return self._report(errors, warnings, canonical_penman=None)

        if not self._parentheses_balanced(normalized):
            errors.append(ValidationIssue(code="parse_error", message="Parantez dengesi hatalı."))

        root_var = self._extract_root(normalized)
        if not root_var:
            errors.append(ValidationIssue(code="missing_root", message="Kök düğüm tespit edilemedi."))

        roles = self._extract_roles(normalized)
        disallowed_roles = sorted(role for role in roles if role not in self._allowed_roles)
        if disallowed_roles:
            errors.append(
                ValidationIssue(
                    code="role_mismatch",
                    message="İzin verilmeyen rol(ler) kullanılmış.",
                    context={"roles": disallowed_roles, "role_set_version": self.role_set_version},
                )
            )
        if not roles:
            warnings.append(
                ValidationIssue(
                    code="no_roles_detected",
                    message="AMR içinde PropBank rolü tespit edilemedi.",
                )
            )

        canonical_penman = self._canonicalize(normalized, root_var)
        return self._report(errors, warnings, canonical_penman=canonical_penman)

    def _report(
        self, errors: Iterable[ValidationIssue], warnings: Iterable[ValidationIssue], canonical_penman: str | None
    ) -> ValidationReport:
        errors_list = list(errors)
        warnings_list = list(warnings)
        return ValidationReport(
            is_valid=len(errors_list) == 0,
            amr_version=self.amr_version,
            role_set_version=self.role_set_version,
            rule_version=self.rule_version,
            canonical_penman=canonical_penman,
            errors=errors_list,
            warnings=warnings_list,
        )

    @staticmethod
    def _normalize(penman_text: str) -> str:
        return "\n".join(line.strip() for line in penman_text.splitlines() if line.strip())

    @staticmethod
    def _parentheses_balanced(text: str) -> bool:
        depth = 0
        for char in text:
            if char == "(":
                depth += 1
            elif char == ")":
                depth -= 1
            if depth < 0:
                return False
        return depth == 0

    @staticmethod
    def _extract_root(text: str) -> str | None:
        match = re.search(r"\(\s*([a-zA-Z][\w-]*)\s*/", text)
        return match.group(1) if match else None

    @staticmethod
    def _extract_roles(text: str) -> set[str]:
        return {match.group(1) for match in re.finditer(r":([A-Za-z0-9_-]+)", text)}

    @staticmethod
    def _build_allowed_roles(role_set_version: str) -> set[str]:
        base_roles = {
            "ARG0",
            "ARG1",
            "ARG2",
            "ARG3",
            "ARG4",
            "ARG5",
            "ARG6",
            "ARGM-ADV",
            "ARGM-CAU",
            "ARGM-CND",
            "ARGM-DIR",
            "ARGM-DIS",
            "ARGM-EXT",
            "ARGM-LOC",
            "ARGM-MNR",
            "ARGM-MOD",
            "ARGM-NEG",
            "ARGM-PRD",
            "ARGM-PRP",
            "ARGM-REC",
            "ARGM-TMP",
        }
        if role_set_version.lower().startswith("tr-propbank"):
            base_roles.update({"ARGM-CAUS", "ARGM-ADJ"})
        return base_roles

    def _canonicalize(self, text: str, root_var: str | None) -> str:
        compact = re.sub(r"\s+", " ", text).strip()
        if root_var and not compact.startswith(f"({root_var} /"):
            compact = f"({root_var} /" + compact.split("/", 1)[1] if "/" in compact else compact
        return compact
