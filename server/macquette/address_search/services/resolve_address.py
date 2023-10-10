import dataclasses
import logging

import requests
import typedload
from django.conf import settings
from returns.result import Failure, Result, Success


@dataclasses.dataclass
class _APIError:
    code: int
    message: str


@dataclasses.dataclass
class ResolveResult:
    id: str
    line_1: str
    line_2: str
    line_3: str
    post_town: str
    postcode: str
    district: str
    longitude: float
    latitude: float
    country: str
    uprn: str


@dataclasses.dataclass
class _APISuccess:
    code: int
    message: str
    result: ResolveResult


def _parse_address_lookup_response(data: dict) -> _APISuccess | _APIError:
    if data["code"] != 2000:
        return typedload.load(data, _APIError)
    else:
        return typedload.load(data, _APISuccess)


def resolve_address(id: str) -> Result[ResolveResult, str]:
    api_key = settings.API_KEY["IDEAL_POSTCODES"]
    if api_key is None:
        return Failure("Address lookup not enabled")

    try:
        response = requests.get(
            f"https://api.ideal-postcodes.co.uk/v1/autocomplete/addresses/{id}/gbr",
            headers={"Authorization": f'api_key="{api_key}"'},
            timeout=3,
        )
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address data")
        return Failure("Couldn't fetch address data")

    result = _parse_address_lookup_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address data: {result}")
        return Failure("Couldn't fetch address data")
    else:
        return Success(result.result)
