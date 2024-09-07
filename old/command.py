import uuid
from enum import Enum


class CommandType(Enum):
    TRANSFER = 0
    GET_AGENTS = 1
    PING = 2
    TCP_SCAN = 3
    SNMP_SCAN = 4
    SAVE_COMPUTERS = 5
    GET_COMPUTERS = 6
    DELETE_COMPUTERS = 7


class Command(object):
    def __init__(self, command_id):
        self.command_id = command_id

    async def execute(self, agent_manager):
        raise NotImplementedError()

    def serialize(self):
        raise NotImplementedError()

    @staticmethod
    def deserialize(data):
        raise NotImplementedError()


class CommandAnswer(object):
    def __init__(self, command_id):
        self.command_id = command_id

    def serialize(self):
        raise NotImplementedError()

    @staticmethod
    def deserialize(data):
        raise NotImplementedError()