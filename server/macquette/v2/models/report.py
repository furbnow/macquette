import uuid as uuid_lib

from django.db import models

from .assessment import Assessment


class Report(models.Model):
    """
    A report, belonging to an assessment, generated from that assessment at
    a certain time
    """

    created_at = models.DateTimeField(auto_now_add=True)
    uuid = models.UUIDField(db_index=True, default=uuid_lib.uuid4, editable=False)

    assessment = models.ForeignKey(
        Assessment,
        null=False,
        blank=False,
        on_delete=models.CASCADE,
        related_name="reports",
    )

    def _report_path(self, filename):
        return f"reports/{self.uuid}.pdf"

    file = models.FileField(upload_to=_report_path, max_length=200)

    def __str__(self):
        return f"#{self.id} (report): assessment {self.assessment_id}"
