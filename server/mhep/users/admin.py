from django.contrib import admin
from django.contrib.auth import admin as auth_admin
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils.html import format_html

from mhep.users.forms import UserChangeForm, UserCreationForm

User = get_user_model()


@admin.register(User)
class UserAdmin(auth_admin.UserAdmin):
    form = UserChangeForm
    add_form = UserCreationForm
    # SAFETY: the type stubs don't type fieldsets correctly
    fieldsets = [  # type: ignore[misc]
        ("User", {"fields": ("name",)}),
        *auth_admin.UserAdmin.fieldsets,
    ]
    list_display = ["username", "name", "email", "_usa", "is_staff", "is_superuser"]
    search_fields = ["name"]
    actions = ["username_to_email", "fill_in_full_name"]

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.prefetch_related("social_auth")

    def _usa(self, user):
        links = [
            (
                "<a href='"
                + reverse("admin:social_django_usersocialauth_change", args=(usa.id,))
                + "'>Record</a>"
            )
            for usa in user.social_auth.all()
        ]

        return format_html(", ".join(links))

    @admin.action(description="Set username to email address")
    def username_to_email(self, request, queryset):
        done = 0
        no_email = 0
        already = 0

        for user in queryset:
            if user.email == "":
                no_email += 1
            elif user.username != user.email:
                user.username = user.email
                user.save()
                done += 1
            else:
                already += 1

        self.message_user(
            request,
            f"{no_email} with no email, {already} already had the same username + email, {done} records updated.",
        )

    @admin.action(description="Set full name field to first+last names")
    def fill_in_full_name(self, request, queryset):
        done = 0
        no_name = 0
        already = 0

        for user in queryset:
            fullname = f"{user.first_name} {user.last_name}"

            if user.name == " ":
                no_name += 1
            elif user.name != "":
                already += 1
            elif user.name != fullname:
                user.name = fullname
                user.first_name = ""
                user.last_name = ""
                user.save()
                done += 1

        self.message_user(
            request,
            f"{no_name} with no name, {already} already had full names, {done} records updated.",
        )
