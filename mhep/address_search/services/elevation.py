import logging

import requests
from pydantic import BaseModel
from returns.result import Failure, Result, Success


class _APIError(BaseModel):
    error: str


class _APIResult(BaseModel):
    elevation: float


class _APISuccess(BaseModel):
    results: list[_APIResult]


def _parse_elevation_response(data: dict) -> _APISuccess | _APIError:
    if "error" in data:
        return _APIError(**data)
    else:
        return _APISuccess(**data)


def get_elevation(latitude: float, longitude: float) -> Result[float, str]:
    try:
        response = requests.get(
            "https://api.open-elevation.com/api/v1/lookup"
            f"?locations={latitude},{longitude}"
        )
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address data")
        return Failure("Couldn't fetch elevation")

    result = _parse_elevation_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address data: {result.error}")
        return Failure(f"Couldn't fetch elevation ({result.error})")
    else:
        return Success(result.results[0].elevation)
