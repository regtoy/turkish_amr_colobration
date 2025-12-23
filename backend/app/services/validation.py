import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass, field
from typing import Any, Callable, Iterable, Literal, Sequence

import penman
from penman.codec import PENMANCodec
from penman.exceptions import DecodeError


@dataclass
class ValidationIssue:
    code: str
    message: str
    severity: Literal["error", "warning", "lint"] = "error"
    context: dict[str, Any] | None = None

    def to_dict(self) -> dict[str, Any]:
        payload: dict[str, Any] = {"code": self.code, "message": self.message, "severity": self.severity}
        if self.context:
            payload["context"] = self.context
        return payload


@dataclass
class ValidationReport:
    is_valid: bool
    amr_version: str
    role_set_version: str
    rule_version: str
    triple_count: int | None = None
    canonical_penman: str | None = None
    errors: list[ValidationIssue] = field(default_factory=list)
    warnings: list[ValidationIssue] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "amr_version": self.amr_version,
            "role_set_version": self.role_set_version,
            "rule_version": self.rule_version,
            "triple_count": self.triple_count,
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
        self._codec = PENMANCodec()
        self._modular_checks: Sequence[
            tuple[str, Callable[[penman.Graph, str], tuple[list[ValidationIssue], list[ValidationIssue]]]]
        ] = (
            ("root", self._check_root),
            ("variables", self._check_variable_consistency),
            ("reentrancy", self._check_reentrancy),
            ("triple_count", self._check_triple_count),
            ("triple_roles", self._check_roles),
            ("lint", self._lint_warnings),
        )

    def validate(self, penman_text: str) -> ValidationReport:
        original_text = penman_text
        normalized = self._normalize(penman_text)
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        if not normalized:
            errors.append(ValidationIssue(code="empty_input", message="AMR içeriği boş olamaz.", severity="error"))
            return self._report(errors, warnings, canonical_penman=None, triple_count=None)

        if not self._parentheses_balanced(normalized):
            errors.append(ValidationIssue(code="parse_error", message="Parantez dengesi hatalı.", severity="error"))
            return self._report(errors, warnings, canonical_penman=None, triple_count=None)

        graph: penman.Graph | None = None
        try:
            graph = penman.decode(normalized)
        except DecodeError as exc:
            errors.append(
                ValidationIssue(
                    code="parse_error",
                    message="PENMAN çözümleme hatası.",
                    severity="error",
                    context={"detail": str(exc)},
                )
            )
            return self._report(errors, warnings, canonical_penman=None, triple_count=None)

        for _, check in self._modular_checks:
            check_errors, check_warnings = check(graph, original_text)
            errors.extend(check_errors)
            warnings.extend(check_warnings)

        canonical_penman = self._canonicalize(graph)
        triple_count = len(graph.triples)
        return self._report(errors, warnings, canonical_penman=canonical_penman, triple_count=triple_count)

    def _report(
        self,
        errors: Iterable[ValidationIssue],
        warnings: Iterable[ValidationIssue],
        *,
        canonical_penman: str | None,
        triple_count: int | None,
    ) -> ValidationReport:
        errors_list = list(errors)
        warnings_list = list(warnings)
        return ValidationReport(
            is_valid=len(errors_list) == 0,
            amr_version=self.amr_version,
            role_set_version=self.role_set_version,
            rule_version=self.rule_version,
            canonical_penman=canonical_penman,
            triple_count=triple_count,
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

    def _canonicalize(self, graph: penman.Graph) -> str:
        return self._codec.encode(graph, indent=None)

    def _check_root(self, graph: penman.Graph, _: str) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []
        root = graph.top
        if not root:
            errors.append(
                ValidationIssue(code="missing_root", message="Kök düğüm tespit edilemedi.", severity="error")
            )
            return errors, warnings
        instances = {var: concept for var, _, concept in graph.instances()}
        if root not in instances:
            errors.append(
                ValidationIssue(
                    code="uninstantiated_root",
                    message="Kök düğüm için kavram bulunamadı.",
                    severity="error",
                    context={"root": root},
                )
            )
        return errors, warnings

    def _check_variable_consistency(
        self, graph: penman.Graph, _: str
    ) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []
        variable_pattern = re.compile(r"^[a-zA-Z][\w-]*$")

        instances: dict[str, str] = {}
        duplicate_instances: list[tuple[str, str, str]] = []
        for var, _, concept in graph.instances():
            if not variable_pattern.match(var):
                errors.append(
                    ValidationIssue(
                        code="invalid_variable_name",
                        message="Geçersiz değişken adı.",
                        severity="error",
                        context={"variable": var},
                    )
                )
            if var in instances and instances[var] != concept:
                duplicate_instances.append((var, instances[var], concept))
            instances[var] = concept

        for var, previous, current in duplicate_instances:
            errors.append(
                ValidationIssue(
                    code="conflicting_instances",
                    message="Aynı değişken birden fazla kavramla eşlenmiş.",
                    severity="error",
                    context={"variable": var, "existing": previous, "conflict": current},
                )
            )

        referenced_vars = {
            target
            for _, role, target in graph.triples
            if isinstance(target, str) and role != ":instance" and variable_pattern.match(target)
        }
        dangling = sorted(referenced_vars - set(instances))
        if dangling:
            errors.append(
                ValidationIssue(
                    code="dangling_variable",
                    message="Tanımlanmayan değişkene referans var.",
                    severity="error",
                    context={"variables": dangling},
                )
            )

        if not instances:
            warnings.append(
                ValidationIssue(
                    code="no_instances",
                    message="Hiçbir düğümde kavram tanımı bulunamadı.",
                    severity="warning",
                )
            )
        return errors, warnings

    def _check_reentrancy(self, graph: penman.Graph, _: str) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []
        incoming_edges: Counter[str] = Counter()
        for _, role, target in graph.triples:
            if role == ":instance":
                continue
            if isinstance(target, str):
                incoming_edges[target] += 1

        reentrant_nodes = {node: count for node, count in incoming_edges.items() if count > 1}
        for node, count in sorted(reentrant_nodes.items()):
            warnings.append(
                ValidationIssue(
                    code="reentrancy",
                    message="Düğüm birden fazla üstten bağ alıyor.",
                    severity="warning",
                    context={"variable": node, "incoming_edges": count},
                )
            )
        return errors, warnings

    def _check_triple_count(self, graph: penman.Graph, _: str) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []
        triple_count = len(graph.triples)
        if triple_count == 0:
            errors.append(
                ValidationIssue(
                    code="no_triples",
                    message="Graf içinde üçleme bulunamadı.",
                    severity="error",
                )
            )
            return errors, warnings

        instance_count = len(graph.instances())
        if instance_count == 0:
            warnings.append(
                ValidationIssue(
                    code="no_instance_triples",
                    message="Herhangi bir :instance üçlemesi tespit edilmedi.",
                    severity="warning",
                )
            )
        return errors, warnings

    def _check_roles(self, graph: penman.Graph, _: str) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        propbank_roles: list[str] = []
        for _, role, _ in graph.triples:
            role = role.lstrip(":")
            if role.upper().startswith("ARG"):
                propbank_roles.append(role.upper())

        disallowed_roles = sorted(role for role in propbank_roles if role not in self._allowed_roles)
        if disallowed_roles:
            errors.append(
                ValidationIssue(
                    code="role_mismatch",
                    message="İzin verilmeyen PropBank rol(ler) kullanılmış.",
                    severity="error",
                    context={"roles": disallowed_roles, "role_set_version": self.role_set_version},
                )
            )
        if not propbank_roles:
            warnings.append(
                ValidationIssue(
                    code="no_roles_detected",
                    message="AMR içinde PropBank rolü tespit edilemedi.",
                    severity="warning",
                )
            )
        return errors, warnings

    def _lint_warnings(self, graph: penman.Graph, text: str) -> tuple[list[ValidationIssue], list[ValidationIssue]]:
        errors: list[ValidationIssue] = []
        warnings: list[ValidationIssue] = []

        duplicate_roles: dict[str, list[str]] = defaultdict(list)
        for source, role, target in graph.triples:
            if role == ":instance" or not isinstance(target, str):
                continue
            duplicate_roles[source].append(role)

        for source, roles in duplicate_roles.items():
            counts = Counter(roles)
            problematic = {role: count for role, count in counts.items() if count > 1}
            if problematic:
                warnings.append(
                    ValidationIssue(
                        code="duplicate_roles",
                        message="Aynı düğüm için yinelenen roller mevcut.",
                        severity="lint",
                        context={"variable": source, "roles": sorted(problematic.keys())},
                    )
                )

        if text.strip() != text:
            warnings.append(
                ValidationIssue(
                    code="leading_trailing_whitespace",
                    message="Başta/sonda gereksiz boşluklar bulundu, kanonize edildi.",
                    severity="lint",
                )
            )

        return errors, warnings
