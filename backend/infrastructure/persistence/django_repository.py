from typing import Optional
from domain.entities.ldap_server import LDAPServer, LDAPProtocol, ServerStatus, DEFAULT_ATTRIBUTE_MAPPINGS
from domain.ports.ldap_repository import LDAPServerRepository
from infrastructure.persistence.models import LDAPServerModel


class DjangoLDAPServerRepository(LDAPServerRepository):
    def save(self, server: LDAPServer) -> LDAPServer:
        LDAPServerModel.objects.update_or_create(
            id=server.id,
            defaults={
                "name": server.name,
                "host": server.host,
                "port": server.port,
                "protocol": server.protocol.value,
                "base_dn": server.base_dn,
                "bind_dn": server.bind_dn,
                "bind_password": server.bind_password,
                "timeout": server.timeout,
                "use_tls": server.use_tls,
                "version": server.version,
                "description": server.description,
                "attribute_mappings": server.attribute_mappings,
            },
        )
        return server

    def find_by_id(self, server_id: str) -> Optional[LDAPServer]:
        try:
            model = LDAPServerModel.objects.get(id=server_id)
            return self._model_to_entity(model)
        except LDAPServerModel.DoesNotExist:
            return None

    def find_all(self) -> list[LDAPServer]:
        return [self._model_to_entity(m) for m in LDAPServerModel.objects.all()]

    def delete(self, server_id: str) -> None:
        LDAPServerModel.objects.filter(id=server_id).delete()

    def update(self, server: LDAPServer) -> LDAPServer:
        return self.save(server)

    def _model_to_entity(self, model: LDAPServerModel) -> LDAPServer:
        mappings = model.attribute_mappings or dict(DEFAULT_ATTRIBUTE_MAPPINGS)
        return LDAPServer(
            id=model.id,
            name=model.name,
            host=model.host,
            port=model.port,
            protocol=LDAPProtocol(model.protocol),
            base_dn=model.base_dn,
            bind_dn=model.bind_dn,
            bind_password=model.bind_password,
            timeout=model.timeout,
            use_tls=model.use_tls,
            version=model.version,
            description=model.description,
            status=ServerStatus.OFFLINE,
            attribute_mappings=mappings,
        )
