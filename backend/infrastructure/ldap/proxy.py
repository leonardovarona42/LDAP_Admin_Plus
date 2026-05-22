import logging
from typing import Optional
from ldap3 import Server, Connection, ALL, ALL_ATTRIBUTES, core, SUBTREE, MODIFY_REPLACE
from ldap3.core.exceptions import LDAPException, LDAPBindError, LDAPSocketOpenError

from domain.entities.ldap_server import LDAPServer, ServerStatus, LDAPProtocol
from domain.entities.user import LDAPUser
from domain.entities.group import LDAPGroup
from domain.entities.ou import OrganizationalUnit

logger = logging.getLogger(__name__)


class LDAPProxyError(Exception):
    pass


class ConnectionProxy:
    def __init__(self, server: LDAPServer):
        self._server = server
        self._connection: Optional[Connection] = None
        self._pool = None
        self.last_paged_cookie = None

    def connect(self) -> bool:
        try:
            use_ssl = self._server.protocol == LDAPProtocol.LDAPS
            ldap_server = Server(
                self._server.host,
                port=self._server.port,
                use_ssl=use_ssl,
                get_info=ALL,
                connect_timeout=self._server.timeout,
            )
            self._connection = Connection(
                ldap_server,
                user=self._server.bind_dn,
                password=self._server.bind_password,
                auto_bind=True,
                version=self._server.version,
                raise_exceptions=True,
            )
            if self._server.use_tls and not use_ssl:
                self._connection.start_tls()

            self._server.status = ServerStatus.ONLINE
            return True

        except (LDAPBindError, LDAPSocketOpenError, LDAPException) as e:
            self._server.status = ServerStatus.OFFLINE
            logger.error(f"LDAP connection failed for {self._server.name}: {e}")
            raise LDAPProxyError(f"Cannot connect to {self._server.uri}: {e}")

    def disconnect(self) -> None:
        if self._connection and self._connection.bound:
            try:
                self._connection.unbind()
            except LDAPException:
                pass
        self._connection = None

    @property
    def connection(self) -> Connection:
        if not self._connection or not self._connection.bound:
            self.connect()
        return self._connection

    def is_alive(self) -> bool:
        if not self._connection or not self._connection.bound:
            return False
        try:
            return self._connection.search(
                search_base="", search_filter="(objectClass=*)",
                search_scope="BASE", attributes=["1.1"], size_limit=1,
            )
        except LDAPException:
            return False

    def test(self) -> bool:
        try:
            conn = self.connection
            return conn.bound
        except LDAPProxyError:
            return False

    def search(self, search_base: str, search_filter: str,
               attributes: list[str] | None = None,
               search_scope: str = SUBTREE,
               paged_size: int | None = None,
               paged_cookie: bytes | None = None) -> list[dict]:
        try:
            conn = self.connection
            conn.search(
                search_base=search_base,
                search_filter=search_filter,
                attributes=attributes if attributes is not None else ALL_ATTRIBUTES,
                search_scope=search_scope,
                paged_size=paged_size,
                paged_cookie=paged_cookie,
            )
            self.last_paged_cookie = None
            if paged_size is not None:
                ctrl = conn.result.get("controls", {}).get("1.2.840.113556.1.4.319", {})
                if ctrl:
                    cookie = ctrl.get("value", {}).get("cookie")
                    if cookie and len(cookie) > 0:
                        self.last_paged_cookie = cookie
            return conn.entries or []
        except LDAPException as e:
            raise LDAPProxyError(f"Search failed: {e}")

    def add(self, dn: str, object_class: list[str], attributes: dict) -> bool:
        try:
            conn = self.connection
            return conn.add(dn, object_class, attributes)
        except LDAPException as e:
            raise LDAPProxyError(f"Add failed: {e}")

    def modify(self, dn: str, changes: dict) -> bool:
        try:
            conn = self.connection
            return conn.modify(dn, changes)
        except LDAPException as e:
            raise LDAPProxyError(f"Modify failed: {e}")

    def delete(self, dn: str) -> bool:
        try:
            conn = self.connection
            return conn.delete(dn)
        except LDAPException as e:
            raise LDAPProxyError(f"Delete failed: {e}")

    def modify_password(self, dn: str, new_password: str) -> bool:
        try:
            conn = self.connection
            return conn.extend.standard.modify_password(dn, new_password)
        except LDAPException as e:
            raise LDAPProxyError(f"Password change failed: {e}")
