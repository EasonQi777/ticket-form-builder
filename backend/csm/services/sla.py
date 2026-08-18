"""SLA calculation service for CSM tickets."""

from datetime import timedelta
from django.utils import timezone


def _derive_sla_anchor(ticket, old_first_response_minutes):
    """Infer the SLA start time from an existing deadline and the old target."""
    if ticket.first_response_due is not None and old_first_response_minutes is not None:
        return ticket.first_response_due - timedelta(minutes=old_first_response_minutes)
    return None


def recalculate_ticket_sla(ticket, base_time=None):
    """
    Compute and persist first_response_due / resolution_due on a ticket.

    base_time: the reference point for deadline calculation.
      - None (default): uses ticket.created_at — for initial ticket creation.
      - timezone.now(): pass explicitly on priority change so the countdown
        restarts from the moment of the change, not the original creation time.
      - For policy updates, use recalculate_ticket_sla_after_policy_change() so
        each ticket keeps its existing SLA anchor.
    """
    from csm.models import SLAPolicy, SLAPriorityTarget

    project_id = _get_project_id(ticket)
    if not project_id:
        ticket.first_response_due = None
        ticket.resolution_due = None
        return

    try:
        policy = SLAPolicy.objects.get(project_id=project_id, is_active=True)
    except SLAPolicy.DoesNotExist:
        ticket.first_response_due = None
        ticket.resolution_due = None
        return

    try:
        target = SLAPriorityTarget.objects.get(
            policy=policy,
            priority=ticket.priority,
        )
    except SLAPriorityTarget.DoesNotExist:
        ticket.first_response_due = None
        ticket.resolution_due = None
        return

    if base_time is None:
        base_time = ticket.created_at or timezone.now()
    ticket.first_response_due = base_time + timedelta(minutes=target.first_response_minutes)
    ticket.resolution_due = base_time + timedelta(minutes=target.resolution_minutes)


def recalculate_ticket_sla_after_policy_change(
    ticket, old_targets_by_priority, *, policy_reactivated=False,
):
    """
    Recompute SLA dues after a policy update while preserving each ticket's anchor.

    old_targets_by_priority: dict mapping priority -> (first_response_minutes,
      resolution_minutes), snapshotted before targets are replaced.
    policy_reactivated: True when is_active flips from False to True. Tickets whose
      dues were cleared on deactivation restart from now(), not created_at.
    """
    old_fr_minutes = None
    old_entry = old_targets_by_priority.get(ticket.priority)
    if old_entry is not None:
        old_fr_minutes = old_entry[0]

    base_time = _derive_sla_anchor(ticket, old_fr_minutes)
    if base_time is None:
        if policy_reactivated:
            base_time = timezone.now()
        else:
            base_time = ticket.created_at or timezone.now()
    recalculate_ticket_sla(ticket, base_time=base_time)


def _get_project_id(ticket):
    """Resolve project_id from ticket → queue → project chain."""
    try:
        return ticket.queue.project_id
    except Exception:
        return None


def pause_sla_clock(ticket):
    """
    Freeze the SLA countdown for a ticket (TM-016), e.g. when it moves into
    'pending_customer_response'. Records the moment the pause started;
    resume_sla_clock() later shifts the due dates forward by however long
    the pause lasted.

    No-op if the ticket has no due dates to pause, or is already paused.
    """
    if ticket.sla_paused_at is not None:
        return
    if ticket.first_response_due is None and ticket.resolution_due is None:
        return
    ticket.sla_paused_at = timezone.now()


def resume_sla_clock(ticket):
    """
    Unfreeze a paused SLA countdown by shifting first_response_due /
    resolution_due forward by the elapsed pause duration, then clearing
    sla_paused_at. No-op if the ticket isn't currently paused.
    """
    if ticket.sla_paused_at is None:
        return
    elapsed = timezone.now() - ticket.sla_paused_at
    if ticket.first_response_due is not None:
        ticket.first_response_due = ticket.first_response_due + elapsed
    if ticket.resolution_due is not None:
        ticket.resolution_due = ticket.resolution_due + elapsed
    ticket.sla_paused_at = None


def get_sla_status(ticket):
    """
    Return a dict describing the current SLA status for a ticket.

    Keys:
      first_response_due  – ISO datetime string or None
      resolution_due      – ISO datetime string or None
      first_response_breached – bool
      resolution_breached     – bool
      first_response_remaining_seconds – int or None
      resolution_remaining_seconds     – int or None
      is_paused            – bool, True while the ticket sits in an
                              SLA-pausing status (e.g. pending_customer_response)
      paused_at             – ISO datetime string or None

    While paused, "now" is pinned to the moment the pause started so the
    countdown/breach state reads as frozen rather than continuing to run out
    against wall-clock time.
    """
    is_paused = ticket.sla_paused_at is not None
    now = ticket.sla_paused_at if is_paused else timezone.now()

    def _remaining(due):
        if due is None:
            return None
        return int((due - now).total_seconds())

    return {
        'first_response_due': ticket.first_response_due.isoformat() if ticket.first_response_due else None,
        'resolution_due': ticket.resolution_due.isoformat() if ticket.resolution_due else None,
        'first_response_breached': bool(
            ticket.first_response_due and now > ticket.first_response_due
        ),
        'resolution_breached': bool(
            ticket.resolution_due and now > ticket.resolution_due
        ),
        'first_response_remaining_seconds': _remaining(ticket.first_response_due),
        'resolution_remaining_seconds': _remaining(ticket.resolution_due),
        'is_paused': is_paused,
        'paused_at': ticket.sla_paused_at.isoformat() if ticket.sla_paused_at else None,
    }


def notify_sla_breach_if_needed(ticket):
    """
    Create an in-app CsmNotification (TM-015) the first time a ticket is
    found breaching its first-response or resolution SLA target.

    Idempotent: dedupes on (recipient, notification_type='sla_breach',
    metadata.ticket_id, metadata.kind) so re-running this against the same
    ticket doesn't spam duplicate notifications. Intended to be called from
    the `check_sla_breaches` management command (there's no Celery/cron in
    this project — see README "Known simplifications" — so breach detection
    is a poll rather than push).

    No-op for paused tickets (nothing is actively breaching while frozen),
    tickets with no assignee to notify, or tickets in a terminal status.
    """
    from csm.models import CsmNotification

    if ticket.status in ('resolved', 'closed'):
        return []
    if not ticket.assigned_to_id:
        return []

    status = get_sla_status(ticket)
    if status['is_paused']:
        return []

    created = []
    for kind, breached_key in (
        ('first_response', 'first_response_breached'),
        ('resolution', 'resolution_breached'),
    ):
        if not status[breached_key]:
            continue

        already_notified = CsmNotification.objects.filter(
            recipient=ticket.assigned_to,
            notification_type='sla_breach',
            metadata__ticket_id=ticket.id,
            metadata__kind=kind,
        ).exists()
        if already_notified:
            continue

        label = 'First response' if kind == 'first_response' else 'Resolution'
        notification = CsmNotification.objects.create(
            recipient=ticket.assigned_to,
            notification_type='sla_breach',
            title=f'SLA breached: {ticket.title}',
            message=f'{label} SLA for ticket "{ticket.title}" has been breached.',
            metadata={'ticket_id': ticket.id, 'kind': kind},
        )
        created.append(notification)

    return created
