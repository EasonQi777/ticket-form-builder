"""Minimal compatibility shim for `notifications.action_urls`.

The full mediaJira `notifications` app (in-app notification feed, SSE, email
digesting, etc.) was intentionally left out of this extracted project. A few
`core` code paths (project invite / removal flows) still reference a small
handful of symbols from that app, so this package provides just enough of an
API surface for those call sites to import and run without error. Nothing
here persists to the database or sends anything anywhere - see the README's
"Known simplifications" section.
"""

def overview_action_url() -> str:
    """Frontend route a notification would deep-link to. Points at the
    dashboard here since the `/overview` route isn't part of this project."""
    return "/dashboard"
