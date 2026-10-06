"""Real gltest fluent API + five simulated validators; not GenVM/network proof."""
import json
import time
from urllib.parse import urlparse

import pytest
import requests
from eth_account import Account
from genlayer_py.types import CalldataAddress
from gltest import get_contract_factory
from gltest.assertions import tx_execution_succeeded
from gltest_cli.config.general import get_general_config

GEN = 10**18


def rpc(method, params):
    url = get_general_config().get_rpc_url()
    parsed = urlparse(url)
    assert parsed.hostname == "127.0.0.1" and parsed.port == 4187
    response = requests.post(url, json={"jsonrpc": "2.0", "id": 1,
                                       "method": method, "params": params}, timeout=30).json()
    assert "error" not in response, "Local simulation RPC operation failed"
    return response["result"]


def write(contract, account, method, args, value=0):
    try:
        receipt = getattr(contract.connect(account), method)(args=args).transact(
            value=value, wait_until="finalized", wait_interval=100, wait_retries=30)
    except Exception as error:
        pytest.fail("Local fluent write failed: " + type(error).__name__, pytrace=False)
    if not tx_execution_succeeded(receipt):
        pytest.fail("Local contract execution failed at " + method, pytrace=False)
    if method == "review_bundle":
        data = receipt.get("consensus_data", {})
        assert len(data.get("validators", [])) == 5
        assert list(data.get("votes", {}).values()) == ["agree"] * 5
        print("LOCAL ONLY: five simulated validators agree on the canonical coalition vector")


def test_complement_consensus_and_full_recovery():
    # Fresh ephemeral local-only signers, no secrets read from env or persisted.
    roles = [Account.create() for _ in range(3)]
    for role in roles:
        rpc("sim_fundAccount", {"account_address": role.address, "amount": 2 * GEN})
    installed = rpc("sim_installMocks", {
        "strict": True,
        "web_mocks": {
            r"https://www\.w3\.org/TR/2018/REC-odrl-model-20180215/": {
                "method": "GET", "status": 200, "body": "20180215 Permission"}},
        "llm_mocks": {".*": json.dumps(json.dumps(
            {"classes": ["INCOMPLETE", "INCOMPLETE", "COMPLETE"]}))},
    })
    assert installed == {"web": 1, "llm": 1, "strict": True}
    factory = get_contract_factory("CoverWeave")
    try:
        contract = factory.deploy(args=[], account=roles[0], wait_until="finalized",
                                  wait_interval=100, wait_retries=30)
    except Exception as error:
        pytest.fail("Local deploy failed: " + type(error).__name__, pytrace=False)
    now = int(time.time())
    write(contract, roles[0], "open_bundle", ["local-complement", "Read and export a record copy",
          CalldataAddress(roles[1].address), CalldataAddress(roles[2].address),
          now + 3600, now + 7200, now + 10800], value=2 * GEN)
    for role, terms in zip(roles[1:], ["Permission to read the record", "Permission to export a record copy"]):
        write(contract, role, "offer_grant", ["local-complement", terms])
    digest = json.loads(contract.get_bundle(args=["local-complement"]).call())["definition_digest"]
    for role in roles:
        write(contract, role, "ratify_bundle", ["local-complement", digest])
    write(contract, roles[0], "review_bundle", ["local-complement"])
    assert json.loads(contract.get_bundle(args=["local-complement"]).call())["status"] == "PURCHASED"
    assert json.loads(contract.get_attempt(args=["local-complement", 0]).call())["classes"] == [
        "INCOMPLETE", "INCOMPLETE", "COMPLETE"]
    write(contract, roles[0], "consume_permit", ["local-complement"])
    for role in roles[1:]:
        assert json.loads(contract.get_credit(args=["local-complement", CalldataAddress(role.address)]).call())["credit_gen"] == "1"
        write(contract, role, "withdraw_credit", ["local-complement"])
    write(contract, roles[0], "close_bundle", ["local-complement"])
    assert json.loads(contract.get_global_accounting().call())["liability_gen"] == "0"
    assert json.loads(contract.get_bundle(args=["local-complement"]).call())["status"] == "CLOSED"
