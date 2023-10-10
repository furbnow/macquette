from auth0.authentication import GetToken
from auth0.management import Auth0
from django.conf import settings
from django.core.mail import send_mail


def get_client():
    domain = settings.AUTH0_ENDPOINT
    get_token = GetToken(
        domain,
        settings.SOCIAL_AUTH_AUTH0_KEY,
        settings.SOCIAL_AUTH_AUTH0_SECRET,
    )
    token = get_token.client_credentials(f"https://{domain}/api/v2/")
    mgmt_api_token = token["access_token"]

    return Auth0(domain, mgmt_api_token)


def create_user(
    *,
    name: str,
    email: str,
    password: str,
) -> str:
    auth0 = get_client()
    response = auth0.users.create(
        {
            "connection": settings.AUTH0_DB_NAME,
            "email": email,
            "password": password,
            "blocked": False,
            # The email is not verified and we don't want Auth0 sending their
            # own verification email because the 'password change' email itself
            # will do the verification.
            "email_verified": False,
            "verify_email": False,
            "name": name,
        }
    )

    if "user_id" not in response:
        raise ValueError("Auth0 didn't respond with a user ID")
    else:
        _notify_new_user(response["user_id"], email)
        return response["user_id"]


def find_user_by_email(email: str) -> dict | None:
    auth0 = get_client()
    response = auth0.users_by_email.search_users_by_email(email=email)

    if len(response) == 0:
        return None
    elif len(response) == 1:
        return response[0]
    else:
        # Really shouldn't happen
        raise ValueError("Duplicated Auth0 user")


def _notify_new_user(auth0_userid: str, email: str):
    """
    Notify a newly created user of their account.

    Invite them to change their password, by first creating a password reset token and
    then emailing it to them.
    """
    reset_url = _create_auth0_password_reset(auth0_userid)
    app_name = settings.APP_NAME
    site_url = settings.SITE_URL
    body = f"""Hello,

You now have an account for {app_name} at {site_url}.

To login you will first need to set your password at:

{reset_url}

When you login, please use this email address - {email}.

Thanks,
The {app_name} Robot
"""

    send_mail(
        f"User account to access {app_name}",
        body,
        settings.FROM_EMAIL,
        [email],
        fail_silently=False,
    )


def _create_auth0_password_reset(auth0_userid: str) -> str:
    """
    Create a password change request and return URL to the password reset page.

    See:
    - https://auth0.com/docs/api/v2#!/Tickets/post_password_change
    """

    auth0 = get_client()
    response = auth0.tickets.create_pswd_change(
        {
            "user_id": auth0_userid,
            "mark_email_as_verified": True,
            "includeEmailInRedirect": False,
        }
    )
    return response["ticket"]
