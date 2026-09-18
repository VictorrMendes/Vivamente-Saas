from django.urls import path

from .internal_views import IdentityUserSyncView
from .views import MeView, UserListView

urlpatterns = [
    path("me", MeView.as_view(), name="me"),
    path("users", UserListView.as_view(), name="user-list"),
    path(
        "internal/identity/users/<str:firebase_uid>",
        IdentityUserSyncView.as_view(),
        name="internal-identity-user-sync",
    ),
]
