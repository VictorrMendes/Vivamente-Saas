from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.views import APIView

from apps.accounts.models import User
from apps.professionals.models import Professional
from config.responses import envelope

from .serializers import (
    PublicProfessionalListSerializer,
    PublicProfessionalSerializer,
    PublicProfileUpdateSerializer,
)


class PublicProfessionalProfileView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public-professional-profile"

    @extend_schema(responses=PublicProfessionalSerializer)
    def get(self, request, slug):
        professional = get_object_or_404(Professional, slug=slug, is_public=True, user__active=True)
        return Response(envelope(PublicProfessionalSerializer(professional).data, request))


class PublicProfessionalListView(generics.ListAPIView):
    """Catálogo público /terapeutas — só o que já é seguro expor em /[slug]
    (docs/back.md seção 7), nunca reaproveita o serializer/queryset admin."""

    serializer_class = PublicProfessionalListSerializer
    permission_classes = [AllowAny]
    authentication_classes = []
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "public-professional-catalog"
    filterset_fields = ["specialties"]
    search_fields = ["full_name"]
    ordering_fields = ["full_name"]

    def get_queryset(self):
        return Professional.objects.filter(is_public=True, user__active=True).distinct()


class PublicProfileUpdateView(APIView):
    @extend_schema(request=PublicProfileUpdateSerializer, responses=PublicProfessionalSerializer)
    def patch(self, request, pk):
        professional = get_object_or_404(Professional, pk=pk)
        user = request.user
        if user.role != User.ADMIN and professional.user_id != user.id:
            raise PermissionDenied("Você só pode editar o próprio perfil público.")

        serializer = PublicProfileUpdateSerializer(professional, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(envelope(PublicProfessionalSerializer(professional).data, request))
