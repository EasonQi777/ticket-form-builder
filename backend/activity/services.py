"""
Helpers for writing ActivityLog rows from the app's service/view layer.

Call sites log explicitly at the relevant service/view call sites (ticket
form create/update, ticket submitted, experience group create/update/
publish, project settings changed) rather than via signals -- see
RECENT_ACTIVITY_FEATURE_DESIGN.md §4/§5 for why.
"""

import logging

from activity.models import ActivityLog

logger = logging.getLogger(__name__)


def log_activity(*, project_id, verb, summary, status, actor=None, target_type='', target_id=None):
    """
    Create one ActivityLog row.

    Never raises: a logging failure should never break the action it's
    describing (e.g. a ticket form must still save even if its activity
    row can't be written).
    """
    try:
        ActivityLog.objects.create(
            project_id=project_id,
            actor=actor,
            verb=verb,
            summary=summary,
            status=status,
            target_type=target_type,
            target_id=target_id,
        )
    except Exception:
        logger.exception("Failed to write activity log (verb=%s, project_id=%s)", verb, project_id)
