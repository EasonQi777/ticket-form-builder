"""Project <-> calendar sync helpers.

NOTE: the original mediaJira app auto-provisioned a `calendars.Calendar` per
project and kept member access on it in sync. The `calendars` app is out of
scope for this extracted project (see README "Known simplifications"), so
these helpers are no-op stand-ins - callers in `core.views` / `core.utils.
invitations` still call them unconditionally, but there is no calendar to
create, delete, or share.
"""

from __future__ import annotations

from typing import Optional


PROJECT_ROLE_TO_CALENDAR_PERMISSION = {
    "owner": "manage",
    "member": "edit",
    "viewer": "view_all",
    "Organization Admin": "manage",
    "Team Leader": "manage",
    "Super Administrator": "manage",
}


def map_project_role_to_calendar_permission(role: str | None) -> str:
    if not role:
        return "view_all"
    return PROJECT_ROLE_TO_CALENDAR_PERMISSION.get(role, "view_all")


def ensure_project_calendar(project) -> None:
    """No-op: the `calendars` app is not part of this extracted project."""
    return None


def soft_delete_project_calendars(project) -> None:
    """No-op: the `calendars` app is not part of this extracted project."""
    return None


def sync_project_member_calendar_access(
    project, user, role: str | None, include_subscription: bool = True
) -> Optional[object]:
    """No-op: the `calendars` app is not part of this extracted project."""
    return None


def remove_project_member_calendar_access(project, user) -> None:
    """No-op: the `calendars` app is not part of this extracted project."""
    return None
