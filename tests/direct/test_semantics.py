import json
import pytest
from conftest import ready, mocks, state

C, I, U = "COMPLETE", "INCOMPLETE", "UNVERIFIABLE"


@pytest.mark.parametrize("classes,credits,status", [
    ([I, I, C], [0, 1, 1], "PURCHASED"),
    ([C, C, C], [0, 1, 1], "PURCHASED"),
    ([C, I, C], [0, 2, 0], "PURCHASED"),
    ([I, C, C], [0, 0, 2], "PURCHASED"),
    ([I, I, I], [2, 0, 0], "REFUNDED"),
    ([U, I, C], [0, 0, 0], "RETRYABLE"),
])
def test_fixed_consequence_and_independent_validator(bundle_case, classes, credits, status):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    mocks(vm, classes)
    contract.review_bundle("case")
    assert json.loads(contract.get_bundle("case"))["status"] == status
    assert [int(json.loads(contract.get_credit("case", role))["credit_gen"])
            for role in roles] == credits
    accounting = json.loads(contract.get_accounting("case"))
    assert accounting["received_gen"] == "2"
    assert accounting["locked_gen"] == ("2" if status == "RETRYABLE" else "0")
    assert vm.run_validator() is True
    assert vm.run_validator(leader_error="malicious exception") is False
    assert vm.run_validator(leader_result={"context_ok": True, "classes": [I, C, I]}) is False
    mocks(vm, [I, I, I] if classes != [I, I, I] else [C, C, C])
    assert vm.run_validator() is False


@pytest.mark.parametrize("output", [
    {"classes": [C, I, I]}, {"classes": [I, C, I]},
    {"classes": [C, C, I]}, {"classes": [C]},
    {"classes": [C, C, C, C]}, {"classes": [C, "PAY", C]},
    {"classes": [C, 1, C]}, {"classes": [C, C, C], "payee": "attacker"},
    {"A": C, "B": C, "AB": C}, [C, C, C], "not-json",
])
def test_malformed_or_invalid_meaning_cannot_mutate(bundle_case, output):
    vm, contract, _ = bundle_case
    ready(bundle_case)
    vm.clear_mocks()
    vm.mock_web(r"https://www\.w3\.org/.*", {"status": 200, "body": "20180215 Permission"})
    vm.mock_llm(r"CoverWeave CW1.*", json.dumps(json.dumps(output)))
    before = state(contract)
    with vm.expect_revert():
        contract.review_bundle("case")
    assert state(contract) == before


@pytest.mark.parametrize("body,status", [("wrong version Permission", 200),
                                         ("20180215 Permission", 503), ("", 200)])
def test_unavailable_context_preserves_whole_purchase(bundle_case, body, status):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    vm.mock_web(r"https://www\.w3\.org/.*", {"status": status, "body": body})
    contract.review_bundle("case")
    assert json.loads(contract.get_bundle("case"))["status"] == "RETRYABLE"
    assert json.loads(contract.get_accounting("case"))["locked_gen"] == "2"
    assert all(json.loads(contract.get_credit("case", r))["credit_gen"] == "0" for r in roles)
    assert json.loads(contract.get_permit("case"))["state"] == "NONE"


def test_retry_limit_and_terminal_rereview(bundle_case):
    vm, contract, _ = bundle_case
    ready(bundle_case)
    mocks(vm, [U, U, U])
    contract.review_bundle("case")
    contract.review_bundle("case")
    before = state(contract)
    with vm.expect_revert("attempt limit"):
        contract.review_bundle("case")
    assert state(contract) == before
    assert json.loads(contract.get_attempt("case", 0))["index"] == 0
    assert json.loads(contract.get_attempt("case", 1))["index"] == 1
