"""Minimal compatibility shim for `notifications.models`.

Only the enum-like `TextChoices` classes are reproduced here (verbatim
values, trimmed to the members actually referenced by the apps kept in this
project). Deliberately NOT a real Django model - there is no Notification
table in this project, so nothing needs to be in INSTALLED_APPS or migrated.
See notifications/action_urls.py and notifications/services.py for the rest
of this shim, and the README's "Known simplifications" section for context.
"""

from django.db import models


class NotificationCategory(models.TextChoices):
    COLLABORATION = "COLLABORATION", "Collaboration"
    SYSTEM = "SYSTEM", "System"


class NotificationEventType(models.TextChoices):
    PROJECT_INVITE = "project_invite", "Project invitation"
    ACCOUNT_PERMISSION = "account_permission", "Account permission changed"
