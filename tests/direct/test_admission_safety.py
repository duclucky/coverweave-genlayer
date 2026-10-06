import pytest
import json

GEN = 10**18


def test_open_requires_exact_purchase_and_unique_id(
    direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie
):
    contract = direct_deploy("contracts/coverweave.py")
    from genlayer.types import Address
    direct_vm.sender = direct_alice
    direct_vm.warp("2026-10-06T00:00:00Z")
    args = ("bundle-1", "Read and copy a record", Address(direct_bob), Address(direct_charlie),
            1791248400, 1791252000, 1791255600)
    direct_vm.value = GEN
    with direct_vm.expect_revert("Exactly 2 GEN required"):
        contract.open_bundle(*args)
    assert json.loads(contract.get_accounting("bundle-1"))["received_gen"] == "0"
    direct_vm.value = 2 * GEN
    contract.open_bundle(*args)
    assert json.loads(contract.get_accounting("bundle-1"))["received_gen"] == "2"
    with direct_vm.expect_revert("Bundle ID already exists"):
        contract.open_bundle(*args)
    assert json.loads(contract.get_accounting("bundle-1"))["received_gen"] == "2"
