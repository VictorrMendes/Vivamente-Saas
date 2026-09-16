import json
import logging
import sys

from django.test import SimpleTestCase

from core.logging import JsonFormatter, RequestIdFilter
from core.request_id import set_request_id


class RequestIdFilterTests(SimpleTestCase):
    def test_adds_request_id_to_record(self):
        set_request_id("req_test123")
        record = logging.LogRecord(
            "test", logging.INFO, __file__, 1, "hello", None, None
        )

        RequestIdFilter().filter(record)

        self.assertEqual(record.request_id, "req_test123")


class JsonFormatterTests(SimpleTestCase):
    def test_formats_record_as_json_with_expected_fields(self):
        set_request_id("req_test123")
        record = logging.LogRecord(
            "test.logger",
            logging.WARNING,
            __file__,
            1,
            "algo aconteceu",
            None,
            None,
        )
        RequestIdFilter().filter(record)

        output = json.loads(JsonFormatter().format(record))

        self.assertEqual(output["level"], "WARNING")
        self.assertEqual(output["logger"], "test.logger")
        self.assertEqual(output["message"], "algo aconteceu")
        self.assertEqual(output["request_id"], "req_test123")
        self.assertIn("timestamp", output)

    def test_includes_exception_when_present(self):
        try:
            raise ValueError("boom")
        except ValueError:
            record = logging.LogRecord(
                "test.logger",
                logging.ERROR,
                __file__,
                1,
                "falhou",
                None,
                sys.exc_info(),
            )

        output = json.loads(JsonFormatter().format(record))

        self.assertIn("exception", output)
        self.assertIn("ValueError", output["exception"])
