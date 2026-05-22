from dataclasses import dataclass, field
from typing import Optional


@dataclass
class LDAPGroup:
    dn: str
    cn: str
    description: Optional[str] = None
    members: list[str] = field(default_factory=list)
    ou: Optional[str] = None
    group_type: str = "security"
    attributes: dict[str, list[str]] = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "dn": self.dn,
            "cn": self.cn,
            "description": self.description,
            "members": self.members,
            "ou": self.ou,
            "groupType": self.group_type,
        }
