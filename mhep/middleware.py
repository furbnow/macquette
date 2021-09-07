from django.http import HttpResponse


class HealthCheckMiddleware:
    """
    Respond to a health check with 200 message.

    This is taken from https://stackoverflow.com/a/64623669/10956063.  Note the
    difference in the URL - we use /.well-known/x-healthcheck because it definitely
    won't clash with anything else.

    This must be placed above django.middleware.common.CommonMiddleware in the
    MIDDLEWARE list.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path == "/.well-known/x-healthcheck":
            return HttpResponse("ok")
        return self.get_response(request)
