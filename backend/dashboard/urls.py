from django.urls import path

from .views import DashboardActivityView, DashboardSummaryView

urlpatterns = [
    path('summary/', DashboardSummaryView.as_view(), name='dashboard-summary'),
    path('activity/', DashboardActivityView.as_view(), name='dashboard-activity'),
]
