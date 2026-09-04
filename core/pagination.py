from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class OauthPageNumberPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = "per_page"
    max_page_size = 100

    def get_paginated_response(self, data):
        return Response(
            {
                "data": data,
                "pagination": {
                    "page": self.page.number,
                    "per_page": self.get_page_size(self.request),
                    "total": self.page.paginator.count,
                    "total_pages": self.page.paginator.num_pages,
                },
            }
        )

    def get_paginated_response_schema(self, schema):
        return {
            "type": "object",
            "properties": {
                "data": schema,
                "pagination": {
                    "type": "object",
                    "properties": {
                        "page": {"type": "integer"},
                        "per_page": {"type": "integer"},
                        "total": {"type": "integer"},
                        "total_pages": {"type": "integer"},
                    },
                },
            },
        }
