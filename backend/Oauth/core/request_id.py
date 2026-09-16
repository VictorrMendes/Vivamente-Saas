import contextvars
import uuid

_current_request_id = contextvars.ContextVar("request_id", default=None)


def new_request_id():
    return f"req_{uuid.uuid4().hex[:12]}"


def set_request_id(value):
    _current_request_id.set(value)


def get_request_id():
    return _current_request_id.get() or new_request_id()
