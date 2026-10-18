import base64

from app.config import REALITY_MIN_CLIENT_VER
from app.xui_client import apply_karing_reality_settings, apply_reality_inbound_defaults, parse_client_traffic


def test_parse_client_traffic_from_obj_wrapper():
    up, down = parse_client_traffic({"success": True, "obj": {"up": 10, "down": 20}})
    assert up == 10
    assert down == 20


def test_parse_client_traffic_from_direct_dict():
    up, down = parse_client_traffic({"upload": 5, "download": 7})
    assert up == 5
    assert down == 7


def test_parse_client_traffic_from_list():
    up, down = parse_client_traffic([{"up": 1, "down": 2}])
    assert up == 1
    assert down == 2


def test_parse_client_traffic_empty_payload():
    assert parse_client_traffic(None) == (0, 0)
    assert parse_client_traffic([]) == (0, 0)


def test_apply_reality_inbound_defaults_sets_min_client_ver():
    reality = apply_reality_inbound_defaults({"dest": "www.bing.com:443"})
    assert reality["minClientVer"] == REALITY_MIN_CLIENT_VER
    assert reality["minClient"] == "1.0.0"


def test_apply_karing_reality_settings_strips_base64_padding():
    raw = bytes([255]) + bytes(31)
    padded = base64.b64encode(raw).decode("ascii")
    client_key = base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")
    reality = {
        "privateKey": padded,
        "minClientVer": "1.0.0",
        "minClient": "1.0.0",
        "settings": {"publicKey": padded, "fingerprint": "chrome"},
    }
    assert apply_karing_reality_settings(reality) is True
    assert reality["privateKey"] == client_key
    assert reality["settings"]["publicKey"] == client_key
    assert reality["settings"]["fingerprint"] == "chrome"
    assert apply_karing_reality_settings(reality) is False
