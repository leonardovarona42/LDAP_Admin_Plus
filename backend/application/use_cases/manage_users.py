from typing import Optional
from domain.entities.user import LDAPUser
from domain.ports.ldap_connector import LDAPConnectorPort


class SearchUsersUseCase:
    def __init__(self, connector: LDAPConnectorPort):
        self._connector = connector

    def execute(self, base_dn: str, filter_str: str = "(objectClass=user)",
                attribute_mappings: Optional[dict] = None) -> list:
        return self._connector.search_users(base_dn, filter_str, attribute_mappings)


class CreateUserUseCase:
    def __init__(self, connector: LDAPConnectorPort):
        self._connector = connector

    def execute(self, user: LDAPUser, password: str) -> bool:
        return self._connector.create_user(user, password)


class UpdateUserUseCase:
    def __init__(self, connector: LDAPConnectorPort):
        self._connector = connector

    def execute(self, user: LDAPUser) -> bool:
        return self._connector.update_user(user)


class DeleteUserUseCase:
    def __init__(self, connector: LDAPConnectorPort):
        self._connector = connector

    def execute(self, dn: str) -> bool:
        return self._connector.delete_user(dn)
