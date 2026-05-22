from typing import Optional
from domain.entities.ldap_server import LDAPServer
from infrastructure.ldap.proxy import ConnectionProxy


class LDAPConnectionPool:
    def __init__(self):
        self._connections: dict[str, ConnectionProxy] = {}

    def get_or_create(self, server: LDAPServer) -> ConnectionProxy:
        if server.id not in self._connections:
            proxy = ConnectionProxy(server)
            proxy.connect()
            self._connections[server.id] = proxy
        return self._connections[server.id]

    def remove(self, server_id: str) -> None:
        if server_id in self._connections:
            self._connections[server_id].disconnect()
            del self._connections[server_id]

    def disconnect_all(self) -> None:
        for proxy in self._connections.values():
            proxy.disconnect()
        self._connections.clear()
