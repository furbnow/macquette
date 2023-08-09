from datetime import timedelta
from urllib.parse import parse_qs, urlparse

from django.conf import settings


def assert_url_is_presigned(url) -> None:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    assert "X-Amz-Credential" in qs
    assert qs["X-Amz-Credential"][0].startswith(settings.AWS_ACCESS_KEY_ID)
    assert "X-Amz-Signature" in qs
    assert "X-Amz-Expires" in qs


def get_presigned_url_expiry(url: str) -> timedelta:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    return timedelta(seconds=int(qs["X-Amz-Expires"][0]))
