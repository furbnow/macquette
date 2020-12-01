from ...views.helpers import build_static_dictionary


def test_build_static_dictionary_returns_some_files():
    d = build_static_dictionary()

    assert len(d.keys()) > 10


def test_build_static_dictionary_excludes_js_src():
    d = build_static_dictionary()

    for k, v in d.items():
        assert "js_src" not in k
        print(k, v)
