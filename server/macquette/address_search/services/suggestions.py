import dataclasses
import logging
import random

import requests
import typedload
from django.conf import settings
from returns.result import Failure, Result, Success


@dataclasses.dataclass
class _APIError:
    code: int
    message: str


@dataclasses.dataclass
class AddressSuggestion:
    id: str
    suggestion: str


@dataclasses.dataclass
class _APIResult:
    hits: list[AddressSuggestion]


@dataclasses.dataclass
class _APISuccess:
    code: int
    message: str
    result: _APIResult


def _parse_address_suggestion_response(data: dict) -> _APISuccess | _APIError:
    if data["code"] != 2000:
        return typedload.load(data, _APIError)
    else:
        return typedload.load(data, _APISuccess)


def get_suggestions(query: str) -> Result[list[AddressSuggestion], str]:
    if settings.FAKE_EXPENSIVE_DATA:
        return fake_suggestions()

    api_key = settings.API_KEY["IDEAL_POSTCODES"]
    if api_key is None:
        return Failure("Address suggestions not enabled")

    try:
        response = requests.get(
            f"https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses?q={query}",
            headers={"Authorization": f'api_key="{api_key}"'},
            timeout=3,
        )
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address suggestions")
        return Failure("Couldn't fetch address suggestions")

    result = _parse_address_suggestion_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address suggestions ({result})")
        return Failure("Couldn't fetch address suggestions")
    else:
        return Success(result.result.hits)


def fake_suggestions() -> Result[list[AddressSuggestion], str]:
    from faker import Faker

    fake = Faker("en_GB")

    is_error = random.choice([True, False, False, False, False])  # noqa: S311
    if is_error:
        return Failure("Random error")
    else:
        return Success(
            [
                AddressSuggestion(
                    id=f"fake_{idx}",
                    suggestion=fake.address().replace("\n", ", "),
                )
                for idx in range(1, 10)
            ]
        )
