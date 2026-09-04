from django.urls import path

from apps.sessions.views import (
    SecuritySessionListView,
    SessionDetailView,
    SessionListView,
)

urlpatterns = [
    path("sessions", SessionListView.as_view(), name="sessions"),
    path(
        "sessions/<int:session_id>",
        SessionDetailView.as_view(),
        name="session-detail",
    ),
    path(
        "security/sessions",
        SecuritySessionListView.as_view(),
        name="security-sessions",
    ),
]
