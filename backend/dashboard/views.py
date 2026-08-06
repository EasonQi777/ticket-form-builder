from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

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
