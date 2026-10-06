"""Forbidden transitions must reject before any canonical mutation."""
import json
import pytest

GEN = 10**18


@pytest.mark.parametrize("method,args", [
    ("offer_grant", ("guarded", "Permission to read records")),
    ("ratify_bundle", ("guarded", "0" * 64)),
    ("review_bundle", ("guarded",)),
    ("refund_expired", ("guarded",)),
    ("consume_permit", ("guarded",)),
    ("expire_permit", ("guarded",)),
    ("withdraw_credit", ("guarded",)),
    ("close_bundle", ("guarded",)),
])
def test_stranger_cannot_write_or_move_purchase(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie, method, args
):
    contract = direct_deploy("contracts/coverweave.py")
    from genlayer.types import Address
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-10-06T00:00:00Z")
    direct_vm.value = 2 * GEN
    contract.open_bundle("guarded", "Read and copy records", Address(direct_bob),
                         Address(direct_charlie), 1791248400, 1791252000, 1791255600)
    before = contract.get_accounting("guarded")
    direct_vm.value = 0
    direct_vm.sender = direct_vm._contract_address
    with direct_vm.expect_revert():
        getattr(contract, method)(*args)
    assert contract.get_accounting("guarded") == before
    assert json.loads(before)["received_gen"] == "2"
