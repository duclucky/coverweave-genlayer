"""Own a loopback simulator when gltest is invoked without the npm runner."""
import os
from pathlib import Path
import subprocess
import sys
import time
from urllib.parse import urlparse

import pytest
import requests
from gltest_cli.config.general import get_general_config


@pytest.fixture(scope="module", autouse=True)
def local_simulator():
    parsed = urlparse(get_general_config().get_rpc_url())
    assert (parsed.scheme, parsed.hostname, parsed.port, parsed.path) == (
        "http", "127.0.0.1", 4187, "/api"), "Integration tests require the loopback simulator"
    health = "http://127.0.0.1:4187/health"

    def healthy():
        try:
            response = requests.get(health, timeout=0.5)
            return response.ok and response.json().get("status") == "ok"
        except (requests.RequestException, ValueError):
            return False

    server = None
    root = Path(__file__).resolve().parents[2]
    patch = pytest.MonkeyPatch()
    try:
        if not healthy():
            server = subprocess.Popen(
                [sys.executable, str(root / "scripts/local_sim.py")], cwd=root,
                env={**os.environ, "PYTHONUTF8": "1"},
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
            deadline = time.monotonic() + 15
            while not healthy():
                assert server.poll() is None, "Local simulator exited during startup"
                assert time.monotonic() < deadline, "Local simulator startup timed out"
                time.sleep(0.2)
        # Keep the official fluent API, but never fall back to hosted schema RPCs.
        import gltest.contracts.contract_factory as factory
        patch.setattr(factory, "get_gl_hosted_studio_client", factory.get_gl_client)
        patch.setattr(factory, "get_local_client", factory.get_gl_client)
        yield
    finally:
        patch.undo()
        if server is not None and server.poll() is None:
            server.terminate()
            try:
                server.wait(timeout=5)
            except subprocess.TimeoutExpired:
                server.kill()
                server.wait(timeout=5)
