from numpy import unique
from peewee import (
    Model,
    CharField,
    DateTimeField,
    FloatField,
    BooleanField,
    TextField,
    IntegerField,
)
from playhouse.sqlite_ext import JSONField


class Event(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    label = CharField(index=True, max_length=20)
    sub_label = CharField(max_length=100, null=True)
    camera = CharField(index=True, max_length=20)
    start_time = DateTimeField()
    end_time = DateTimeField()
    top_score = (
        FloatField()
    )  # TODO remove when columns can be dropped without rebuilding table
    score = (
        FloatField()
    )  # TODO remove when columns can be dropped without rebuilding table
    false_positive = BooleanField()
    zones = JSONField()
    thumbnail = TextField()
    has_clip = BooleanField(default=True)
    has_snapshot = BooleanField(default=True)
    region = (
        JSONField()
    )  # TODO remove when columns can be dropped without rebuilding table
    box = (
        JSONField()
    )  # TODO remove when columns can be dropped without rebuilding table
    area = (
        IntegerField()
    )  # TODO remove when columns can be dropped without rebuilding table
    retain_indefinitely = BooleanField(default=False)
    ratio = FloatField(default=1.0)
    plus_id = CharField(max_length=30)
    #added as test (RAID)
    retrain_id = CharField(max_length=30)
    model_hash = CharField(max_length=32)
    detector_type = CharField(max_length=32)
    model_type = CharField(max_length=32)
    data = JSONField()  # ex: tracked object box, region, etc.


class Timeline(Model):  # type: ignore[misc]
    timestamp = DateTimeField()
    camera = CharField(index=True, max_length=20)
    source = CharField(index=True, max_length=20)  # ex: tracked object, audio, external
    source_id = CharField(index=True, max_length=30)
    class_type = CharField(max_length=50)  # ex: entered_zone, audio_heard
    data = JSONField()  # ex: tracked object id, region, box, etc.


class Recordings(Model):  # type: ignore[misc]
    id = CharField(null=False, primary_key=True, max_length=30)
    camera = CharField(index=True, max_length=20)
    path = CharField(unique=True)
    start_time = DateTimeField()
    end_time = DateTimeField()
    duration = FloatField()
    motion = IntegerField(null=True)
    objects = IntegerField(null=True)
    segment_size = FloatField(default=0)  # this should be stored as MB
