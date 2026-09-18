from django.urls import path

from .views import (
    PublicProfessionalListView,
    PublicProfessionalProfileView,
    PublicProfileUpdateView,
)

urlpatterns = [
    path("public/professionals", PublicProfessionalListView.as_view()),
    path("public/professionals/<slug:slug>", PublicProfessionalProfileView.as_view()),
    path("professionals/<int:pk>/public-profile", PublicProfileUpdateView.as_view()),
]
