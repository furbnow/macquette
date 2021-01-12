import logging
import os
from os.path import abspath
from os.path import dirname
from os.path import join
from pathlib import Path

from django.contrib.auth import get_user_model
from django.db.models import Q
from django.templatetags.static import static
from rest_framework.exceptions import NotAuthenticated
from rest_framework.exceptions import PermissionDenied

from .. import models
from .. import VERSION

User = get_user_model()


def build_static_dictionary():
    """
    calls find_app_static_files() and returns a dictionary for example:
    {
        "js/foo.js": "/static/v1/js/foo.js"
    }

    or even like:
    {
        "js/foo.js": "https://some-cdn.com/static/v1/js/foo.js"
    }

    note that the dictionary value is created by calling the `static` helper, so depends
    on the specific static backend.
    """
    return {fn: static(os.path.join(VERSION, fn)) for fn in find_app_static_files()}


def find_app_static_files():
    """
    traverses the directory tree inside {app}/static/{VERSION}, yielding filenames like
    "js/example.js"  (not "v1/js/example.js")
    "css/foo.css",

    note that the version static subdirectory is stripped
    """

    def ignore(filename):
        for path in Path(filename).parents:
            if path.name == "js_src":
                return True
        else:
            return False

    static_dir = Path(abspath(dirname(__file__))).joinpath("..", "static", VERSION)
    static_dir = str(static_dir.resolve())

    for root, dirs, files in os.walk(static_dir):
        for fn in files:
            full_filename = join(root, fn)
            if not ignore(full_filename):
                start = len(static_dir) + 1
                relative_filename = full_filename[start:]
                yield relative_filename


def check_library_write_permissions(library, original_request):
    """
    check_library_write_permissions returns True if the given `library` is write-accessible
    based on `original_request`

    This allows the `list-libraries` view to query whether each library in the list is writeable
    based on the authentication present in the list view.

    It works by:
    * modifying the request method to `PATCH
    * calling UpdateDestroyLibrary().check_object_permissions(modified_request)
    * checking for permissions exceptions

    Using this function means the permissions are defined in a single place
    (UpdateDestroyLibrary.permission_classes).

    This should be used as a *hint* rather than as actual access control.
    """

    from ..views import UpdateDestroyLibrary  # avoid circular import

    original_method = original_request.method

    original_request.method = "PATCH"
    view = UpdateDestroyLibrary()

    allowed = False
    try:
        view.check_object_permissions(original_request, library)
    except (PermissionDenied, NotAuthenticated) as e:
        logging.debug(f"no permission to modify {library}: {e}")
        allowed = False
    else:
        allowed = True

    original_request.method = original_method
    return allowed


def check_library_share_permissions(library, original_request):
    """
    manually check the permissions for the ShareUnshareOrganisationLibraries view to work out
    if the current user (based on original_request) is allowed to share / unshare this library.
    """

    from ..views import ShareUnshareOrganisationLibraries  # avoid circular import

    owner_organisation = library.owner_organisation
    if owner_organisation is None:
        return False

    view = ShareUnshareOrganisationLibraries(
        kwargs={
            "pk": owner_organisation.id,
            "libraryid": library.id,
            # "otherorgid" not set as it's shouldn't be relevant: we're only checking permission
        }
    )

    # check view-level permissions
    for permission in view.get_permissions():
        if not permission.has_permission(original_request, view):
            return False

    # check object-level permissions
    for permission in view.get_permissions():
        if not permission.has_object_permission(
            original_request, view, owner_organisation
        ):
            return False

    return True


def get_assessments_for_user(user: User):
    """Return a list of all assessments a user can access."""

    my_assessments = Q(owner=user)
    in_organisations_i_administrate = Q(
        organisation__in=getattr(user, f"{VERSION}_organisations_where_admin").all()
    )

    return models.Assessment.objects.filter(
        my_assessments | in_organisations_i_administrate
    )
