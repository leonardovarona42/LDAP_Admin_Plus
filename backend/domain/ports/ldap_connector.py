from abc import ABC, abstractmethod
from typing import Optional
from domain.entities.ldap_server import LDAPServer
from domain.entities.user import LDAPUser
from domain.entities.group import LDAPGroup
from domain.entities.ou import OrganizationalUnit


class LDAPConnectorPort(ABC):
    @abstractmethod
    def connect(self, server: LDAPServer) -> bool: ...

    @abstractmethod
    def disconnect(self) -> None: ...

    @abstractmethod
    def test_connection(self, server: LDAPServer) -> bool: ...

    @abstractmethod
    def search_users(self, base_dn: str, filter_str: str = "(objectClass=user)",
                     attribute_mappings: Optional[dict] = None) -> list[LDAPUser]: ...

    @abstractmethod
    def search_groups(self, base_dn: str, filter_str: str = "(objectClass=group)") -> list[LDAPGroup]: ...

    @abstractmethod
    def search_ous(self, base_dn: str) -> list[OrganizationalUnit]: ...

    @abstractmethod
    def search_computers(self, base_dn: str, filter_str: str = "(objectClass=computer)",
                         attribute_mappings: Optional[dict] = None) -> list[dict]: ...

    @abstractmethod
    def get_user_stats(self, base_dn: str, filter_str: str = "(objectClass=user)") -> dict:
        """Return {total, enabled, disabled} without loading full user objects."""

    @abstractmethod
    def get_user(self, dn: str, attribute_mappings: Optional[dict] = None) -> Optional[LDAPUser]: ...

    @abstractmethod
    def create_user(self, user: LDAPUser, password: str) -> bool: ...

    @abstractmethod
    def update_user(self, user: LDAPUser) -> bool: ...

    @abstractmethod
    def delete_user(self, dn: str) -> bool: ...

    @abstractmethod
    def create_group(self, group: LDAPGroup) -> bool: ...

    @abstractmethod
    def delete_group(self, dn: str) -> bool: ...

    @abstractmethod
    def add_member_to_group(self, group_dn: str, member_dn: str) -> bool: ...

    @abstractmethod
    def remove_member_from_group(self, group_dn: str, member_dn: str) -> bool: ...

    @abstractmethod
    def change_password(self, dn: str, new_password: str) -> bool: ...

    @abstractmethod
    def enable_user(self, dn: str) -> bool: ...

    @abstractmethod
    def disable_user(self, dn: str) -> bool: ...
