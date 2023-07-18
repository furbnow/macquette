def assert_error(response, expected_status, expected_detail):
    assert expected_status == response.status_code
    assert {"detail": expected_detail} == response.json()
