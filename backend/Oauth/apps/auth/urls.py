from django.urls import path

from apps.auth.views import (
    EmailResendView,
    EmailVerifyView,
    LoginView,
    LogoutView,
    MeView,
    PasswordForgotView,
    PasswordResetView,
    RefreshView,
    RegisterView,
    RoleListView,
    TokenRevokeView,
    UserDetailView,
    UserListView,
    UserRoleUpdateView,
)

urlpatterns = [
    path("register", RegisterView.as_view(), name="register"),
    path("login", LoginView.as_view(), name="login"),
    path("logout", LogoutView.as_view(), name="logout"),
    path("refresh", RefreshView.as_view(), name="refresh"),
    path("me", MeView.as_view(), name="me"),
    path("email/verify", EmailVerifyView.as_view(), name="email-verify"),
    path("email/resend", EmailResendView.as_view(), name="email-resend"),
    path("password/forgot", PasswordForgotView.as_view(), name="password-forgot"),
    path("password/reset", PasswordResetView.as_view(), name="password-reset"),
    path("users", UserListView.as_view(), name="users"),
    path("users/<str:user_id>", UserDetailView.as_view(), name="user-detail"),
    path("roles", RoleListView.as_view(), name="roles"),
    path(
        "users/<str:user_id>/role",
        UserRoleUpdateView.as_view(),
        name="user-role",
    ),
    path("tokens/revoke", TokenRevokeView.as_view(), name="tokens-revoke"),
]
