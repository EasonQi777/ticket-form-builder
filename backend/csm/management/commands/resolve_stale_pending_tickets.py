"""
Auto-resolve tickets that have sat in 'pending_customer_response' too long
without the customer replying (TM-020).

There's no Celery/cron in this project (see README "Known simplifications"),
so — like check_sla_breaches — this is meant to be run periodically by an
external scheduler rather than fired automatically on timeout.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand
from django.utils import timezone

from csm.models import Ticket
from csm.services.sla import resume_sla_clock

DEFAULT_TIMEOUT_DAYS = 7


class Command(BaseCommand):
    help = (
        "Auto-resolve tickets that have been in 'pending_customer_response' "
        "for longer than --days without a status change."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--days",
            type=int,
            default=DEFAULT_TIMEOUT_DAYS,
            help=f"Timeout threshold in days (default: {DEFAULT_TIMEOUT_DAYS}).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report which tickets would be resolved without writing changes.",
        )

    def handle(self, *args, **options):
        days: int = options["days"]
        dry_run: bool = options["dry_run"]
        cutoff = timezone.now() - timezone.timedelta(days=days)

        # updated_at is bumped on every save, including the one that moved
        # the ticket into pending_customer_response, so it's a reasonable
        # proxy for "how long has this sat waiting on the customer".
        stale_tickets = Ticket.objects.filter(
            status='pending_customer_response',
            updated_at__lt=cutoff,
        )

        resolved_count = 0
        for ticket in stale_tickets.iterator(chunk_size=200):
            resolved_count += 1
            if dry_run:
                self.stdout.write(f"[dry-run] would resolve ticket #{ticket.id}: {ticket.title}")
                continue

            resume_sla_clock(ticket)
            ticket.status = 'resolved'
            ticket.save(update_fields=['status', 'first_response_due', 'resolution_due', 'sla_paused_at'])

        if dry_run:
            self.stdout.write(
                self.style.WARNING(f"Dry-run: {resolved_count} ticket(s) would be auto-resolved.")
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Auto-resolved {resolved_count} stale pending ticket(s).")
            )
