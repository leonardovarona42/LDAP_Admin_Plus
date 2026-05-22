from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.ldap_server import LDAPServer


class LDAPServerRepository(ABC):
    @abstractmethod
    def save(self, server: LDAPServer) -> LDAPServer: ...

    @abstractmethod
    def find_by_id(self, server_id: str) -> Optional[LDAPServer]: ...

    @abstractmethod
    def find_all(self) -> list[LDAPServer]: ...

    @abstractmethod
    def delete(self, server_id: str) -> None: ...

    @abstractmethod
    def update(self, server: LDAPServer) -> LDAPServer: ...
