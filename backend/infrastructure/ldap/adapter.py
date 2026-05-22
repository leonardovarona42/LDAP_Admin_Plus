from typing import Optional
import ldap3
from ldap3 import SUBTREE, ALL_ATTRIBUTES, MODIFY_REPLACE

from domain.ports.ldap_connector import LDAPConnectorPort
from domain.entities.ldap_server import LDAPServer, ServerStatus, DEFAULT_ATTRIBUTE_MAPPINGS
from domain.entities.user import LDAPUser
from domain.entities.group import LDAPGroup
from domain.entities.ou import OrganizationalUnit
from infrastructure.ldap.proxy import ConnectionProxy, LDAPProxyError


class LDAPConnectorAdapter(LDAPConnectorPort):
    def __init__(self):
        self._proxy: Optional[ConnectionProxy] = None
        self._current_server: Optional[LDAPServer] = None

    def _ensure_proxy(self, server: LDAPServer) -> ConnectionProxy:
        if not self._proxy or self._current_server != server:
            if self._proxy:
                self._proxy.disconnect()
            self._proxy = ConnectionProxy(server)
            self._current_server = server
        return self._proxy

    def connect(self, server: LDAPServer) -> bool:
        proxy = self._ensure_proxy(server)
        return proxy.test()

    def disconnect(self) -> None:
        if self._proxy:
            self._proxy.disconnect()
            self._proxy = None
            self._current_server = None

    def test_connection(self, server: LDAPServer) -> bool:
        proxy = ConnectionProxy(server)
        try:
            proxy.connect()
            result = proxy.test()
            proxy.disconnect()
            return result
        except LDAPProxyError:
            return False

    def _entry_to_user(self, entry, mappings=None) -> LDAPUser:
        m = mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        attrs = entry.entry_attributes_as_dict
        enabled_attr = m.get("enabled_attribute", "userAccountControl")
        uac_vals = attrs.get(enabled_attr, None)
        enabled = uac_vals is None or not (int(uac_vals[0]) & 2)
        return LDAPUser(
            dn=entry.entry_dn,
            cn=attrs.get(m.get("cn", "cn"), [""])[0],
            uid=attrs.get(m.get("uid", "uid"), [""])[0],
            sn=attrs.get(m.get("sn", "sn"), [""])[0],
            given_name=attrs.get(m.get("given_name", "givenName"), [""])[0],
            mail=attrs.get(m.get("mail", "mail"), [None])[0],
            telephone=attrs.get(m.get("telephone", "telephoneNumber"), [None])[0],
            mobile=attrs.get(m.get("mobile", "mobile"), [None])[0],
            department=attrs.get(m.get("department", "department"), [None])[0],
            company=attrs.get(m.get("company", "company"), [None])[0],
            ci=str(attrs.get(m.get("ci", "employeeID"), [None])[0]) if attrs.get(m.get("ci", "employeeID"), [None])[0] is not None else None,
            cargo=str(attrs.get(m.get("cargo", "title"), [None])[0]) if attrs.get(m.get("cargo", "title"), [None])[0] is not None else None,
            description=attrs.get(m.get("description", "description"), [None])[0],
            enabled=enabled,
            member_of=attrs.get(m.get("member_of", "memberOf"), []),
            attributes={k: [str(v) for v in vals] for k, vals in attrs.items()},
        )

    def _entry_to_group(self, entry) -> LDAPGroup:
        attrs = entry.entry_attributes_as_dict
        return LDAPGroup(
            dn=entry.entry_dn,
            cn=attrs.get("cn", [""])[0],
            description=attrs.get("description", [None])[0],
            members=[str(m) for m in attrs.get("member", [])],
        )

    def _entry_to_ou(self, entry) -> OrganizationalUnit:
        attrs = entry.entry_attributes_as_dict
        return OrganizationalUnit(
            dn=entry.entry_dn,
            name=attrs.get("ou", [""])[0] or attrs.get("name", [""])[0],
            description=attrs.get("description", [None])[0],
        )

    def search_users(self, base_dn: str, filter_str: str = "(objectClass=user)",
                     attribute_mappings: Optional[dict] = None) -> list[LDAPUser]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(base_dn, filter_str, search_scope=SUBTREE)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        return [self._entry_to_user(e, m) for e in entries]

    def search_groups(self, base_dn: str, filter_str: str = "(objectClass=group)") -> list[LDAPGroup]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(base_dn, filter_str, search_scope=SUBTREE)
        return [self._entry_to_group(e) for e in entries]

    def search_ous(self, base_dn: str) -> list[OrganizationalUnit]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(
            base_dn, "(|(objectClass=organizationalUnit)(objectClass=container))",
            search_scope=SUBTREE
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
                paged_size=1000,
                paged_cookie=cookie,
            )
            for e in entries:
                total += 1
                attrs = e.entry_attributes_as_dict
                uac = attrs.get("userAccountControl", [0])[0]
                if uac is not None and not (int(uac) & 2):
                    enabled += 1
                elif uac is None:
                    enabled += 1
            # Check for next page
            ctrl = self._proxy.last_paged_cookie
            if not ctrl:
                break
            cookie = ctrl
        return {"total": total, "enabled": enabled, "disabled": total - enabled}

    def get_user(self, dn: str, attribute_mappings: Optional[dict] = None) -> Optional[LDAPUser]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(dn, "(objectClass=user)", search_scope=SUBTREE)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        return self._entry_to_user(entries[0], m) if entries else None

    def search_computers(self, base_dn: str, filter_str: str = "(objectClass=computer)",
                         attribute_mappings: Optional[dict] = None) -> list[dict]:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        entries = self._proxy.search(base_dn, filter_str, search_scope=SUBTREE)
        m = attribute_mappings or DEFAULT_ATTRIBUTE_MAPPINGS
        result = []
        for e in entries:
            attrs = e.entry_attributes_as_dict
            result.append({
                "dn": e.entry_dn,
                "cn": attrs.get(m.get("computer_cn", "cn"), [""])[0],
                "operatingSystem": attrs.get(m.get("computer_os", "operatingSystem"), [None])[0],
                "dNSHostName": attrs.get(m.get("computer_dns_hostname", "dNSHostName"), [None])[0],
                "description": attrs.get(m.get("computer_description", "description"), [None])[0],
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
        return self._proxy.modify(group_dn, {"member": [(MODIFY_REPLACE, [member_dn])]})

    def remove_member_from_group(self, group_dn: str, member_dn: str) -> bool:
        if not self._proxy:
            raise LDAPProxyError("Not connected")
        return self._proxy.modify(group_dn, {"member": [(MODIFY_REPLACE, [])]})

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
