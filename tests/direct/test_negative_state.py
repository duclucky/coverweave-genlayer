import json
import pytest
from conftest import ready, mocks, state, START, OFFER, REVIEW, USE, GEN


@pytest.mark.parametrize("method,args", [
    ("review_bundle", ("case",)), ("consume_permit", ("case",)),
    ("expire_permit", ("case",)), ("withdraw_credit", ("case",)),
    ("close_bundle", ("case",)), ("ratify_bundle", ("case", "0" * 64)),
    ("refund_expired", ("case",)),
])
def test_member_wrong_state_cannot_mutate(bundle_case, method, args):
    vm, contract, _ = bundle_case
    before = state(contract)
    with vm.expect_revert():
        getattr(contract, method)(*args)
    assert state(contract) == before


def test_offer_roles_and_duplicate_assent(bundle_case):
    vm, contract, roles = bundle_case
    before = state(contract)
    with vm.expect_revert("Issuer only"):
        contract.offer_grant("case", "Permission to read")
    assert state(contract) == before
    for role in roles[1:]:
        vm.sender = role
        contract.offer_grant("case", "Permission to read")
    digest = json.loads(contract.get_bundle("case"))["definition_digest"]
    vm.sender = roles[0]
    contract.ratify_bundle("case", digest)
    before = state(contract)
    with vm.expect_revert("Already ratified"):
        contract.ratify_bundle("case", digest)
    assert state(contract) == before


@pytest.mark.parametrize("rolespec", ["same-issuer", "buyer-issuer", "zero-issuer"])
def test_invalid_roles_cannot_accept_purchase(bundle_case, rolespec):
    vm, contract, roles = bundle_case
    from genlayer.types import Address
    a, b = {"same-issuer": (roles[1], roles[1]), "buyer-issuer": (roles[0], roles[2]),
            "zero-issuer": (Address("0x" + "0" * 40), roles[2])}[rolespec]
    vm.value = 2 * GEN
    before = contract.get_global_accounting()
    with vm.expect_revert("distinct nonzero"):
        contract.open_bundle("bad", "Read", a, b, OFFER, REVIEW, USE)
    assert contract.get_global_accounting() == before


@pytest.mark.parametrize("goal", ["", " " * 10, "x" * 1201, "\x00malformed", "nonASCII\u00e9"])
def test_bad_goals_rejected_before_deposit(bundle_case, goal):
    vm, contract, roles = bundle_case
    vm.value = 2 * GEN
    before = contract.get_global_accounting()
    with vm.expect_revert("Invalid goal"):
        contract.open_bundle("bad", goal, roles[1], roles[2], OFFER, REVIEW, USE)
    assert contract.get_global_accounting() == before


@pytest.mark.parametrize("method", ["consume_permit", "expire_permit", "refund_expired", "close_bundle"])
def test_issuer_cannot_use_buyer_recovery_authority(bundle_case, method):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    mocks(vm, ["INCOMPLETE", "INCOMPLETE", "COMPLETE"])
    contract.review_bundle("case")
    vm.sender = roles[1]
    before = state(contract)
    with vm.expect_revert("Buyer only"):
        getattr(contract, method)("case")
    assert state(contract) == before


@pytest.mark.parametrize("bad_result", [
    {"context_ok": True, "classes": ["COMPLETE", "COMPLETE", "INCOMPLETE"]},
    {"context_ok": False, "classes": ["COMPLETE"] * 3},
    {"context_ok": 1, "classes": ["COMPLETE"] * 3},
    {"context_ok": True, "classes": ["COMPLETE"] * 3, "amount": "2 GEN"},
    {"context_ok": True, "classes": ["COMPLETE", "COMPLETE"]},
])
def test_even_accepted_invalid_output_cannot_settle(bundle_case, monkeypatch, bad_result):
    vm, contract, _ = bundle_case
    ready(bundle_case)
    import genlayer as gl
    # Malicious consensus output tests deterministic checks after sandbox return.
    monkeypatch.setattr(gl.vm, "run_nondet_default", lambda _l, _v: bad_result)
    before = state(contract)
    with vm.expect_revert():
        contract.review_bundle("case")
    assert state(contract) == before
