import dataclasses
import logging

import requests
import typedload
from returns.result import Failure, Result, Success


@dataclasses.dataclass
class _APIError:
    status: int
    error: str


@dataclasses.dataclass
class _APIResult:
    lsoa: str


@dataclasses.dataclass
class _APISuccess:
    status: int
    result: _APIResult


def _parse_lsoa_response(data: dict) -> _APISuccess | _APIError:
    if data["status"] != 200:
        return typedload.load(data, _APIError)
    else:
        return typedload.load(data, _APISuccess)


def get_lsoa(postcode: str) -> Result[str, str]:
    try:
        response = requests.get(
            f"https://api.postcodes.io/postcodes/{postcode}", timeout=3
        )
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address data")
        return Failure("Couldn't fetch LSOA")

    result = _parse_lsoa_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address data: {result.error}")
        return Failure(f"Couldn't fetch LSOA ({result.error})")
    else:
        return Success(result.result.lsoa)
