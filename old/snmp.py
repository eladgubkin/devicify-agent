class NetworkInterface(object):
    def __init__(self, description, interface_type, mtu, speed, mac, out_octets, in_octets):
        self.description = description
        self.interface_type = interface_type
        self.mtu = mtu
        self.speed = speed
        self.mac = mac
        self.out_octets = out_octets
        self.in_octets = in_octets

    def serialize(self):
        return {
            'description': self.description,
            'interface_type': self.interface_type,
            'mtu': self.mtu,
            'speed': self.speed,
            'mac': self.mac,
            'out_octets': self.out_octets,
            'in_octets': self.in_octets,
        }
    
    @staticmethod
    def deserialize(data):
        return NetworkInterface(
            description=data['description'],
            interface_type=data['interface_type'],
            mtu=data['mtu'],
            speed=data['speed'],
            mac=data['mac'],
            out_octets=data['out_octets'],
            in_octets=data['in_octets'])


class SNMPEndpoint(object):
    def __init__(self, name, description, location, uptime, interfaces):
        self.name = name
        self.description = description
        self.location = location
        self.uptime = uptime
        self.interfaces = interfaces

    def serialize(self):
        return {
            'name': self.name,
            'description': self.description,
            'location': self.location,
            'uptime': self.uptime,
            'interfaces': [interface.serialize() for interface in self.interfaces],
        }

    @staticmethod
    def deserialize(data):
        return SNMPEndpoint(
            name=data['name'],
            description=data['description'],
            location=data['location'],
            uptime=data['uptime'],
            interfaces=[NetworkInterface.deserialize(interface) for interface in data['interfaces']])