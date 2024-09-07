import pythonping
from pysnmp.hlapi import *
from old.command import Command, CommandType, CommandAnswer
from old.ip_utils import parse_network
from multiprocessing import Pool
from old.settings import DEFAULT_POOL_PROCSESES
from old.snmp import SNMPEndpoint, NetworkInterface

# Load IF-MIB
from pysnmp.smi import builder, view, compiler, rfc1902
mibBuilder = builder.MibBuilder()
compiler.addMibCompiler(mibBuilder, sources=[
                        'http://mibs.snmplabs.com/asn1/@mib@'])
mibBuilder.loadModules('SNMPv2-MIB', 'IF-MIB')

snmp_engine = SnmpEngine()


def snmp_scan(ip):
    community = 'public'

    error_indication, error_status, _, var_binds = next(getCmd(
        snmp_engine,
        CommunityData(community),
        UdpTransportTarget((ip, 161), timeout=0.2, retries=0),
        ContextData(),
        ObjectType(ObjectIdentity('SNMPv2-MIB', 'sysName', 0)),
        ObjectType(ObjectIdentity('SNMPv2-MIB', 'sysDescr', 0)),
        ObjectType(ObjectIdentity('SNMPv2-MIB', 'sysLocation', 0)),
        ObjectType(ObjectIdentity('SNMPv2-MIB', 'sysUpTime', 0))))

    if error_indication or error_status:
        return None

    name, system_description, location, uptime = var_binds
    interfaces = []

    for (error_indication, error_status, _, var_binds) in nextCmd(
        snmp_engine,
        CommunityData(community, mpModel=0),
        UdpTransportTarget((ip, 161), timeout=1, retries=0),
        ContextData(),
        ObjectType(ObjectIdentity('IF-MIB', 'ifDescr')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifType')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifMtu')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifSpeed')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifPhysAddress')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifOutOctets')),
        ObjectType(ObjectIdentity('IF-MIB', 'ifInOctets')),
            lexicographicMode=False):

        if error_indication or error_status:
            continue

        description, interface_type, mtu, speed, mac, out_octets, in_octets = var_binds

        interfaces.append(NetworkInterface(
            description=description[1].prettyPrint(),
            interface_type=interface_type[1].prettyPrint(),
            mtu=int(mtu[1]),
            speed=int(speed[1]),
            mac=mac[1].prettyPrint(),
            out_octets=int(out_octets[1]),
            in_octets=int(in_octets[1])))

    endpoint = SNMPEndpoint(
        name=name[1].prettyPrint(),
        description=system_description[1].prettyPrint(),
        location=location[1].prettyPrint(),
        uptime=int(uptime[1]),
        interfaces=interfaces)

    return (ip, endpoint)


class SNMPScanCommand(Command):
    def __init__(self, command_id, network, community):
        super(SNMPScanCommand, self).__init__(command_id)
        self.network = network
        self.community = community

    async def execute(self, agent_manager):
        pool = Pool(DEFAULT_POOL_PROCSESES)
        result = pool.map(snmp_scan, parse_network(self.network))
        pool.close()
        pool.join()

        return SNMPScanCommandAnswer(self.command_id,
                                     dict(item for item in result if item is not None))

    def serialize(self):
        return {
            'commandId': self.command_id,
            'type': CommandType.SNMP_SCAN.value,
            'network': self.network,
            'community': self.community,
        }

    @staticmethod
    def deserialize(data):
        return SNMPScanCommand(command_id=data['commandId'],
                               network=data['network'],
                               community=data['community'])


class SNMPScanCommandAnswer(CommandAnswer):
    def __init__(self, command_id, result):
        super(SNMPScanCommandAnswer, self).__init__(command_id)
        self.result = result

    def serialize(self):
        return dict({
            'commandId': self.command_id,
            'type': CommandType.SNMP_SCAN.value,
            'result': dict((ip, endpoint.serialize()) for (ip, endpoint) in self.result.items()),
        })

    @staticmethod
    def deserialize(data):
        return SNMPScanCommandAnswer(data['commandId'],
                                     dict((ip, SNMPEndpoint.deserialize(endpoint)) for (ip, endpoint) in data['result'].items()))