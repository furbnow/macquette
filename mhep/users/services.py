import random
import string

from django.conf import settings
from social_django.models import UserSocialAuth

from . import auth0
from .models import User


def create_user(name: str, email: str) -> User:
    """Create a user using whatever Auth system is in action."""

    # Generate a random password that will be immediately changed
    password = "".join(random.choice(string.ascii_letters) for x in range(64))

    user = _create_django_user(name, email, password)

    # If plugged into Auth0, sync our local and remote states using the uid as our key
    if settings.USE_AUTH_SERVICE:
        auth0_userid = _get_or_create_auth0_userid(
            name,
            email,
            password,
        )
        UserSocialAuth.objects.get_or_create(
            user=user, uid=auth0_userid, provider="auth0"
        )

    return user


def _create_django_user(name: str, email: str, password: str):
    """Create a new Django user, associating with a Contact if supplied."""

    # Generate a known-unique username based on the email
    if User.objects.filter(username=email).count() == 0:
        # The email itself will do nicely most of the time.
        username = email
    else:
        username = email.split("@")[0]
        while User.objects.filter(username=username).exists():
            username = username + "".join(random.choice(string.digits))

    return User.objects.create_user(
        username=username,
        email=email,
        name=name,
        password=password,
    )


def _get_or_create_auth0_userid(name: str, email: str, password: str):
    """Get or create an Auth0 user with the given email."""

    if existing_user := auth0.find_user_by_email(email):
        return existing_user["user_id"]

    return auth0.create_user(name=name, email=email, password=password)
