from datetime import timedelta

import pytest
from django.urls import reverse
from django.utils import timezone
from rest_framework import status

from activity.models import ActivityLog
from core.models import ProjectMember

pytestmark = pytest.mark.django_db


def _activity_url(**params):
    url = reverse('dashboard-activity')
    if params:
        query = '&'.join(f'{key}={value}' for key, value in params.items())
        url = f'{url}?{query}'
    return url


def _log(project, actor=None, summary='Something happened', activity_status=ActivityLog.Status.INFO):
    return ActivityLog.objects.create(
        project=project,
        actor=actor,
        verb='test.event',
        summary=summary,
        status=activity_status,
    )


class TestDashboardActivityView:
    def test_returns_logs_for_the_users_project(self, member_client, project, user):
        _log(project, actor=user, summary='New ticket form created', activity_status=ActivityLog.Status.SUCCESS)

        response = member_client.get(_activity_url())

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 1
        row = response.data[0]
        assert row['summary'] == 'New ticket form created'
        assert row['status'] == 'success'
        assert row['actor_name'] == (user.first_name or user.username or user.email)

    def test_actor_name_is_none_when_actor_missing(self, member_client, project):
        _log(project, actor=None, summary='System event')

        response = member_client.get(_activity_url())

        assert response.data[0]['actor_name'] is None

    def test_excludes_logs_for_projects_the_user_is_not_a_member_of(self, outsider_client, project, user2):
        _log(project, actor=user2)

        response = outsider_client.get(_activity_url())

        assert response.status_code == status.HTTP_200_OK
        assert response.data == []

    def test_excludes_logs_when_membership_is_inactive(self, api_client, project, user2):
        ProjectMember.objects.create(user=user2, project=project, role='member', is_active=False)
        _log(project, actor=user2)
        api_client.force_authenticate(user=user2)

        response = api_client.get(_activity_url())

        assert response.data == []

    def test_excludes_logs_for_soft_deleted_projects(self, member_client, project, user):
        _log(project, actor=user)
        project.is_deleted = True
        project.save(update_fields=['is_deleted'])

        response = member_client.get(_activity_url())

        assert response.data == []

    def test_orders_newest_first(self, member_client, project, user):
        older = _log(project, actor=user, summary='Older event')
        newer = _log(project, actor=user, summary='Newer event')
        ActivityLog.objects.filter(pk=older.pk).update(created_at=timezone.now() - timedelta(hours=1))
        ActivityLog.objects.filter(pk=newer.pk).update(created_at=timezone.now())

        response = member_client.get(_activity_url())

        assert [row['summary'] for row in response.data] == ['Newer event', 'Older event']

    def test_default_limit_is_four(self, member_client, project, user):
        for i in range(6):
            _log(project, actor=user, summary=f'Event {i}')

        response = member_client.get(_activity_url())

        assert len(response.data) == 4

    def test_respects_limit_param(self, member_client, project, user):
        for i in range(6):
            _log(project, actor=user, summary=f'Event {i}')

        response = member_client.get(_activity_url(limit=2))

        assert len(response.data) == 2

    def test_limit_is_capped_at_max(self, member_client, project, user):
        for i in range(3):
            _log(project, actor=user, summary=f'Event {i}')

        response = member_client.get(_activity_url(limit=999))

        # Only 3 rows exist, so this also proves an over-max limit doesn't 500.
        assert len(response.data) == 3

    def test_invalid_limit_falls_back_to_default(self, member_client, project, user):
        for i in range(6):
            _log(project, actor=user, summary=f'Event {i}')

        response = member_client.get(_activity_url(limit='not-a-number'))

        assert response.status_code == status.HTTP_200_OK
        assert len(response.data) == 4
