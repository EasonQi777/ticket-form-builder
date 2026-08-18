"""Tests for P0-2 (pending_customer_response + SLA pause) and the SLA breach
notification service (P0-3 half). See TICKET_FORM_BUILDER_ANALYSIS.md."""

import pytest
from datetime import timedelta
from django.utils import timezone

from csm.models import Queue, Ticket, SLAPolicy, SLAPriorityTarget, CsmNotification
from csm.services.sla import (
    recalculate_ticket_sla,
    pause_sla_clock,
    resume_sla_clock,
    get_sla_status,
    notify_sla_breach_if_needed,
)

pytestmark = pytest.mark.django_db


@pytest.fixture
def queue(project, customer_organisation):
    return Queue.objects.create(
        project=project,
        organisation=customer_organisation,
        name='Support Queue',
        tier='T1',
    )


@pytest.fixture
def sla_policy(project):
    policy = SLAPolicy.objects.create(project=project, name='Default SLA')
    SLAPriorityTarget.objects.create(
        policy=policy, priority='medium',
        first_response_minutes=480, resolution_minutes=1440,
    )
    return policy


@pytest.fixture
def ticket(queue, sla_policy):
    t = Ticket.objects.create(queue=queue, title='Test Ticket', priority='medium')
    recalculate_ticket_sla(t)
    t.save(update_fields=['first_response_due', 'resolution_due'])
    return t


class TestTicketStatusChoices:
    def test_pending_customer_response_is_a_valid_status(self):
        keys = [k for k, _ in Ticket.STATUS_CHOICES]
        assert 'pending_customer_response' in keys

    def test_pending_customer_response_is_sla_pausing(self):
        assert 'pending_customer_response' in Ticket.SLA_PAUSING_STATUSES


class TestPauseResumeSlaClock:
    def test_pause_sets_paused_at(self, ticket):
        assert ticket.sla_paused_at is None
        pause_sla_clock(ticket)
        assert ticket.sla_paused_at is not None

    def test_pause_is_noop_when_already_paused(self, ticket):
        pause_sla_clock(ticket)
        first_pause = ticket.sla_paused_at
        pause_sla_clock(ticket)
        assert ticket.sla_paused_at == first_pause

    def test_pause_noop_without_due_dates(self, queue):
        bare = Ticket.objects.create(queue=queue, title='No SLA policy')
        pause_sla_clock(bare)
        assert bare.sla_paused_at is None

    def test_resume_clears_paused_at(self, ticket):
        pause_sla_clock(ticket)
        resume_sla_clock(ticket)
        assert ticket.sla_paused_at is None

    def test_resume_shifts_due_dates_forward_by_pause_duration(self, ticket):
        original_fr = ticket.first_response_due
        original_res = ticket.resolution_due

        # Simulate having been paused for exactly 2 hours.
        ticket.sla_paused_at = timezone.now() - timedelta(hours=2)
        resume_sla_clock(ticket)

        assert ticket.first_response_due > original_fr
        assert ticket.resolution_due > original_res
        shift = ticket.first_response_due - original_fr
        assert timedelta(hours=1, minutes=59) < shift < timedelta(hours=2, minutes=1)

    def test_resume_is_noop_when_not_paused(self, ticket):
        original_fr = ticket.first_response_due
        resume_sla_clock(ticket)
        assert ticket.first_response_due == original_fr


class TestGetSlaStatusPaused:
    def test_status_reports_is_paused(self, ticket):
        status = get_sla_status(ticket)
        assert status['is_paused'] is False
        assert status['paused_at'] is None

        pause_sla_clock(ticket)
        status = get_sla_status(ticket)
        assert status['is_paused'] is True
        assert status['paused_at'] is not None

    def test_paused_ticket_not_freshly_breached_by_wall_clock(self, queue, sla_policy):
        """A ticket paused before its due date shouldn't read as breached just
        because wall-clock time has since passed the (frozen) due date."""
        t = Ticket.objects.create(queue=queue, title='Paused ticket', priority='medium')
        recalculate_ticket_sla(t)
        # Pause happened before the due date, and "now" is long after it.
        t.sla_paused_at = t.resolution_due - timedelta(minutes=1)
        status = get_sla_status(t)
        assert status['resolution_breached'] is False


class TestNotifySlaBreachIfNeeded:
    def test_no_notification_when_not_breached(self, ticket, user):
        ticket.assigned_to = user
        ticket.save(update_fields=['assigned_to'])
        created = notify_sla_breach_if_needed(ticket)
        assert created == []
        assert CsmNotification.objects.filter(notification_type='sla_breach').count() == 0

    def test_creates_notification_when_breached(self, ticket, user):
        past = timezone.now() - timedelta(hours=1)
        ticket.assigned_to = user
        ticket.first_response_due = past
        ticket.resolution_due = past
        ticket.save(update_fields=['assigned_to', 'first_response_due', 'resolution_due'])

        created = notify_sla_breach_if_needed(ticket)

        assert len(created) == 2
        kinds = {n.metadata['kind'] for n in created}
        assert kinds == {'first_response', 'resolution'}
        for n in created:
            assert n.recipient_id == user.id
            assert n.notification_type == 'sla_breach'
            assert n.metadata['ticket_id'] == ticket.id

    def test_is_idempotent(self, ticket, user):
        past = timezone.now() - timedelta(hours=1)
        ticket.assigned_to = user
        ticket.first_response_due = past
        ticket.resolution_due = past
        ticket.save(update_fields=['assigned_to', 'first_response_due', 'resolution_due'])

        notify_sla_breach_if_needed(ticket)
        second_run = notify_sla_breach_if_needed(ticket)

        assert second_run == []
        assert CsmNotification.objects.filter(notification_type='sla_breach').count() == 2

    def test_no_notification_without_assignee(self, ticket):
        past = timezone.now() - timedelta(hours=1)
        ticket.first_response_due = past
        ticket.resolution_due = past
        ticket.save(update_fields=['first_response_due', 'resolution_due'])

        created = notify_sla_breach_if_needed(ticket)
        assert created == []

    def test_no_notification_for_closed_ticket(self, ticket, user):
        past = timezone.now() - timedelta(hours=1)
        ticket.assigned_to = user
        ticket.status = 'closed'
        ticket.first_response_due = past
        ticket.resolution_due = past
        ticket.save(update_fields=['assigned_to', 'status', 'first_response_due', 'resolution_due'])

        created = notify_sla_breach_if_needed(ticket)
        assert created == []

    def test_no_notification_while_paused(self, ticket, user):
        past = timezone.now() - timedelta(hours=1)
        ticket.assigned_to = user
        ticket.first_response_due = past
        ticket.resolution_due = past
        ticket.sla_paused_at = timezone.now()
        ticket.save(update_fields=['assigned_to', 'first_response_due', 'resolution_due', 'sla_paused_at'])

        created = notify_sla_breach_if_needed(ticket)
        assert created == []
