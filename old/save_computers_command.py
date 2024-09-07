import pythonping
from old.command import Command, CommandType, CommandAnswer
from server.models import db, Computer
import json
import uuid
import asyncpg


class SaveComputersCommand(Command):    
    def __init__(self, command_id, computers):
        super(SaveComputersCommand, self).__init__(command_id)
        self.computers = computers

    async def execute(self, agent_manager):
        computers = json.loads(self.computers)

        for computer in computers:
            try:
                await Computer.create(
                    name=computer['name'],
                    ip=computer['ip'],
                    ping=computer['ping'],
                    mac=computer['mac'],
                    location=computer['location'],
                    uptime=computer['uptime'],
                    download=computer['download'],
                    upload=computer['upload']
                )
            except asyncpg.exceptions.UniqueViolationError:
                existing_computer = await Computer.get(computer['mac'])

                await existing_computer.update(
                    name=computer['name'],
                    ip=computer['ip'],
                    ping=computer['ping'],
                    location=computer['location'],
                    uptime=computer['uptime'],
                    download=computer['download'],
                    upload=computer['upload']).apply()

        return SaveComputersCommandAnswer(self.command_id)

    def serialize(self):
        return {
            'commandId': self.command_id,
            'type': CommandType.SAVE_COMPUTERS.value,
            'computers': self.computers
        }

    @staticmethod
    def deserialize(data):
        return SaveComputersCommand(command_id=data['commandId'],
                                    computers=data['computers'])


class SaveComputersCommandAnswer(CommandAnswer):
    def __init__(self, command_id):
        super(SaveComputersCommandAnswer, self).__init__(command_id)

    def serialize(self):
        return dict({
            'commandId': self.command_id,
            'type': CommandType.SAVE_COMPUTERS.value,
        })

    @staticmethod
    def deserialize(data):
        return SaveComputersCommandAnswer(data['commandId'])