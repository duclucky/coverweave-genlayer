import json
import pytest
from conftest import at, ready, mocks, state, OFFER, REVIEW, USE, GEN


@pytest.fixture
def emitted(bundle_case):
    """Observe real SDK EmitExternalMessage; no native network transfer claim."""
    vm, contract, _ = bundle_case
    messages = []

    def hook(_vm, request):
        if "EmitExternalMessage" not in request:
            return None
        message = request["EmitExternalMessage"]
        assert message["calldata"] == b""
        assert message["value"] in (GEN, 2 * GEN)
        # Debit must already be visible before message emission.
        assert json.loads(contract.get_credit("case", message["address"]))["credit_gen"] == "0"
        messages.append(message)
        return {"ok": None}

    vm._gl_call_hook = hook
    return messages


@pytest.mark.parametrize("path", ["complement", "dummy", "gap", "unoffered", "partial", "ready", "retry"])
def test_all_purses_recover_and_close_zero_liability(bundle_case, emitted, path):
    vm, contract, roles = bundle_case
    if path in ("complement", "dummy", "gap", "ready", "retry"):
        ready(bundle_case)
    if path in ("complement", "dummy", "gap", "retry"):
        classes = {"complement": ["INCOMPLETE", "INCOMPLETE", "COMPLETE"],
                   "dummy": ["COMPLETE", "INCOMPLETE", "COMPLETE"],
                   "gap": ["INCOMPLETE"] * 3, "retry": ["UNVERIFIABLE"] * 3}[path]
        mocks(vm, classes)
        contract.review_bundle("case")
    elif path == "partial":
        vm.sender = roles[1]
        contract.offer_grant("case", "Permission to read record")
    vm.sender = roles[0]
    if path in ("unoffered", "partial", "ready", "retry"):
        at(vm, REVIEW)
        contract.refund_expired("case")
    if path in ("complement", "dummy"):
        contract.consume_permit("case")
        with vm.expect_revert("Available permit"):
            contract.consume_permit("case")
    before = state(contract)
    with vm.expect_revert("Outstanding GEN"):
        contract.close_bundle("case")
    assert state(contract) == before
    for role in roles:
        vm.sender = role
        amount = int(json.loads(contract.get_credit("case", role))["credit_gen"])
        if amount:
            contract.withdraw_credit("case")
            assert emitted[-1]["address"] == role
            assert emitted[-1]["value"] == amount * GEN
        before = state(contract)
        count = len(emitted)
        with vm.expect_revert("No credit"):
            contract.withdraw_credit("case")
        assert state(contract) == before and len(emitted) == count
    assert sum(m["value"] for m in emitted) == 2 * GEN
    assert json.loads(contract.get_accounting("case"))["withdrawn_gen"] == "2"
    assert json.loads(contract.get_global_accounting())["liability_gen"] == "0"
    vm.sender = roles[0]
    contract.close_bundle("case")
    before = state(contract)
    for method, args in (("close_bundle", ("case",)), ("review_bundle", ("case",)),
                         ("refund_expired", ("case",)), ("consume_permit", ("case",)),
                         ("expire_permit", ("case",)), ("withdraw_credit", ("case",)),
                         ("offer_grant", ("case", "Grant")), ("ratify_bundle", ("case", "0" * 64))):
        with vm.expect_revert():
            getattr(contract, method)(*args)
        assert state(contract) == before


def test_expiry_keeps_earned_credits_withdrawable_forever(bundle_case, emitted):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    mocks(vm, ["INCOMPLETE", "INCOMPLETE", "COMPLETE"])
    contract.review_bundle("case")
    at(vm, USE)
    contract.expire_permit("case")
    with vm.expect_revert("Available permit"):
        contract.expire_permit("case")
    at(vm, USE + 100 * 86400)
    for role in roles[1:]:
        vm.sender = role
        contract.withdraw_credit("case")
    vm.sender = roles[0]
    contract.close_bundle("case")
    assert len(emitted) == 2
    assert json.loads(contract.get_permit("case"))["state"] == "EXPIRED"


def test_settlement_cannot_repeat_and_active_permit_blocks_close(bundle_case, emitted):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    mocks(vm, ["INCOMPLETE", "INCOMPLETE", "COMPLETE"])
    contract.review_bundle("case")
    before = state(contract)
    for method in ("review_bundle", "refund_expired"):
        with vm.expect_revert():
            getattr(contract, method)("case")
        assert state(contract) == before
    for role in roles[1:]:
        vm.sender = role
        contract.withdraw_credit("case")
    vm.sender = roles[0]
    before = state(contract)
    with vm.expect_revert("Terminate permit"):
        contract.close_bundle("case")
    assert state(contract) == before


def test_keyed_entities_and_immutable_offers(bundle_case):
    vm, contract, roles = bundle_case
    ready(bundle_case)
    before = state(contract)
    vm.sender = roles[0]
    vm.value = 2 * GEN
    contract.open_bundle("second", "Read another record", roles[1], roles[2], OFFER, REVIEW, USE)
    vm.value = 0
    vm.sender = roles[1]
    contract.offer_grant("second", "Read another record")
    assert contract.get_bundle("case") == before[0]
    assert contract.get_accounting("case") == before[1]
    assert json.loads(contract.get_grant("second", "B"))["terms"] == ""
    before_second = contract.get_grant("second", "A")
    with vm.expect_revert("already offered"):
        contract.offer_grant("second", "Replace prior permission")
    assert contract.get_grant("second", "A") == before_second
    assert json.loads(contract.list_bundle_ids(0, 32)) == ["case", "second"]
    assert json.loads(contract.list_bundle_ids(1, 1)) == ["second"]
    with vm.expect_revert("pagination"):
        contract.list_bundle_ids(0, 33)
