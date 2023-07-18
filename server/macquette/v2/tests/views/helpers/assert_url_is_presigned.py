from datetime import datetime, timedelta, timezone
from urllib.parse import parse_qs, urlparse

from django.conf import settings


def assert_url_is_presigned(url) -> None:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    assert "AWSAccessKeyId" in qs
    assert qs["AWSAccessKeyId"][0] == settings.AWS_ACCESS_KEY_ID
    assert "Signature" in qs
    assert "Expires" in qs


def assert_presigned_url_expiry_between(
    url: str, smallest_acceptable_delta: timedelta, largest_acceptable_delta: timedelta
) -> None:
    parsed = urlparse(url)
    qs = parse_qs(parsed.query)
    expiry = datetime.fromtimestamp(int(qs["Expires"][0]), tz=timezone.utc)
    now = datetime.now(tz=timezone.utc)
    actual_delta = expiry - now
    assert actual_delta >= smallest_acceptable_delta, actual_delta
    assert actual_delta <= largest_acceptable_delta, actual_delta
