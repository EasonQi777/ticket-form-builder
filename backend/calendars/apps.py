from django.apps import AppConfig


class CalendarConfig(AppConfig):
    """
    Calendar application configuration.

    Provides Google Calendar-like functionality including:
    - Multi-calendar support per user
    - Calendar sharing with granular permissions
    - Events with rich metadata
    - Recurring events (RFC 5545 RRULE)
    - Attendee management and RSVP
    - Multi-channel reminders
    - Event categorization
    - User preferences

    Ported from mediaJira's `calendars` app. The system-derived `CalendarEvent`
    projection (auto-generated from Decision/Task) and its post_save signals
    were intentionally left out here: the `decision` and `task` apps are out
    of scope for this extracted project (see README "Known simplifications"),
    so there is nothing to project calendar events from.
    """

    default_auto_field = 'django.db.models.BigAutoField'
    name = 'calendars'
    verbose_name = 'Calendar Management'
