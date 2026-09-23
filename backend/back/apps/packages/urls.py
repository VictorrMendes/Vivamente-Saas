from rest_framework.routers import DefaultRouter

from .views import PackagePlanViewSet, PackageViewSet

router = DefaultRouter(trailing_slash=False)
router.register("packages", PackageViewSet, basename="package")
router.register("package-plans", PackagePlanViewSet, basename="package-plan")

urlpatterns = router.urls
