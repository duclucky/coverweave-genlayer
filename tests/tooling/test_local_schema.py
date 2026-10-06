"""Windows checkout line endings must not conceal changed contract contents."""
import runpy


def test_schema_accepts_only_exact_source_modulo_windows_newlines():
    matches = runpy.run_path("scripts/local_sim.py", run_name="local_schema_test")["source_matches"]
    source = b"# v0.3.0\r\nclass CoverWeave:\r\n    pass\r\n"
    assert matches(source.replace(b"\r\n", b"\n"), source)
    assert matches(source, source)
    assert not matches(source.replace(b"pass", b"raise"), source)
    assert not matches(source + b"# different\n", source)
