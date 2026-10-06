"""Loopback-only GLSim; no real wallets, paid models or Studio Dev traffic."""
import os
import sys
import json
from pathlib import Path
from gltest.direct import loader
from gltest.direct.vm import VMContext

deferred = []
inject = loader._inject_message_to_fd0
unlink = os.unlink


def source_matches(code, source):
    # gltest read_text normalizes CRLF; Windows Git checkout preserves it in bytes.
    return code.replace(b"\r\n", b"\n") == source.replace(b"\r\n", b"\n")


def windows_inject(vm):
    def defer_open_file(path, *args, **kwargs):
        try:
            unlink(path, *args, **kwargs)
        except PermissionError as error:
            if error.winerror != 32:
                raise
            deferred.append(Path(path))
    if os.name != "nt":
        return inject(vm)
    os.unlink = defer_open_file
    try:
        return inject(vm)
    finally:
        os.unlink = unlink


refresh = VMContext._refresh_gl_message


def sync_transaction_time(vm):
    refresh(vm)
    message = sys.modules.get("genlayer.message")
    if message is not None and isinstance(getattr(message, "raw", None), dict):
        message.raw["datetime"] = vm._datetime


def deny_live(_request):
    raise RuntimeError("Local integration requires installed mocks; live provider disabled")


if __name__ == "__main__":
    loader._inject_message_to_fd0 = windows_inject
    VMContext._refresh_gl_message = sync_transaction_time
    from glsim.server import create_app, run_server
    app = create_app(num_validators=5, max_rotations=2, use_browser=False,
                     verbose=False, seed="coverweave-local-tests-only")
    app.state.engine._web_handler = deny_live
    app.state.engine._llm_handler = deny_live
    # The pinned simulator records user_value in Transaction but does not bind
    # it to its VM. Feed the exact decoded wire value into the simulated VM.
    # This is input fidelity, not evidence of a network transfer.
    from glsim import server
    send_raw = server.RPC_METHODS["eth_sendRawTransaction"]

    def send_with_value(store, engine, params):
        wire = server.decode_raw_transaction(server._positional(params, 0))
        payload = server.decode_genlayer_payload(wire["data"])
        value = payload.get("user_value")
        engine.vm.value = wire["value"] if value is None else value
        try:
            return send_raw(store, engine, params)
        finally:
            engine.vm.value = 0

    server.RPC_METHODS["eth_sendRawTransaction"] = send_with_value
    # Observe EVM emission without claiming that GLSim implements native value.
    install_hook = app.state.engine.install_cross_contract_hook

    def install_external_observer():
        install_hook()
        previous = app.state.engine.vm._gl_call_hook

        def observe(vm, request):
            if "EmitExternalMessage" in request:
                message = request["EmitExternalMessage"]
                if message["calldata"] != b"" or message["value"] not in (10**18, 2 * 10**18):
                    raise RuntimeError("Unexpected local EVM emission")
                return {"ok": None}
            return previous(vm, request)

        app.state.engine.vm._gl_call_hook = observe

    app.state.engine.install_cross_contract_hook = install_external_observer
    # Current genlayer-py uses the canonical empty-string method key, while
    # GLSim's dispatch still reads the old key. Adapt only the simulator decoder.
    from glsim import engine as engine_module
    decode_calldata = server.decode_calldata_bytes

    def decode_current_calldata(raw):
        decoded = decode_calldata(raw)
        if "" in decoded and "method" not in decoded:
            decoded = {**decoded, "method": decoded[""]}
        # GLSim decodes with the client library, then passes objects directly
        # into SDK storage proxies. Preserve address bytes using the actual
        # loaded contract SDK Address type, as GenVM calldata decoding does.
        from genlayer_py.types import CalldataAddress
        from gltest.direct.sdk_compat import import_address

        def sdk_value(value):
            if isinstance(value, CalldataAddress):
                return import_address()(value.as_bytes)
            if isinstance(value, list):
                return [sdk_value(v) for v in value]
            if isinstance(value, dict):
                return {k: sdk_value(v) for k, v in value.items()}
            return value

        return sdk_value(decoded)

    server.decode_calldata_bytes = decode_current_calldata
    engine_module.decode_calldata_bytes = decode_current_calldata
    # GLSim's cold schema path caches a class from a VM whose teardown evicts
    # its SDK modules, then reuses the stale Address/storage classes on deploy.
    # Supply the real SDK-generated ABI in a separate process instead. The exact
    # source is checked, so this cannot substitute a different contract schema.
    source = Path("contracts/coverweave.py").read_bytes()
    schema = json.loads(Path("docs/contract-schema.json").read_text())

    def matched_schema(code):
        if not source_matches(code, source):
            raise RuntimeError("Local schema source mismatch")
        return schema

    app.state.engine.get_sdk_schema_for_code = matched_schema
    try:
        run_server(app, host="127.0.0.1", port=4187)
    finally:
        for path in deferred:
            path.unlink(missing_ok=True)
