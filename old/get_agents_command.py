import pythonping
from old.command import Command, CommandType, CommandAnswer


class GetAgentsCommand(Command):
    def __init__(self, command_id):
        super(GetAgentsCommand, self).__init__(command_id)

    async def execute(self, agent_manager):
        return GetAgentsCommandAnswer(self.command_id,
                                      list(agent_manager.get_all_agents()))

    def serialize(self):
        return {
            'commandId': self.command_id,
            'type': CommandType.GET_AGENTS.value,
        }

    @staticmethod
    def deserialize(data):
        return GetAgentsCommand(command_id=data['commandId'])


class GetAgentsCommandAnswer(CommandAnswer):
    def __init__(self, command_id, agents):
        super(GetAgentsCommandAnswer, self).__init__(command_id)
        self.agents = agents

    def serialize(self):
        return dict({
            'commandId': self.command_id,
            'type': CommandType.GET_AGENTS.value,
            'agents': self.agents
        })

    @staticmethod
    def deserialize(data):
        return GetAgentsCommandAnswer(data['commandId'], data['agents'])