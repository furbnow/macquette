import logging

import requests
from pydantic import BaseModel
from returns.result import Failure, Result, Success


class _APIError(BaseModel):
    status: int
    error: str


class _APIResult(BaseModel):
    lsoa: str


class _APISuccess(BaseModel):
    status: int
    result: _APIResult


def _parse_lsoa_response(data: dict) -> _APISuccess | _APIError:
    if data["status"] != 200:
        return _APIError(**data)
    else:
        return _APISuccess(**data)


def get_lsoa(postcode: str) -> Result[str, str]:
    try:
        response = requests.get(f"https://api.postcodes.io/postcodes/{postcode}")
    except requests.exceptions.RequestException:
        logging.exception("Network error while fetching address data")
        return Failure("Couldn't fetch LSOA")

    result = _parse_lsoa_response(response.json())
    if isinstance(result, _APIError):
        logging.error(f"Error getting address data: {result.error}")
        return Failure(f"Couldn't fetch LSOA ({result.error})")
    else:
        return Success(result.result.lsoa)
