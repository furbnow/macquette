from mhep.versions import views


def test_app_list_ok():
    versions = views._displayable_versions()
    for v in versions:
        assert v.name == "Development" or v.name.startswith("Version ")
