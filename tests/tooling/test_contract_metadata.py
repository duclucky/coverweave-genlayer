import ast
from pathlib import Path

SOURCE = Path("contracts/coverweave.py").read_text(encoding="ascii")
TREE = ast.parse(SOURCE)


def test_ascii_header_single_named_contract_and_exact_write_payability():
    assert SOURCE.splitlines()[0] == '# v0.3.0'
    assert SOURCE.splitlines()[1] == '# { "Depends": "py-genlayer:5jycge4q8k23462jtb0b9fyey1s9qz928sz2nbrd9mg4sxqg2qng" }'
    classes = [c for c in TREE.body if isinstance(c, ast.ClassDef)
               and any(ast.unparse(b) == "gl.contract.Contract" for b in c.bases)]
    assert [c.name for c in classes] == ["CoverWeave"]
    methods = {m.name: [ast.unparse(d) for d in m.decorator_list]
               for m in classes[0].body if isinstance(m, ast.FunctionDef)}
    payable = [name for name, ds in methods.items() if "gl.public.write.payable" in ds]
    assert payable == ["open_bundle"]
    assert sum("gl.public.view" in ds for ds in methods.values()) == 8
    assert sum(any(d.startswith("gl.public.write") for d in ds) for ds in methods.values()) == 9
    assert "gl.chain.Account" not in SOURCE
    assert "@gl.evm.contract_interface" in SOURCE
    assert "gl.vm.run_nondet_default(leader, validator)" in SOURCE
    assert "gl.vm.run_nondet(" not in SOURCE


def test_every_write_has_full_safety_card_in_locked_spec():
    spec = Path("docs/README.md").read_text(encoding="utf-8")
    names = ["open_bundle", "offer_grant", "ratify_bundle", "review_bundle", "refund_expired",
             "consume_permit", "expire_permit", "withdraw_credit", "close_bundle"]
    for name in names:
        assert f"Safety card: {name}" in spec or f"Safety card — {name}" in spec or f"{name} |" in spec
