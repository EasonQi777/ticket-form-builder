"""
Poll open tickets for SLA breaches and create in-app notifications (TM-015).

There's no Celery/cron in this project (see README "Known simplifications"),
so this is meant to be invoked periodically by an external scheduler (cron,
Windows Task Scheduler, a CI job, etc.) rather than fired automatically on
breach. Safe to run repeatedly — notify_sla_breach_if_needed() dedupes so
each ticket only gets one notification per breach kind.
"""

from __future__ import annotations

from django.core.management.base import BaseCommand

from csm.models import Ticket
from csm.services.sla import notify_sla_breach_if_needed


class Command(BaseCommand):
    help = (
        "Scan open tickets for breached first-response/resolution SLA "
        "targets and create CsmNotification rows for their assignee."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report how many notifications would be created without writing them.",
        )

    def handle(self, *args, **options):
        dry_run: bool = options["dry_run"]

        tickets = (
            Ticket.objects.exclude(status__in=("resolved", "closed"))
            .filter(assigned_to__isnull=False)
            .filter(sla_paused_at__isnull=True)
            .select_related("assigned_to")
        )

        scanned = 0
        created_total = 0

        for ticket in tickets.iterator(chunk_size=200):
            scanned += 1
            if dry_run:
                from csm.services.sla import get_sla_status

                status = get_sla_status(ticket)
                if status["first_response_breached"] or status["resolution_breached"]:
                    created_total += 1
                continue

            created = notify_sla_breach_if_needed(ticket)
            created_total += len(created)

        self.stdout.write(f"Tickets scanned: {scanned}")
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"Dry-run: {created_total} ticket(s) currently breaching SLA."
                )
            )
        else:
            self.stdout.write(
                self.style.SUCCESS(f"Notifications created: {created_total}")
            )
