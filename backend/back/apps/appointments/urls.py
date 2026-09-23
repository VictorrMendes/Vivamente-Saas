from django.urls import path
from rest_framework.routers import DefaultRouter

from .views import AppointmentViewSet, AvailabilitySlotViewSet, PublicAvailableSlotsView, PublicConfirmationView

router = DefaultRouter(trailing_slash=False)
router.register("availability", AvailabilitySlotViewSet, basename="availability")
router.register("appointments", AppointmentViewSet, basename="appointment")

urlpatterns = router.urls + [
    path("public/appointment-confirmations/preview", PublicConfirmationView.as_view(preview=True)),
    path("public/appointment-confirmations/respond", PublicConfirmationView.as_view()),
    path("public/professionals/<slug:slug>/available-slots", PublicAvailableSlotsView.as_view()),
]
