from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import InstitutionalRequestPublicCreateView, InstitutionalRequestViewSet

router = DefaultRouter(trailing_slash=False)
router.register("institutional-requests", InstitutionalRequestViewSet, basename="institutional-request")

urlpatterns = router.urls + [
    path("public/institutional-requests", InstitutionalRequestPublicCreateView.as_view()),
]
