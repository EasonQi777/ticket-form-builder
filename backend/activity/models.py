from django.conf import settings
from django.db import models

from core.models import Project, TimeStampedModel


class ActivityLog(TimeStampedModel):
    """
    One row per user-facing action, powering the dashboard's "Recent
    Activity" panel.

    Populated by explicit calls (see activity/services.py) at the relevant
    service/view call sites -- not signals, so the human-readable `summary`
    text stays under editorial control and bulk/system operations don't
    spam the feed.

    `target_type`/`target_id` are a loose reference, not a real
    GenericForeignKey -- deliberately simple since the UI never needs to
    resolve them back to a live object today, only display a static row.

    See RECENT_ACTIVITY_FEATURE_DESIGN.md §4 (Option A) for the full design.
    """

    class Status(models.TextChoices):
        # Values here are contract with the frontend's pill colors (see
        # RECENT_ACTIVITY_FEATURE_DESIGN.md §2.3) -- don't rename lightly.
        SUCCESS = 'success', 'Created'
        PENDING = 'pending', 'Pending'
        INFO = 'info', 'Updated'

    project = models.ForeignKey(
        Project, on_delete=models.CASCADE, related_name='activity_logs',
    )
    actor = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='+',
    )
    verb = models.CharField(max_length=32)
    summary = models.CharField(max_length=255)
    status = models.CharField(max_length=16, choices=Status.choices, default=Status.INFO)
    target_type = models.CharField(max_length=32, blank=True, default='')
    target_id = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            # Every query is "latest N for project(s) the user belongs to".
            models.Index(fields=['project', '-created_at'], name='activity_project_created_idx'),
        ]

    def __str__(self):
        return f"[{self.status}] {self.summary}"
