from django.test import SimpleTestCase

from core.pagination import OauthPageNumberPagination


class OauthPageNumberPaginationTests(SimpleTestCase):
    def test_defaults(self):
        paginator = OauthPageNumberPagination()

        self.assertEqual(paginator.page_size, 20)
        self.assertEqual(paginator.page_size_query_param, "per_page")
        self.assertEqual(paginator.max_page_size, 100)
