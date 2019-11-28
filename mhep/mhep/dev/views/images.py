from rest_framework import generics, permissions, status
from rest_framework.response import Response

from .. import models
from . import helpers


class DeleteImage(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    queryset = models.Image.objects

    def delete(self, request, pk):
        image = self.get_object()

        allowed_assessments = helpers.get_assessments_for_user(request.user)
        if image.assessment not in allowed_assessments:
            return Response(None, status.HTTP_403_FORBIDDEN)

        image.delete()

        return Response(None, status.HTTP_204_NO_CONTENT)
