import socket
from itertools import product
from old.command import Command, CommandType, CommandAnswer
from old.ip_utils import parse_network
from multiprocessing import Pool
from old.settings import DEFAULT_POOL_PROCSESES


def scan_ip(ip, ports):
    s = socket.socket()
    s.settimeout(0.1)

    opened_ports = [port for port in ports if s.connect_ex((ip, port)) == 0]

    if len(opened_ports) == 0:
        return None

    return (ip, opened_ports)


class TcpScanCommand(Command):
    def __init__(self, command_id, network, ports):
        super(TcpScanCommand, self).__init__(command_id)
        self.network = network
        self.ports = ports

    async def execute(self, agent_manager):
        pool = Pool(DEFAULT_POOL_PROCSESES)
        result = pool.starmap(scan_ip, [(ip, self.ports)
                                        for ip in parse_network(self.network)])
        pool.close()
        pool.join()

        return TcpScanCommandAnswer(self.command_id, dict((pair for pair in result if pair is not None)))

    def serialize(self):
        return {
            'command_id': self.command_id,
            'type': CommandType.TCP_SCAN.value,
            'network': self.network,
            'ports': self.ports,
        }

    @staticmethod
    def deserialize(data):
        return TcpScanCommand(command_id=data['command_id'],
                              network=data['network'],
                              ports=data['ports'])


class TcpScanCommandAnswer(CommandAnswer):
    def __init__(self, command_id, network):
        super(TcpScanCommandAnswer, self).__init__(command_id)
        self.network = network

    def serialize(self):
        return dict({
            'command_id': self.command_id,
            'type': CommandType.TCP_SCAN.value,
            'network': self.network
        })

    @staticmethod
    def deserialize(data):
        return TcpScanCommandAnswer(data['command_id'], data['network'])