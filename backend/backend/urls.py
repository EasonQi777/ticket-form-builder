"""
URL configuration for backend project.

This is a trimmed-down URLconf for the extracted ticket-form-builder
project: auth, core (orgs/projects/members), access_control (RBAC), csm
(ticket form builder), experience_group + customer (public portal), and the
new local `dashboard` app. See README.md for the full mapping back to the
original mediaJira app.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import HttpResponse


def health_check(request):
    return HttpResponse("OK", content_type="text/plain")


urlpatterns = [
    path('admin/', admin.site.urls),
    path('health/', health_check, name='health_check'),
    path('api/access_control/', include('access_control.urls')),
    path('api/csm/', include('csm.urls')),
    path('auth/', include('authentication.urls')),
    path('api/core/', include('core.urls')),
    path('api/', include('experience_group.urls')),
    path('api/', include('customer.urls')),
    path('api/dashboard/', include('dashboard.urls')),
    path('api/', include('calendars.urls')),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
