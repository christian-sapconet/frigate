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


def generate_random_string(length):
    letters_and_digits = string.ascii_letters + string.digits
    result_str = ''.join(random.choice(letters_and_digits) for _ in range(length))
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
        logger.info('Accept event id: %s', event_id)

        try:
            body = json.dumps({
                "event_id": event_id
            })

            headers = {
                'Content-Type': 'application/json',
            }

            response = requests.post(f'{self.host}/api/accept', headers=headers, data=body)

            if response and response.ok:
                logger.info('Accept event handled successfully')
                # TODO retrain backend needs to return UUID or eveentID
                random_string = generate_random_string(22)
                return str(random_string)

            elif response:
                error_response = response.json()
                logger.error('Error: %s', error_response['message'])
            else:
                logger.error('Error: No response received')
        except Exception as error:
            logger.error('Error: %s', error)
            return 'Error: %s', error



    def upload_imagez(self, image: ndarray, camera: str) -> str:
        # r = self._get("image/signed_urls")
        # presigned_urls = r.json()
        # if not r.ok:
        #     raise Exception("Unable to get signed urls")

        # # resize and submit original
        # files = {"file": get_jpg_bytes(image, 1920, 85)}
        # data = presigned_urls["original"]["fields"]
        # data["content-type"] = "image/jpeg"
        # r = requests.post(presigned_urls["original"]["url"], files=files, data=data)
        # if not r.ok:
        #     logger.error(f"Failed to upload original: {r.status_code} {r.text}")
        #     raise Exception(r.text)

        # # resize and submit annotate
        # files = {"file": get_jpg_bytes(image, 640, 70)}
        # data = presigned_urls["annotate"]["fields"]
        # data["content-type"] = "image/jpeg"
        # r = requests.post(presigned_urls["annotate"]["url"], files=files, data=data)
        # if not r.ok:
        #     logger.error(f"Failed to upload annotate: {r.status_code} {r.text}")
        #     raise Exception(r.text)

        # # resize and submit thumbnail
        # files = {"file": get_jpg_bytes(image, 200, 70)}
        # data = presigned_urls["thumbnail"]["fields"]
        # data["content-type"] = "image/jpeg"
        # r = requests.post(presigned_urls["thumbnail"]["url"], files=files, data=data)
        # if not r.ok:
        #     logger.error(f"Failed to upload thumbnail: {r.status_code} {r.text}")
        #     raise Exception(r.text)

        # # create image
        # r = self._post(
        #     "image/create", {"id": presigned_urls["imageId"], "camera": camera}
        # )
        # if not r.ok:
        #     raise Exception(r.text)
        # Test the function

        # print(random_string)
        # return image id
        # return str(presigned_urls.get("imageId"))
        return None

    # def add_false_positive(
    #     self,
    #     plus_id: str,
    #     region: List[float],
    #     bbox: List[float],
    #     score: float,
    #     label: str,
    #     model_hash: str,
    #     model_type: str,
    #     detector_type: str,
    # ) -> None:
    #     r = self._put(
    #         f"image/{plus_id}/false_positive",
    #         {
    #             "label": label,
    #             "x": bbox[0],
    #             "y": bbox[1],
    #             "w": bbox[2],
    #             "h": bbox[3],
    #             "regionX": region[0],
    #             "regionY": region[1],
    #             "regionW": region[2],
    #             "regionH": region[3],
    #             "score": score,
    #             "model_hash": model_hash,
    #             "model_type": model_type,
    #             "detector_type": detector_type,
    #         },
    #     )

    #     if not r.ok:
    #         raise Exception(r.text)

    # def add_annotation(
    #     self,
    #     plus_id: str,
    #     bbox: List[float],
    #     label: str,
    #     difficult: bool = False,
    # ) -> None:
    #     r = self._put(
    #         f"image/{plus_id}/annotation",
    #         {
    #             "label": label,
    #             "x": bbox[0],
    #             "y": bbox[1],
    #             "w": bbox[2],
    #             "h": bbox[3],
    #             "difficult": difficult,
    #         },
    #     )

    #     if not r.ok:
    #         raise Exception(r.text)

    # def get_model_download_url(
    #     self,
    #     model_id: str,
    # ) -> str:
    #     r = self._get(f"model/{model_id}/signed_url")

    #     if not r.ok:
    #         raise Exception(r.text)

    #     presigned_url = r.json()

    #     return str(presigned_url.get("url"))

    # def get_model_info(self, model_id: str) -> Any:
    #     r = self._get(f"model/{model_id}")

    #     if not r.ok:
    #         raise Exception(r.text)

    #     return r.json()
