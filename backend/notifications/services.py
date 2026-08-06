"""Minimal compatibility shim for `notifications.services`.

Real in-app notification delivery (DB row + SSE push) was left out of this
extracted project along with the rest of the `notifications` app. These
functions are no-ops so that `core` call sites (project invite/removal
flows) keep working without a Notification table. See the README's
"Known simplifications" section.
"""

import logging

logger = logging.getLogger(__name__)


def create_notification(**kwargs) -> None:
    """No-op stand-in for the real notification-creation service."""
    logger.debug("notifications stub: create_notification(%r) skipped", kwargs)


def revoke_access_to_resource(*args, **kwargs) -> None:
    """No-op stand-in for the real access-revocation notification cleanup."""
    logger.debug("notifications stub: revoke_access_to_resource skipped")
