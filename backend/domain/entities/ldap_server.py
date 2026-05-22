from dataclasses import dataclass, field
from enum import Enum
from uuid import uuid4


class LDAPProtocol(Enum):
    LDAP = "ldap"
    LDAPS = "ldaps"


class ServerStatus(Enum):
    ONLINE = "online"
    OFFLINE = "offline"
    DEGRADED = "degraded"


DEFAULT_ATTRIBUTE_MAPPINGS = {
    "cn": "cn",
    "uid": "uid",
    "sn": "sn",
    "given_name": "givenName",
    "mail": "mail",
    "telephone": "telephoneNumber",
    "mobile": "mobile",
    "department": "department",
    "company": "company",
    "ci": "employeeID",
    "cargo": "title",
    "description": "description",
    "member_of": "memberOf",
    "enabled_attribute": "userAccountControl",
    "computer_cn": "cn",
    "computer_os": "operatingSystem",
    "computer_dns_hostname": "dNSHostName",
    "computer_description": "description",
}


@dataclass
class LDAPServer:
    id: str
    name: str
    host: str
    port: int
    protocol: LDAPProtocol
    base_dn: str
    bind_dn: str
    bind_password: str
    timeout: int = 10
    status: ServerStatus = ServerStatus.OFFLINE
    version: int = 3
    use_tls: bool = False
    description: str = ""
    attribute_mappings: dict = field(default_factory=lambda: dict(DEFAULT_ATTRIBUTE_MAPPINGS))

    @classmethod
    def create(cls, name: str, host: str, port: int, protocol: LDAPProtocol,
               base_dn: str, bind_dn: str, bind_password: str, **kwargs) -> "LDAPServer":
        mappings = kwargs.pop("attribute_mappings", None)
        if mappings is None:
            mappings = dict(DEFAULT_ATTRIBUTE_MAPPINGS)
        return cls(
            id=str(uuid4()),
            name=name,
            host=host,
            port=port,
            protocol=protocol,
            base_dn=base_dn,
            bind_dn=bind_dn,
            bind_password=bind_password,
            attribute_mappings=mappings,
            **kwargs
        )

    @property
    def uri(self) -> str:
        scheme = "ldaps" if self.protocol == LDAPProtocol.LDAPS else "ldap"
        return f"{scheme}://{self.host}:{self.port}"
