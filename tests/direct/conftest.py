"""Windows-only file lifetime accommodation for upstream gltest's stdin loader.

No VM, storage, authorization, consensus or transfer behavior is replaced.
The upstream loader unlinks an fd duplicated onto stdin; Windows forbids this
until the VM has restored stdin. Defer only WinError 32 to fixture teardown.
"""
import os
from pathlib import Path
from unittest.mock import patch

import pytest
import json
from datetime import datetime, timezone

GEN = 10**18
START = 1791244800
OFFER, REVIEW, USE = START + 3600, START + 7200, START + 10800


def at(vm, timestamp):
    vm.warp(datetime.fromtimestamp(timestamp, timezone.utc).isoformat())


@pytest.fixture
def bundle_case(direct_vm, direct_deploy, direct_alice, direct_bob, direct_charlie):
    at(direct_vm, START)
    contract = direct_deploy("contracts/coverweave.py")
    from genlayer.types import Address
    roles = (Address(direct_alice), Address(direct_bob), Address(direct_charlie))
    direct_vm.sender = roles[0]
    direct_vm.value = 2 * GEN
    contract.open_bundle("case", "Read and export a copy of the record", roles[1], roles[2],
                         OFFER, REVIEW, USE)
    direct_vm.value = 0
    return direct_vm, contract, roles


def ready(case):
    vm, contract, roles = case
    for role, terms in zip(roles[1:], ("Permission to read the record",
                                      "Permission to export a copy of the record")):
        vm.sender = role
        contract.offer_grant("case", terms)
    digest = json.loads(contract.get_bundle("case"))["definition_digest"]
    for role in roles:
        vm.sender = role
        contract.ratify_bundle("case", digest)
    vm.sender = roles[0]
    return digest


def mocks(vm, classes):
    vm.clear_mocks()
    vm.mock_web(r"https://www\.w3\.org/.*", {"status": 200, "body": "20180215 Permission"})
    # gltest v0.30 auto-decodes once; v0.3 SDK expects JSON text on the wire
    # and performs its own decode. Preserve that transport representation.
    vm.mock_llm(r"CoverWeave CW1.*", json.dumps(json.dumps({"classes": classes})))


def state(contract):
    return (contract.get_bundle("case"), contract.get_accounting("case"),
            contract.get_global_accounting(), contract.get_grant("case", "A"),
            contract.get_grant("case", "B"))


@pytest.fixture(autouse=True)
def transaction_time_sync(monkeypatch):
    """gltest warp updates legacy datetime.now but misses v0.3 message.raw."""
    import sys
    from gltest.direct.vm import VMContext
    original = VMContext._refresh_gl_message

    def refresh(vm):
        original(vm)
        message = sys.modules.get("genlayer.message")
        if message is not None and isinstance(getattr(message, "raw", None), dict):
            message.raw["datetime"] = vm._datetime

    monkeypatch.setattr(VMContext, "_refresh_gl_message", refresh)


@pytest.fixture(autouse=True)
def windows_stdin_lifetime():
    if os.name != "nt":
        yield
        return
    from gltest.direct import loader
    original = loader._inject_message_to_fd0
    unlink = os.unlink
    deferred = []

    def unlink_after_close(path, *args, **kwargs):
        try:
            unlink(path, *args, **kwargs)
        except PermissionError as error:
            if error.winerror != 32:
                raise
            deferred.append(Path(path))

    def inject(vm):
        with patch.object(os, "unlink", unlink_after_close):
            return original(vm)

    with patch.object(loader, "_inject_message_to_fd0", inject):
        yield
    for path in deferred:
        path.unlink(missing_ok=True)
