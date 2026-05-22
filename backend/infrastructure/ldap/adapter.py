from typing import Optional
from ldap3 import SUBTREE, MODIFY_REPLACE, MODIFY_ADD, MODIFY_DELETE

from domain.ports.ldap_connector import LDAPConnectorPort
from domain.entities.ldap_server import LDAPServer, ServerStatus, DEFAULT_ATTRIBUTE_MAPPINGS
from domain.entities.user import LDAPUser
from domain.entities.group import LDAPGroup
from domain.entities.ou import OrganizationalUnit
from infrastructure.ldap.proxy import ConnectionProxy, LDAPProxyError
from infrastructure.ldap.pool import LDAPConnectionPool

LDAP_PAGE_SIZE = 1000

USER_ATTRS = [
    "cn", "uid", "sn", "givenName", "mail",
    "telephoneNumber", "mobile", "department", "company",
    "employeeID", "title", "description",
    "userAccountControl", "memberOf",
]
GROUP_ATTRS = ["cn", "description", "member"]
OU_ATTRS = ["ou", "name", "description"]
COMPUTER_ATTRS = ["cn", "operatingSystem", "dNSHostName", "description"]


def _paged_search(proxy, base_dn, filter_str, attributes, search_scope=SUBTREE, max_pages=100):
    """Realiza busqueda paginada acumulando todas las paginas."""
    all_entries = []
    cookie = None
    page_count = 0
    while True:
        entries = proxy.search(
            base_dn, filter_str,
            attributes=attributes,
            search_scope=search_scope,
            paged_size=LDAP_PAGE_SIZE,
            paged_cookie=cookie,
        )
        all_entries.extend(entries)
        cookie = proxy.last_paged_cookie
        page_count += 1
        if not cookie or page_count >= max_pages:
            break
    return all_entries


