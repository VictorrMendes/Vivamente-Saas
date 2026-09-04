from django.test import SimpleTestCase

from core.pagination import OauthPageNumberPagination


class OauthPageNumberPaginationTests(SimpleTestCase):
    def test_defaults(self):
        paginator = OauthPageNumberPagination()

        self.assertEqual(paginator.page_size, 20)
        self.assertEqual(paginator.page_size_query_param, "per_page")
        self.assertEqual(paginator.max_page_size, 100)

    def test_paginated_response_schema_matches_actual_envelope(self):
        paginator = OauthPageNumberPagination()
        item_schema = {"type": "object"}

        schema = paginator.get_paginated_response_schema(item_schema)

        self.assertEqual(schema["properties"]["data"], item_schema)
        pagination_props = schema["properties"]["pagination"]["properties"]
        self.assertEqual(
            set(pagination_props.keys()),
            {"page", "per_page", "total", "total_pages"},
        )
