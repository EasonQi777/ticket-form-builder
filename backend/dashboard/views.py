from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from activity.models import ActivityLog
from core.models import ProjectMember
from csm.models import Ticket, TicketForm
from experience_group.models import ExperienceGroup


class DashboardSummaryView(APIView):
    """
    GET /api/dashboard/summary/

    Small at-a-glance summary for the user dashboard: how many ticket forms,
    tickets, and experience groups exist across the projects the requesting
    user is an active member of.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        project_ids = list(
            ProjectMember.objects.filter(
                user=user,
                is_active=True,
                project__is_deleted=False,
            ).values_list('project_id', flat=True)
        )

        ticket_form_count = TicketForm.objects.filter(project_id__in=project_ids).count()
        experience_group_count = ExperienceGroup.objects.filter(project_id__in=project_ids).count()
        ticket_count = Ticket.objects.filter(
            Q(form__project_id__in=project_ids) | Q(experience_group__project_id__in=project_ids)
        ).distinct().count()

        return Response({
            'ticket_form_count': ticket_form_count,
            'ticket_count': ticket_count,
            'experience_group_count': experience_group_count,
            'project_count': len(project_ids),
        })


class DashboardActivityView(APIView):
    """
    GET /api/dashboard/activity/?limit=4

    Recent activity across the projects the requesting user is an active
    member of, newest first. Powers the dashboard's "Recent Activity" panel.

    See RECENT_ACTIVITY_FEATURE_DESIGN.md §6 for the response contract.
    """
    permission_classes = [IsAuthenticated]

    DEFAULT_LIMIT = 4
    MAX_LIMIT = 50

    def get(self, request):
        user = request.user
        project_ids = ProjectMember.objects.filter(
            user=user,
            is_active=True,
            project__is_deleted=False,
        ).values_list('project_id', flat=True)

        try:
            limit = int(request.query_params.get('limit', self.DEFAULT_LIMIT))
        except (TypeError, ValueError):
            limit = self.DEFAULT_LIMIT
        limit = max(1, min(limit, self.MAX_LIMIT))

        logs = (
            ActivityLog.objects.filter(project_id__in=project_ids)
            .select_related('actor')
            .order_by('-created_at')[:limit]
        )

        return Response([
            {
                'id': log.id,
                'summary': log.summary,
                'actor_name': _actor_display_name(log.actor),
                'status': log.status,
                'created_at': log.created_at,
            }
            for log in logs
        ])


def _actor_display_name(actor):
    """first_name -> username -> email fallback, same chain the dashboard's
    welcome heading already uses on the frontend."""
    if actor is None:
        return None
    return actor.first_name or actor.username or actor.email
