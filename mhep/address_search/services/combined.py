import random

from django.conf import settings
from returns.primitives.exceptions import UnwrapFailedError
from returns.result import Failure, Success

from .elevation import get_elevation
from .lsoa import get_lsoa
from .resolve_address import ResolveResult, resolve_address


def get_combined_address_data(id: str):
    if not settings.FAKE_EXPENSIVE_DATA:
        main_data_r = resolve_address(id)
    else:
        is_error = random.choice([True, False, False, False, False])  # noqa: S311
        if is_error:
            main_data_r = Failure("Random error")
        else:
            main_data_r = Success(
                ResolveResult(
                    id="non_9999",
                    line_1="33 Heathcliffe Terrace",
                    line_2="",
                    line_3="",
                    post_town="Higglesby",
                    postcode="M1 6DD",
                    district="Scarfolk Town Council",
                    # A box within the bounds of the UK
                    longitude=random.uniform(-2.801514, -0.725098),  # noqa: S311
                    latitude=random.uniform(52.869130, 53.920516),  # noqa: S311
                    country="England",
                    uprn="9999999",
                )
            )

    lsoa_r = main_data_r.bind(lambda result: get_lsoa(result.postcode))
    elevation_r = main_data_r.bind(
        lambda result: get_elevation(result.latitude, result.longitude)
    )

    try:
        main_data = main_data_r.unwrap()
    except UnwrapFailedError:
        return {
            "error": main_data_r.failure(),
            "result": None,
        }
    else:
        return {
            "error": None,
            "result": {
                "id": id,
                "address": {
                    "line_1": main_data.line_1,
                    "line_2": main_data.line_2,
                    "line_3": main_data.line_3,
                    "post_town": main_data.post_town,
                    "postcode": main_data.postcode,
                    "country": main_data.country,
                },
                "uprn": main_data.uprn,
                "local_authority": main_data.district,
                "coordinates": [main_data.latitude, main_data.longitude],
                "elevation": elevation_r.value_or(None),
                "lsoa": lsoa_r.value_or(None),
            },
        }
