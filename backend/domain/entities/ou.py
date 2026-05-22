from dataclasses import dataclass, field
from typing import Optional


@dataclass
class OrganizationalUnit:
    dn: str
    name: str
    description: Optional[str] = None
    parent_dn: Optional[str] = None
    children: list["OrganizationalUnit"] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "dn": self.dn,
            "name": self.name,
            "description": self.description,
            "parentDn": self.parent_dn,
        }
