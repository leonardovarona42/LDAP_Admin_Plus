from django.core.cache import cache

from domain.entities.ldap_server import LDAPServer
from domain.ports.ldap_repository import LDAPServerRepository
from domain.ports.ldap_connector import LDAPConnectorPort


class RegisterServerUseCase:
    def __init__(self, repo: LDAPServerRepository, connector: LDAPConnectorPort):
        self._repo = repo
        self._connector = connector

    def execute(self, server: LDAPServer) -> LDAPServer:
        saved = self._repo.save(server)
        self._connector.test_connection(saved)
        return saved


class ListServersUseCase:
    def __init__(self, repo: LDAPServerRepository, connector: LDAPConnectorPort):
        self._repo = repo
        self._connector = connector

    def execute(self) -> list[dict]:
        servers = self._repo.find_all()
        result = []
        for server in servers:
            cache_key = f"server_status:{server.id}"
            status = cache.get(cache_key)
            if status is None:
                status = self._connector.test_connection(server)
                cache.set(cache_key, status, 60)
            result.append({
                "id": server.id,
                "name": server.name,
                "host": server.host,
                "port": server.port,
                "protocol": server.protocol.value,
                "base_dn": server.base_dn,
                "status": "online" if status else "offline",
            })
        return result


class RemoveServerUseCase:
    def __init__(self, repo: LDAPServerRepository):
        self._repo = repo

    def execute(self, server_id: str) -> None:
        self._repo.delete(server_id)
