from django.contrib import admin

from .models import ActivityLog


@admin.register(ActivityLog)
class ActivityLogAdmin(admin.ModelAdmin):
    list_display = ('summary', 'project', 'actor', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('summary', 'verb')
    readonly_fields = ('created_at', 'updated_at')
    ordering = ('-created_at',)
