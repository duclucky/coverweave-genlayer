import pytest
from conftest import state, GEN


@pytest.mark.parametrize("method,args", [
    ("offer_grant", ("case", "Permission to read")),
    ("ratify_bundle", ("case", "0" * 64)),
    ("review_bundle", ("case",)), ("refund_expired", ("case",)),
    ("consume_permit", ("case",)), ("expire_permit", ("case",)),
    ("withdraw_credit", ("case",)), ("close_bundle", ("case",)),
])
def test_nonpayable_write_explicitly_rejects_gen_without_mutation(bundle_case, method, args):
    vm, contract, roles = bundle_case
    vm.sender = roles[1]
    vm.value = GEN
    before = state(contract)
    with vm.expect_revert("Nonpayable write cannot receive GEN"):
        getattr(contract, method)(*args)
    assert state(contract) == before
