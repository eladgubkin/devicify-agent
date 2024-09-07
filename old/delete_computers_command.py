import pythonping
from old.command import Command, CommandType, CommandAnswer
import json
import asyncpg

    
class DeleteComputersCommand(Command):
    def __init__(self, command_id, macs):
        super(DeleteComputersCommand, self).__init__(command_id)
        self.macs = macs

    async def execute(self, agent_manager):
        macs = json.loads(self.macs)
        for mac in macs:
            try:
                existing_computer = await Computer.get(mac)
                await existing_computer.delete()
                print(mac + ' Deleted')
            except AttributeError:
                print("'NoneType' object has no attribute 'delete'")

        return DeleteComputersCommandAnswer(self.command_id)

    def serialize(self):
        return {
            'commandId': self.command_id,
            'type': CommandType.SAVE_COMPUTERS.value,
            'macs': self.macs
        }

    @staticmethod
    def deserialize(data):
        return DeleteComputersCommand(command_id=data['commandId'],
                                      macs=data['computers'])


class DeleteComputersCommandAnswer(CommandAnswer):
    def __init__(self, command_id):
        super(DeleteComputersCommandAnswer, self).__init__(command_id)

    def serialize(self):
        return dict({
            'commandId': self.command_id,
            'type': CommandType.SAVE_COMPUTERS.value,
        })

    @staticmethod
    def deserialize(data):
        return DeleteComputersCommandAnswer(data['commandId'])