class LDAPConnectorAdapter(LDAPConnectorPort):
    def __init__(self, pool: Optional[LDAPConnectionPool] = None):
        self._pool = pool or LDAPConnectionPool()
        self._proxy: Optional[ConnectionProxy] = None

    def _ensure_proxy(self, server: LDAPServer) -> ConnectionProxy:
        self._proxy = self._pool.get_or_create(server)
        return self._proxy

    def connect(self, server: LDAPServer) -> bool:
        proxy = self._ensure_proxy(server)
        if not proxy.is_alive():
            proxy.connect()
        return proxy.test()

    def disconnect(self) -> None:
        self._proxy = None

    def remove_connection(self, server_id: str) -> None:
        self._pool.remove(server_id)

    def test_connection(self, server: LDAPServer) -> bool:
        proxy = ConnectionProxy(server)
        try:
            proxy.connect()
            result = proxy.test()
            proxy.disconnect()
            return result
        except LDAPProxyError:
            return False

    @staticmethod
    def _safe_attr(attrs, key, default=""):
        vals = attrs.get(key)
        if not vals:
            return default
        return vals[0]

    def _entry_to_user(self, entry, mappings=None) -> LDAPUser:
        m = mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        attrs = entry.entry_attributes_as_dict
        a = lambda k, fb=None, d="": self._safe_attr(attrs, m.get(k, fb or k), d)
        enabled_attr = m.get("enabled_attribute", "userAccountControl")
        uac_val = self._safe_attr(attrs, enabled_attr, None)
        enabled = uac_val is None or not (int(uac_val) & 2)
        return LDAPUser(
            dn=entry.entry_dn,
            cn=a("cn"),
            uid=a("uid"),
            sn=a("sn"),
            given_name=a("given_name", "givenName"),
            mail=a("mail", d=None),
            telephone=a("telephone", "telephoneNumber"),
            mobile=a("mobile", d=None),
            department=a("department", d=None),
            company=a("company", d=None),
            ci=a("ci", "employeeID"),
            cargo=a("cargo", "title"),
            description=a("description", d=None),
            enabled=enabled,
            member_of=attrs.get(m.get("member_of", "memberOf"), []),
        )

    def _entry_to_group(self, entry) -> LDAPGroup:
        attrs = entry.entry_attributes_as_dict
        return LDAPGroup(
            dn=entry.entry_dn,
            cn=self._safe_attr(attrs, "cn"),
            description=self._safe_attr(attrs, "description", None),
            members=[str(m) for m in attrs.get("member", [])],
        )

    def _entry_to_ou(self, entry) -> OrganizationalUnit:
        attrs = entry.entry_attributes_as_dict
        return OrganizationalUnit(
            dn=entry.entry_dn,
            name=self._safe_attr(attrs, "ou") or self._safe_attr(attrs, "name"),
            description=self._safe_attr(attrs, "description", None),
        )

    def search_users(self, base_dn: str, filter_str: str = "(objectClass=user)",
                     attribute_mappings: Optional[dict] = None) -> list[LDAPUser]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = _paged_search(self._proxy, base_dn, filter_str, USER_ATTRS)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        return [self._entry_to_user(e, m) for e in entries]

    def search_groups(self, base_dn: str, filter_str: str = "(objectClass=group)") -> list[LDAPGroup]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = _paged_search(self._proxy, base_dn, filter_str, GROUP_ATTRS)
        return [self._entry_to_group(e) for e in entries]

    def search_ous(self, base_dn: str) -> list[OrganizationalUnit]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = _paged_search(
            self._proxy, base_dn,
            "(|(objectClass=organizationalUnit)(objectClass=container))",
            OU_ATTRS,
        )
        return [self._entry_to_ou(e) for e in entries]

    def get_user_stats(self, base_dn: str, filter_str: str = "(objectClass=user)") -> dict:
        """Lightweight user count using paged search with minimal attributes."""
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        total = 0
        enabled = 0
        cookie = None
        while True:
            entries = self._proxy.search(
                base_dn, filter_str,
                attributes=["userAccountControl"],
                search_scope=SUBTREE,
                paged_size=LDAP_PAGE_SIZE,
                paged_cookie=cookie,
            )
            for e in entries:
                total += 1
                uac = self._safe_attr(e.entry_attributes_as_dict, "userAccountControl", None)
                if uac is None or not (int(uac) & 2):
                    enabled += 1
            ctrl = self._proxy.last_paged_cookie
            if not ctrl:
                break
            cookie = ctrl
        return {"total": total, "enabled": enabled, "disabled": total - enabled}

    def get_user(self, dn: str, attribute_mappings: Optional[dict] = None) -> Optional[LDAPUser]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(dn, "(objectClass=user)",
                                     attributes=USER_ATTRS, search_scope=SUBTREE)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        return self._entry_to_user(entries[0], m) if entries else None

    def search_computers(self, base_dn: str, filter_str: str = "(objectClass=computer)",
                         attribute_mappings: Optional[dict] = None) -> list[dict]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = _paged_search(self._proxy, base_dn, filter_str, COMPUTER_ATTRS)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        result = []
        for e in entries:
            attrs = e.entry_attributes_as_dict
            result.append({
                "dn": e.entry_dn,
                "cn": self._safe_attr(attrs, m.get("computer_cn", "cn")),
                "operatingSystem": self._safe_attr(attrs, m.get("computer_os", "operatingSystem"), None),
                "dNSHostName": self._safe_attr(attrs, m.get("computer_dns_hostname", "dNSHostName"), None),
                "description": self._safe_attr(attrs, m.get("computer_description", "description"), None),
            })
        return result

    def create_user(self, user: LDAPUser, password: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        attrs = {
            "cn": user.cn,
            "sn": user.sn,
            "givenName": user.given_name,
            "uid": user.uid,
            "objectClass": ["top", "person", "organizationalPerson", "user"],
        }
        if user.mail:
            attrs["mail"] = user.mail
        if user.telephone:
            attrs["telephoneNumber"] = user.telephone
        if user.description:
            attrs["description"] = user.description
        if user.ci:
            attrs["employeeID"] = user.ci
        if user.cargo:
            attrs["title"] = user.cargo
        result = self._proxy.add(user.dn, ["top", "person", "organizationalPerson", "user"], attrs)
        if result and password:
            self._proxy.modify_password(user.dn, password)
        return result

    def update_user(self, user: LDAPUser) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        changes = {}
        for attr, value in [
            ("cn", user.cn), ("sn", user.sn), ("givenName", user.given_name),
            ("mail", user.mail), ("telephoneNumber", user.telephone),
            ("description", user.description),
            ("employeeID", user.ci),
            ("title", user.cargo),
        ]:
            if value:
                changes[attr] = [(MODIFY_REPLACE, [value])]
        return self._proxy.modify(user.dn, changes)

    def delete_user(self, dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.delete(dn)

    def create_group(self, group: LDAPGroup) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        attrs = {
            "cn": group.cn,
            "objectClass": ["top", "group"],
        }
        if group.description:
            attrs["description"] = group.description
        return self._proxy.add(group.dn, ["top", "group"], attrs)

    def delete_group(self, dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.delete(dn)

    def add_member_to_group(self, group_dn: str, member_dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify(group_dn, {"member": [(MODIFY_ADD, [member_dn])]})

    def remove_member_from_group(self, group_dn: str, member_dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify(group_dn, {"member": [(MODIFY_DELETE, [member_dn])]})

    def change_password(self, dn: str, new_password: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify_password(dn, new_password)

    def enable_user(self, dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify(dn, {
            "userAccountControl": [(MODIFY_REPLACE, ["512"])]
        })

    def disable_user(self, dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify(dn, {
            "userAccountControl": [(MODIFY_REPLACE, ["514"])]
        })
