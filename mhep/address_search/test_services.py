import pytest
from django.test import override_settings
from returns.result import Failure, Success

from . import services


@override_settings(API_KEY={"IDEAL_POSTCODES": None})
def test_suggestions_no_api_key():
    """Having no API key should result in an error"""
    result = services.get_suggestions("Downing Street")
    assert isinstance(result, Failure)


@pytest.mark.skip("Requires a key")
def test_suggestions_community_api_key():
    """Using the community API key should produce some results"""
    result_r = services.get_suggestions("Downing Street")
    assert isinstance(result_r, Success)

    result = result_r.unwrap()
    assert len(result) > 0
    assert "Downing" in result[0].suggestion


def test_lookup_lsoa_valid_postcode_should_produce_result():
    result = services.get_lsoa("M13 0PQ")
    assert result == Success("Manchester 027F")


def test_lookup_lsoa_invalid_postcode_should_produce_failure():
    result = services.get_lsoa("nonsense")
    assert result == Failure("Couldn't fetch LSOA (Invalid postcode)")


def test_elevation_lookup():
    result = services.get_elevation(41.161758, -8.583933)
    assert result == Success(117)


@pytest.mark.skip("Requires a key & costs money to run")
def test_full_lookup():
    result = services.get_combined_address_data("paf_14407651")
    assert result == {
        "error": None,
        "result": {
            "id": "paf_14407651",
            "address": {
                "line_1": "189 Hamilton Road",
                "line_2": "",
                "line_3": "",
                "post_town": "MANCHESTER",
                "postcode": "M13 0PQ",
                "country": "England",
            },
            "uprn": "77148192",
            "local_authority": "Manchester",
            "coordinates": [53.4506134, -2.1981181],
            "elevation": 53.0,
            "lsoa": "Manchester 027F",
        },
    }
