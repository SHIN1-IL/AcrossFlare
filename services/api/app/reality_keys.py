import base64


def reality_key_for_client(value: str | None) -> str:
    """Raw URL-safe base64 (no padding), the form Xray and Karing decode.

    Standard base64 keeps a trailing ``=``. Karing then fails with
    ``decode public_key: illegal base64 data at input byte 43``.
    """
    raw = (value or "").strip()
    if not raw:
        return ""
    translated = raw.replace("-", "+").replace("_", "/")
    pad = translated + ("=" * ((4 - len(translated) % 4) % 4))
    try:
        decoded = base64.b64decode(pad, validate=True)
    except Exception:
        return raw
    if len(decoded) != 32:
        return raw
    return base64.urlsafe_b64encode(decoded).decode("ascii").rstrip("=")
