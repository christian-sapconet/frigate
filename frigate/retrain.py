import datetime
import json
import logging
import string
import random
import requests
import os
import re
from typing import Any, Dict, List
import requests
from frigate.const import RETRAIN_HOST
from requests.models import Response
import cv2
from numpy import ndarray

logger = logging.getLogger(__name__)


def generate_random_string(length: int) -> str:
    letters_and_digits = string.ascii_letters + string.digits
    result_str = "".join(random.choice(letters_and_digits) for _ in range(length))
    return result_str


class RetrainApi:
    def __init__(self) -> None:
        if RETRAIN_HOST in os.environ:
            self.host = os.environ.get(RETRAIN_HOST)
        # check for the addon options file
        elif os.path.isfile("/data/options.json"):
            with open("/data/options.json") as f:
                raw_options = f.read()
            options = json.loads(raw_options)
            self.host = options.get("retrain_host")

        self._is_active: bool = self.host is not None

    def is_active(self) -> bool:
        return self._is_active

    def accept_event(self, event_id: str) -> str:
        logger.info("Accept event id: %s", event_id)

        try:
            body = json.dumps({"event_id": event_id})

            headers = {
                "Content-Type": "application/json",
            }

            response = requests.post(
                f"{self.host}/api/accept", headers=headers, data=body
            )

            if response and response.ok:
                logger.info("Accept event handled successfully")
                # TODO retrain backend needs to return UUID or eveentID
                random_string = generate_random_string(22)
                return str(random_string)

            elif response:
                error_response = response.json()
                logger.error("Error: %s", error_response["message"])
                return str(error_response)
            else:
                logger.error("Error: No response received")
                return "no response"
        except Exception as error:
            # logger.error("Error: %s", error)
            return str("Error: ")
