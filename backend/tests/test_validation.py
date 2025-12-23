import sys
from pathlib import Path

import penman


ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))

from app.services.validation import ValidationService  # noqa: E402


def validator() -> ValidationService:
    return ValidationService(amr_version="1.0", role_set_version="tr-propbank", rule_version="v1")


def _codes(issues):
    return {issue.code for issue in issues}


def test_empty_input_is_invalid():
    report = validator().validate("   \n ")
    assert not report.is_valid
    assert "empty_input" in _codes(report.errors)
    assert report.canonical_penman is None


def test_unbalanced_parentheses_raises_parse_error():
    report = validator().validate("(b / boy")
    assert not report.is_valid
    assert "parse_error" in _codes(report.errors)


def test_conflicting_and_dangling_variables():
    text = "(b / boy :ARG0 (b / bark-01) :ARG1 x)"
    report = validator().validate(text)
    assert not report.is_valid
    codes = _codes(report.errors)
    assert {"conflicting_instances", "dangling_variable"} <= codes


def test_reentrancy_warns_but_is_valid():
    text = "(b / buy-01 :ARG0 (p / person) :ARG1 p)"
    report = validator().validate(text)
    assert report.is_valid
    assert "reentrancy" in _codes(report.warnings)


def test_disallowed_role_is_error():
    text = "(b / buy-01 :ARG9 (p / person))"
    report = validator().validate(text)
    assert not report.is_valid
    assert "role_mismatch" in _codes(report.errors)


def test_no_roles_triggers_warning():
    text = "(b / boy :mod (h / happy))"
    report = validator().validate(text)
    assert report.is_valid
    assert "no_roles_detected" in _codes(report.warnings)


def test_duplicate_roles_lint_warning():
    text = "(b / buy-01 :ARG0 (p / person) :ARG0 (q / person))"
    report = validator().validate(text)
    assert report.is_valid
    assert "duplicate_roles" in _codes(report.warnings)


def test_canonicalization_and_whitespace_warning():
    text = " (b / buy-01 :ARG0 (p / person) :ARG1 (t / thing))  "
    svc = validator()
    report = svc.validate(text)
    assert report.is_valid
    assert "leading_trailing_whitespace" in _codes(report.warnings)
    expected = penman.encode(penman.decode(svc._normalize(text)), indent=None)
    assert report.canonical_penman == expected
