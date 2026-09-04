from core.request_id import new_request_id, set_request_id


class RequestIdMiddleware:
    header_name = "X-Request-Id"

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request_id = new_request_id()
        set_request_id(request_id)
        request.request_id = request_id

        response = self.get_response(request)
        response[self.header_name] = request_id

        return response
