from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.contrib.staticfiles.storage import staticfiles_storage
from django.urls import include, path, reverse_lazy
from django.views import defaults as default_views
from django.views.generic.base import RedirectView

admin.site.site_header = "Macquette"
admin.site.site_title = "Backend admin"
admin.site.index_title = "Macquette administration"

urlpatterns = [
    path(
        "favicon.ico", RedirectView.as_view(url=staticfiles_storage.url("favicon.png"))
    ),
    # Django Admin, use {% url 'admin:index' %}
    path(settings.ADMIN_URL, admin.site.urls),
    # Login stuff
    path("", include("mhep.users.urls")),
    # Your stuff: custom urls includes go here
    path(
        "", RedirectView.as_view(url=reverse_lazy("v2:list-assessments")), name="index"
    ),
    # Add app versions after this line
    path("v2/", include("mhep.v2.urls", namespace="v2")),
    path("dev/", include("mhep.dev.urls", namespace="dev")),
    path(
        "organisations/",
        include("mhep.organisations_ui.urls", namespace="organisations-ui"),
    ),
    path(
        "api/organisations/",
        include("mhep.organisations_api.urls", namespace="organisations-api"),
    ),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

if settings.DEBUG:
    # This allows the error pages to be debugged during development, just visit
    # these url in browser to see how these error pages look like.
    urlpatterns += [
        path(
            "400/",
            default_views.bad_request,
            kwargs={"exception": Exception("Bad Request!")},
        ),
        path(
            "403/",
            default_views.permission_denied,
            kwargs={"exception": Exception("Permission Denied")},
        ),
        path(
            "404/",
            default_views.page_not_found,
            kwargs={"exception": Exception("Page not Found")},
        ),
        path("500/", default_views.server_error),
    ]
    if "debug_toolbar" in settings.INSTALLED_APPS:
        import debug_toolbar

        urlpatterns = [path("__debug__/", include(debug_toolbar.urls))] + urlpatterns
