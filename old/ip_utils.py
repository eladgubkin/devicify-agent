from netaddr import IPNetwork, IPRange


def parse_network(network):
    if isinstance(network, list):
        return network

    # Parse input like '192.168.0.1-192.168.1.5'
    if '-' in network:      
        start, end = network.split('-')
        return [str(ip) for ip in IPRange(start, end)]

    # Parse input like '192.168.0.1' or '192.168.0.1/22'
    return [str(ip) for ip in IPNetwork(network)]