from datetime import timedelta

import pytest
from django.utils import timezone

from activity.models import ActivityLog

pytestmark = pytest.mark.django_db


class TestActivityLog:
    def test_create_defaults_to_info_status(self, project):
        log = ActivityLog.objects.create(
            project=project,
            verb='project.updated',
            summary='Project settings changed',
        )
        assert log.status == ActivityLog.Status.INFO

    def test_actor_is_optional(self, project):
        log = ActivityLog.objects.create(
            project=project,
            verb='ticket.submitted',
            summary='Support ticket submitted',
            status=ActivityLog.Status.PENDING,
        )
        assert log.actor is None

    def test_actor_set_null_on_user_delete(self, project, user):
        from django.contrib.auth import get_user_model
        User = get_user_model()

        log = ActivityLog.objects.create(
            project=project,
            actor=user,
            verb='ticket_form.created',
            summary='New ticket form created',
            status=ActivityLog.Status.SUCCESS,
        )
        User.objects.filter(pk=user.pk).delete()
        log.refresh_from_db()
        assert log.actor_id is None

    def test_ordering_is_newest_first(self, project):
        first = ActivityLog.objects.create(project=project, verb='a', summary='First')
        second = ActivityLog.objects.create(project=project, verb='b', summary='Second')
        # auto_now_add has enough resolution to tie on a fast test run --
        # force a real gap so ordering isn't asserting on a coin flip.
        ActivityLog.objects.filter(pk=first.pk).update(created_at=timezone.now() - timedelta(hours=1))

        rows = list(ActivityLog.objects.filter(project=project))

        assert rows[0].pk == second.pk
        assert rows[1].pk == first.pk

    def test_deleting_project_cascades(self, project):
        ActivityLog.objects.create(project=project, verb='a', summary='First')
        project_id = project.id
        project.delete()
        assert not ActivityLog.objects.filter(project_id=project_id).exists()

    def test_str_includes_status_and_summary(self, project):
        log = ActivityLog.objects.create(
            project=project, verb='a', summary='New ticket form created',
            status=ActivityLog.Status.SUCCESS,
        )
        assert str(log) == '[success] New ticket form created'
