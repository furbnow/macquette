from django.db import transaction
from django.utils.decorators import method_decorator
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from returns.result import Success

from . import services


# Non-atomic because it doesn't write to the DB or require consistent state,
# so let's avoid it blocking anyone.
@method_decorator(transaction.non_atomic_requests, name="dispatch")
class ListSuggestions(APIView):
    permission_classes = [permissions.IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        q = serializers.CharField()

    def get(self, request, format=None):
        serializer = self.InputSerializer(data=request.GET)
        serializer.is_valid(raise_exception=True)

        suggestions_r = services.get_suggestions(serializer.data["q"])

        return Response(
            suggestions_r.map(
                lambda hits: {
                    "error": None,
                    "results": [
                        {"id": hit.id, "suggestion": hit.suggestion} for hit in hits
                    ],
                }
            )
            .lash(
                lambda error: Success(
                    {
                        "error": error,
                        "results": [],
                    }
                )
            )
            .unwrap()
        )


# Non-atomic because it doesn't write to the DB or require consistent state,
# so let's avoid it blocking anyone.
@method_decorator(transaction.non_atomic_requests, name="dispatch")
class PerformLookup(APIView):
    permission_classes = [permissions.IsAuthenticated]

    class InputSerializer(serializers.Serializer):
        id = serializers.CharField()

    def post(self, request, format=None):
        serializer = self.InputSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        return Response(services.get_combined_address_data(serializer.data["id"]))
