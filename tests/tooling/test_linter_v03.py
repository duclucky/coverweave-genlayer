"""Compatibility recognition must preserve the linter's negative controls."""
from genvm_linter.lint.safety import check_nondet_outside_eq_principle, check_safety
from genvm_linter.lint.structure import check_structure

SAFE = '''
import genlayer as gl
def review():
    def leader():
        return gl.nondet.exec_prompt("coverage")
    def validator(result):
        return result == leader()
    return gl.vm.run_nondet_default(leader, validator)
'''


def test_safe_v03_name_is_recognized():
    assert not check_nondet_outside_eq_principle(SAFE)


def test_unscoped_nondet_still_rejected():
    assert check_nondet_outside_eq_principle(SAFE.replace(
        'return gl.vm.run_nondet_default(leader, validator)', 'return leader()'))


def test_nested_safe_nondet_still_rejected():
    source = SAFE.replace('return gl.nondet.exec_prompt("coverage")',
                          'return gl.vm.run_nondet_default(lambda: 1, lambda r: True)')
    assert any(w.code == "E025" for w in check_safety(source))


def test_storage_write_in_safe_nondet_still_rejected():
    source = SAFE.replace('return gl.nondet.exec_prompt("coverage")', 'self.balance = 1')
    assert any(w.code == "E026" for w in check_safety(source))


def test_exact_v03_storage_decorator_is_recognized():
    source = '''
# { "Depends": "py-genlayer:pinned" }
import genlayer as gl
@gl.storage.allow
class Record:
    amount: bigint
class Named(gl.contract.Contract):
    records: TreeMap[str, Record]
'''
    assert not any("needs @allow_storage" in w.msg for w in check_structure(source))
    unsafe = source.replace('@gl.storage.allow', '@gl.storage.fake_allow')
    assert any("needs @allow_storage" in w.msg for w in check_structure(unsafe))
