import logging
import random

import requests
from django.conf import settings
from pydantic import BaseModel
from returns.result import Failure, Result, Success


class _APIError(BaseModel):
    code: int
    message: str


class AddressSuggestion(BaseModel):
    id: str
    suggestion: str


class _APIResult(BaseModel):
    hits: list[AddressSuggestion]


class _APISuccess(BaseModel):
    code: int
    message: str
    result: _APIResult


def _parse_address_suggestion_response(data: dict) -> _APISuccess | _APIError:
    if data["code"] != 2000:
        return _APIError(**data)
    else:
        return _APISuccess(**data)


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

    is_error = random.choice([True, False, False, False, False])
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
