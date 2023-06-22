import logging
import os
from os.path import abspath, dirname, join

from django.db.models import Q
from django.templatetags.static import static
from rest_framework.exceptions import NotAuthenticated, PermissionDenied

from macquette.users import models as user_models

from .. import VERSION, models


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

    static_dir = join(abspath(dirname(__file__)), "..", "static", VERSION)

    for root, _dirs, files in os.walk(static_dir):
        for fn in files:
            # We think collectstatic doesn't collect dotfiles, so this prevents an error
            # in production when Django loads up where there is a dotfile in the static
            # source directory, but collectstatic doesn't have it in its manifest
            if fn.startswith("."):
                continue

            full_filename = join(root, fn)
            start = len(static_dir) + 1
            relative_filename = full_filename[start:]
            # print("relative: {}".format(relative_filename))
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

    from ..views.libraries import UpdateDestroyLibrary  # avoid circular import

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
    manually check the permissions for the ShareUnshareOrganisationLibraries view to
    work out if the current user (based on original_request) is allowed to share /
    unshare this library.
    """

    owner_organisation = library.owner_organisation
    if owner_organisation is None:
        return False

    if original_request.user not in owner_organisation.admins.all():
        return False

    from ..views.organisations import (
        ShareUnshareOrganisationLibraries,
    )

    view = ShareUnshareOrganisationLibraries(
        kwargs={
            "pk": owner_organisation.id,
            "libraryid": library.id,
            # "otherorgid" not set as it's shouldn't be relevant: we're only checking permission
        }
    )

    # check object-level permissions
    for permission in view.get_permissions():
        if not permission.has_object_permission(
            original_request, view, owner_organisation
        ):
            return False

    return True


def check_assessment_share_permissions(assessment, original_request):
    """
    Work out if the current user (based on original_request) is allowed to share /
    unshare this assessment.
    """

    from ..views.assessments import ShareUnshareAssessment

    view = ShareUnshareAssessment(
        kwargs={
            "pk": assessment.id,
            # "userid" not set as it's shouldn't be relevant: we're only checking permission
        }
    )

    # check object-level permissions
    for permission in view.get_permissions():
        if not permission.has_object_permission(original_request, view, assessment):
            return False

    return True


def check_assessment_reassign_permissions(assessment, request, user_id):
    """Decide if the current user is allowed to reassign this assessment."""

    if assessment.organisation is None:
        return (False, "can't reassign assessment not in an organisation")

    if (
        request.user.pk != assessment.owner.pk
        and not assessment.organisation.admins.filter(id=request.user.pk).exists()
    ):
        return (False, "can't reassign assessment if not owner or admin")

    if not assessment.organisation.members.filter(id=user_id).exists():
        return (False, "can't reassign to users outside organisation")

    return (True, None)


def get_assessments_for_user(user: user_models.User):
    """Return a list of all assessments a user can access."""

    my_assessments = Q(owner=user)
    assessments_shared_with_me = Q(shared_with=user)
    in_organisations_i_administrate = Q(
        organisation__in=getattr(user, f"{VERSION}_organisations_where_admin").all()
    )

    return models.Assessment.objects.filter(
        my_assessments | in_organisations_i_administrate | assessments_shared_with_me
    ).distinct()
