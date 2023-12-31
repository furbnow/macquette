import dataclasses
import logging
from typing import Literal

import requests
import typedload
from returns.result import Failure, Result, Success


@dataclasses.dataclass
class _APIError:
    error: str
    status: Literal["INVALID_REQUEST", "SERVER_ERROR"]


@dataclasses.dataclass
class LatLongPair:
    lat: float
    lng: float


@dataclasses.dataclass
class _APIResult:
    elevation: float
    location: LatLongPair
    dataset: Literal["eudem25m"]


@dataclasses.dataclass
class _APISuccess:
    results: list[_APIResult]
    status: Literal["OK"]


def _parse_elevation_response(data: dict) -> _APISuccess | _APIError:
    if "error" in data:
        return typedload.load(data, _APIError)
    else:
        return typedload.load(data, _APISuccess)


def get_elevation(latitude: float, longitude: float) -> Result[int, str]:
    try:
        response = requests.get(
            "https://api.opentopodata.org/v1/eudem25m"
            f"?locations={latitude},{longitude}",
            timeout=3,
        )
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address data")
        return Failure("Couldn't fetch elevation")

    result = _parse_elevation_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address data: {result.error}")
        return Failure(f"Couldn't fetch elevation ({result.error})")
    else:
        return Success(int(result.results[0].elevation))
