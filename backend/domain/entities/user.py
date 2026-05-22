from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LDAPUser:
    dn: str
    cn: str
    uid: str
    sn: str
    given_name: str
    mail: Optional[str] = None
    telephone: Optional[str] = None
    mobile: Optional[str] = None
    department: Optional[str] = None
    company: Optional[str] = None
    manager_dn: Optional[str] = None
    description: Optional[str] = None
    ou: Optional[str] = None
    ci: Optional[str] = None
    cargo: Optional[str] = None
    enabled: bool = True
    member_of: list[str] = field(default_factory=list)
    attributes: dict[str, list[str]] = field(default_factory=dict)

    def display_name(self) -> str:
        return f"{self.given_name} {self.sn}"

    def to_dict(self) -> dict:
        return {
            "dn": self.dn,
            "cn": self.cn,
            "uid": self.uid,
            "sn": self.sn,
            "givenName": self.given_name,
            "mail": self.mail,
            "telephone": self.telephone,
            "mobile": self.mobile,
            "department": self.department,
            "company": self.company,
            "managerDn": self.manager_dn,
            "description": self.description,
            "ou": self.ou,
            "ci": self.ci,
            "cargo": self.cargo,
            "enabled": self.enabled,
            "memberOf": self.member_of,
            "displayName": self.display_name(),
        }
