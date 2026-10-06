"""Recognize two verified v0.3 names in pinned upstream AST rules.

Upstream commit 28450e665666300fc648dbe495110dfd0cb6a7b4 validates v0.3
schemas but its AST lists still use v0.2 names. No diagnostic is disabled.
Both the safe-entry list AND nested-sandbox prohibition gain the same name.
Run tests/tooling/test_linter_v03.py after applying; fail on unexpected source.
"""
from pathlib import Path
import genvm_linter


def apply():
    base = Path(genvm_linter.__file__).parent / "lint"
    changes = {
        "safety.py": [
            ('"gl.vm.run_nondet": [0, 1],',
             '"gl.vm.run_nondet_default": [0, 1],\n        "gl.vm.run_nondet": [0, 1],'),
            ('NONDET_SPAWN_CALLS = frozenset({\n',
             'NONDET_SPAWN_CALLS = frozenset({\n    "gl.vm.run_nondet_default",\n'),
        ],
        "structure.py": [
            ('if dec_name in ("allow_storage", "gl.allow_storage"):',
             'if dec_name in ("allow_storage", "gl.allow_storage", "gl.storage.allow"):')
        ],
    }
    for name, replacements in changes.items():
        path = base / name
        source = path.read_text(encoding="utf-8")
        for old, new in replacements:
            if new in source:
                continue
            if source.count(old) != 1:
                raise RuntimeError("Unexpected pinned linter source: " + name)
            source = source.replace(old, new, 1)
        path.write_text(source, encoding="utf-8")
    print("v0.3 AST recognition applied; no diagnostic disabled")


if __name__ == "__main__":
    apply()
