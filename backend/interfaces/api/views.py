import json
import threading
from datetime import datetime, timedelta

from django.contrib.auth.models import User
from django.db.models import Count
from django.utils import timezone
from django.core.cache import cache

AUTH_CACHE_KEY = "auth_config"

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

from domain.entities.ldap_server import LDAPServer, LDAPProtocol
from domain.entities.user import LDAPUser
from domain.entities.group import LDAPGroup
from application.use_cases.manage_servers import (
    RegisterServerUseCase, ListServersUseCase, RemoveServerUseCase,
)
from application.use_cases.manage_users import (
    SearchUsersUseCase, CreateUserUseCase, UpdateUserUseCase, DeleteUserUseCase,
)
from infrastructure.ldap.adapter import LDAPConnectorAdapter
from infrastructure.persistence.django_repository import DjangoLDAPServerRepository
from infrastructure.persistence.models import AuditLog, SMTPConfig, SystemRole, UserProfile, LDAPServerModel, Solicitud, AuthConfig, LDAPRoleMapping
from interfaces.api.serializers import (
    LDAPServerSerializer, LDAPUserSerializer, LDAPGroupSerializer, OUSerializer,
    AuditLogSerializer, SMTPConfigSerializer, SystemRoleSerializer,
    UserProfileSerializer, ChangePasswordSerializer, ServerMetricsSerializer,
    SolicitudSerializer, SolicitudMetricsSerializer, AuthConfigSerializer,
)

_repo = DjangoLDAPServerRepository()
_thread_local = threading.local()


def _get_connector():
    if not hasattr(_thread_local, 'adapter'):
        _thread_local.adapter = LDAPConnectorAdapter()
    return _thread_local.adapter


LDAP_CACHE_TTL = 30


def _cache_key(prefix, server_id, *args):
    return f"ldap:{prefix}:{server_id}:" + ":".join(str(a) for a in args if a)


def _get_cached_or_fetch(key, fetch_fn, ttl=LDAP_CACHE_TTL):
    result = cache.get(key)
    if result is None:
        result = fetch_fn()
        cache.set(key, result, ttl)
    return result


def _build_search_filter(term, fields=None):
    """Construye un filter LDAP para busqueda sobre multiples campos."""
    if not term:
        return None
    fields = fields or ["cn", "uid", "sn", "givenName", "mail"]
    escaped = term.replace("\\", "\\\\").replace("*", "\\*").replace("(", "\\(").replace(")", "\\)")
    clauses = [f"({f}=*{escaped}*)" for f in fields]
    return "(|" + "".join(clauses) + ")"


# -- Helper: registrar auditoria --
def log_audit(user, action, target_type="", target_id="", details="",
              ldap_server="", success=True):
    if user and user.is_authenticated:
        AuditLog.objects.create(
            user=user,
            username=user.username,
            action=action,
            target_type=target_type,
            target_id=target_id,
            details=details,
            ldap_server=ldap_server,
            success=success,
        )


class CreateUserRequestSerializer(serializers.Serializer):
    dn = serializers.CharField()
    cn = serializers.CharField()
    uid = serializers.CharField()
    sn = serializers.CharField()
    given_name = serializers.CharField()
    mail = serializers.CharField(required=False, allow_null=True)
    ci = serializers.CharField(required=False, allow_null=True)
    cargo = serializers.CharField(required=False, allow_null=True)
    password = serializers.CharField(write_only=True)


# ==================== SERVIDORES LDAP ====================

class ServerList(APIView):
    def get(self, request):
        use_case = ListServersUseCase(_repo, _get_connector())
        servers = use_case.execute()
        return Response(servers)

    def post(self, request):
        serializer = LDAPServerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        server = LDAPServer.create(
            name=data["name"], host=data["host"], port=data["port"],
            protocol=LDAPProtocol(data["protocol"]), base_dn=data["base_dn"],
            bind_dn=data["bind_dn"], bind_password=data["bind_password"],
            timeout=data.get("timeout", 10), use_tls=data.get("use_tls", False),
            description=data.get("description", ""),
            attribute_mappings=data.get("attribute_mappings"),
        )
        use_case = RegisterServerUseCase(_repo, _get_connector())
        saved = use_case.execute(server)
        log_audit(request.user, "CREATE", "LDAPServer", server.id,
                  f"Servidor LDAP '{server.name}' creado", server.name)
        return Response(LDAPServerSerializer(saved).data, status=status.HTTP_201_CREATED)


class ServerDetail(APIView):
    def get(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        return Response(LDAPServerSerializer(server).data)

    def put(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = LDAPServerSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        for key, value in data.items():
            if key == "protocol":
                setattr(server, key, LDAPProtocol(value))
            elif key in ("bind_password", "attribute_mappings") or hasattr(server, key):
                setattr(server, key, value)
        _repo.update(server)
        log_audit(request.user, "UPDATE", "LDAPServer", server_id,
                  f"Servidor LDAP '{server.name}' actualizado", server.name)
        return Response(LDAPServerSerializer(server).data)

    def delete(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if server:
            log_audit(request.user, "DELETE", "LDAPServer", server_id,
                      f"Servidor LDAP '{server.name}' eliminado", server.name)
        use_case = RemoveServerUseCase(_repo)
        use_case.execute(server_id)
        _get_connector().remove_connection(server_id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ServerConnect(APIView):
    def post(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        ok = _get_connector().connect(server)
        log_audit(request.user, "CONNECT", "LDAPServer", server_id,
                  f"Conectado a '{server.name}'", server.name, ok)
        return Response({"connected": ok})


class ServerDisconnect(APIView):
    def post(self, request, server_id):
        server = _repo.find_by_id(server_id)
        name = server.name if server else server_id
        _get_connector().disconnect()
        log_audit(request.user, "DISCONNECT", "LDAPServer", server_id,
                  f"Desconectado de '{name}'", name)
        return Response({"connected": False})


class ServerStats(APIView):
    def _count(self, callback, *args, **kwargs):
        try:
            result = callback(*args, **kwargs)
            return len(result) if result else 0
        except Exception:
            return -1

    def get(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        cache_key = _cache_key("stats", server_id)
        result = cache.get(cache_key)
        if result is not None:
            return Response(result)
        conn = _get_connector()
        conn.connect(server)
        base_dn = server.base_dn
        am = server.attribute_mappings
        result = {
            "users": self._count(conn.search_users, base_dn, "(objectClass=user)", am),
            "groups": self._count(conn.search_groups, base_dn),
            "ous": self._count(conn.search_ous, base_dn),
            "computers": self._count(conn.search_computers, base_dn, "(objectClass=computer)", am),
        }
        cache.set(cache_key, result, LDAP_CACHE_TTL)
        return Response(result)


class TestConnection(APIView):
    def post(self, request):
        serializer = LDAPServerSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        test_server = LDAPServer.create(
            name="test", host=data["host"], port=data["port"],
            protocol=LDAPProtocol(data["protocol"]), base_dn=data["base_dn"],
            bind_dn=data["bind_dn"], bind_password=data["bind_password"],
            timeout=data.get("timeout", 10), use_tls=data.get("use_tls", False),
        )
        ok = _get_connector().test_connection(test_server)
        log_audit(request.user, "TEST_CONNECTION", "LDAPServer", "",
                  f"Prueba conexion a {data['host']}:{data['port']}", data["name"], ok)
        return Response({"connected": ok})


# ==================== USUARIOS LDAP ====================

class UserList(APIView):
    def get(self, request, server_id):
        base_dn = request.query_params.get("base_dn", "")
        server = _repo.find_by_id(server_id)
        if not base_dn and server:
            base_dn = server.base_dn
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        filter_str = request.query_params.get("filter", "(objectClass=user)")
        status_filter = request.query_params.get("status", "")
        search = request.query_params.get("search", "")
        page = int(request.query_params.get("page", 1))
        page_size = int(request.query_params.get("page_size", 50))

        if search:
            sf = _build_search_filter(search)
            if sf:
                filter_str = f"(&{filter_str}{sf})"

        conn = _get_connector()
        conn.connect(server)
        try:
            mappings = server.attribute_mappings if server else None
            use_case = SearchUsersUseCase(conn)
            users = use_case.execute(base_dn, filter_str, mappings)

            if status_filter == "enabled":
                users = [u for u in users if u.enabled]
            elif status_filter == "disabled":
                users = [u for u in users if not u.enabled]

            total = len(users)
            start = (page - 1) * page_size
            end = start + page_size
            page_users = users[start:end]

            serializer = LDAPUserSerializer(page_users, many=True)
            return Response({
                "users": serializer.data,
                "total": total,
                "page": page,
                "page_size": page_size,
            })
        finally:
            pass

    def post(self, request, server_id):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = CreateUserRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        user = LDAPUser(
            dn=data["dn"], cn=data["cn"], uid=data["uid"], sn=data["sn"],
            given_name=data["given_name"], mail=data.get("mail"),
            ci=data.get("ci"), cargo=data.get("cargo"),
        )
        conn = _get_connector()
        conn.connect(server)
        use_case = CreateUserUseCase(conn)
        ok = use_case.execute(user, data["password"])
        name = server.name
        log_audit(request.user, "CREATE", "LDAPUser", data["dn"],
                  f"Usuario '{data['uid']}' creado en {name}", name, ok)
        if ok:
            return Response(LDAPUserSerializer(user).data, status=status.HTTP_201_CREATED)
        return Response({"error": "Failed to create user"}, status=status.HTTP_400_BAD_REQUEST)


class UserDetail(APIView):
    def put(self, request, server_id, dn):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        data = request.data
        user = LDAPUser(
            dn=dn, cn=data.get("cn", ""), uid=data.get("uid", ""),
            sn=data.get("sn", ""), given_name=data.get("givenName", ""),
        )
        conn = _get_connector()
        conn.connect(server)
        use_case = UpdateUserUseCase(conn)
        ok = use_case.execute(user)
        return Response({"updated": ok})

    def delete(self, request, server_id, dn):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        conn = _get_connector()
        conn.connect(server)
        use_case = DeleteUserUseCase(conn)
        ok = use_case.execute(dn)
        name = server.name
        log_audit(request.user, "DELETE", "LDAPUser", dn,
                  f"Usuario '{dn}' eliminado de {name}", name, ok)
        return Response({"deleted": ok}, status=status.HTTP_204_NO_CONTENT if ok else status.HTTP_400_BAD_REQUEST)


class UserPasswordChange(APIView):
    def post(self, request, server_id, dn):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        new_password = serializer.validated_data["new_password"]
        conn = _get_connector()
        conn.connect(server)
        try:
            ok = conn.change_password(dn, new_password)
        except Exception:
            ok = False
        log_audit(request.user, "PASSWORD_CHANGE", "LDAPUser", dn,
                  f"Cambio contrasenia para '{dn}' en {server.name}", server.name, ok)
        return Response({"changed": ok})


class UserToggleStatus(APIView):
    def post(self, request, server_id, dn):
        server = _repo.find_by_id(server_id)
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        enable = request.data.get("enable", True)
        conn = _get_connector()
        conn.connect(server)
        if enable:
            ok = conn.enable_user(dn)
            action = "USER_ENABLE"
        else:
            ok = conn.disable_user(dn)
            action = "USER_DISABLE"
        log_audit(request.user, action, "LDAPUser", dn,
                  f"{'Habilitado' if enable else 'Deshabilitado'} '{dn}' en {server.name}", server.name, ok)
        return Response({"success": ok})


# ==================== COMPUTADORAS ====================

class ComputerList(APIView):
    def get(self, request, server_id):
        base_dn = request.query_params.get("base_dn", "")
        server = _repo.find_by_id(server_id)
        if not base_dn and server:
            base_dn = server.base_dn
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        conn = _get_connector()
        conn.connect(server)
        mappings = server.attribute_mappings if server else None
        computers = conn.search_computers(base_dn, "(objectClass=computer)", mappings)
        return Response(computers)


# ==================== GRUPOS / OU ====================

class GroupList(APIView):
    def get(self, request, server_id):
        base_dn = request.query_params.get("base_dn", "")
        server = _repo.find_by_id(server_id)
        if not base_dn and server:
            base_dn = server.base_dn
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        filter_str = request.query_params.get("filter", "(objectClass=group)")
        search = request.query_params.get("search", "")
        if search:
            sf = _build_search_filter(search, ["cn", "name", "description"])
            if sf:
                filter_str = f"(&{filter_str}{sf})"
        conn = _get_connector()
        conn.connect(server)
        groups = conn.search_groups(base_dn, filter_str)
        serializer = LDAPGroupSerializer([g.to_dict() for g in groups], many=True)
        return Response(serializer.data)


class OUList(APIView):
    def get(self, request, server_id):
        base_dn = request.query_params.get("base_dn", "")
        server = _repo.find_by_id(server_id)
        if not base_dn and server:
            base_dn = server.base_dn
        if not server:
            return Response({"error": "Server not found"}, status=status.HTTP_404_NOT_FOUND)
        conn = _get_connector()
        conn.connect(server)
        cache_key = _cache_key("ous", server_id, base_dn)
        ous = _get_cached_or_fetch(cache_key,
            lambda: conn.search_ous(base_dn))
        serializer = OUSerializer(ous, many=True)
        return Response(serializer.data)


# ==================== AUDITORIA ====================

class AuditLogList(APIView):
    def get(self, request):
        page = int(request.query_params.get("page", 1))
        per_page = int(request.query_params.get("page_size", 30))
        action = request.query_params.get("action", "")
        username = request.query_params.get("username", "")

        qs = AuditLog.objects.all()
        if action:
            qs = qs.filter(action=action)
        if username:
            qs = qs.filter(username__icontains=username)

        total = qs.count()
        qs = qs[(page - 1) * per_page: page * per_page]

        serializer = AuditLogSerializer(qs, many=True)
        return Response({
            "results": serializer.data,
            "count": total,
            "page": page,
            "page_size": per_page,
        })


# ==================== SMTP ====================

class SMTPConfigView(APIView):
    def get(self, request):
        config = SMTPConfig.objects.first()
        if not config:
            return Response(None)
        return Response({
            "host": config.host,
            "port": config.port,
            "use_tls": config.use_tls,
            "use_ssl": config.use_ssl,
            "username": config.username,
            "from_email": config.from_email,
            "from_name": config.from_name,
            "enabled": config.enabled,
        })

    def post(self, request):
        serializer = SMTPConfigSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        config, created = SMTPConfig.objects.update_or_create(
            id=1,
            defaults={
                "host": data["host"],
                "port": data.get("port", 587),
                "use_tls": data.get("use_tls", True),
                "use_ssl": data.get("use_ssl", False),
                "username": data.get("username", ""),
                "password": data.get("password", ""),
                "from_email": data["from_email"],
                "from_name": data.get("from_name", ""),
                "enabled": data.get("enabled", False),
            },
        )
        log_audit(request.user, "UPDATE", "SMTPConfig", "",
                  "Configuracion SMTP actualizada")
        return Response({"saved": True})


class SMTPTestView(APIView):
    def post(self, request):
        config = SMTPConfig.objects.first()
        if not config:
            return Response({"error": "No hay configuracion SMTP"}, status=400)
        # Simular prueba (implementar envio real despues)
        log_audit(request.user, "TEST_CONNECTION", "SMTP", "",
                  "Prueba de configuracion SMTP", success=True)
        return Response({"success": True, "message": "Prueba SMTP simulada (implementar envio real)"})


# ==================== USUARIOS DEL SISTEMA ====================

class SystemUserList(APIView):
    def get(self, request):
        profiles = UserProfile.objects.select_related("user", "role").all()
        serializer = UserProfileSerializer(profiles, many=True)
        return Response(serializer.data)

    def post(self, request):
        username = request.data.get("username")
        password = request.data.get("password")
        email = request.data.get("email", "")
        role_id = request.data.get("role_id")
        if not username or not password:
            return Response({"error": "username y password requeridos"}, status=400)
        if User.objects.filter(username=username).exists():
            return Response({"error": "Usuario ya existe"}, status=400)
        user = User.objects.create_user(username=username, password=password, email=email)
        profile = UserProfile.objects.create(user=user, role_id=role_id)
        log_audit(request.user, "CREATE", "SystemUser", username,
                  f"Usuario del sistema '{username}' creado")
        return Response(UserProfileSerializer(profile).data, status=status.HTTP_201_CREATED)


class SystemUserDetail(APIView):
    def put(self, request, user_id):
        try:
            profile = UserProfile.objects.select_related("user").get(user__id=user_id)
        except UserProfile.DoesNotExist:
            return Response({"error": "No encontrado"}, status=404)
        user = profile.user
        if "email" in request.data:
            user.email = request.data["email"]
        if "password" in request.data and request.data["password"]:
            user.set_password(request.data["password"])
        if "role_id" in request.data:
            profile.role_id = request.data["role_id"]
        if "is_active" in request.data:
            profile.is_active_ldap = request.data["is_active"]
            user.is_active = request.data["is_active"]
        if "username" in request.data:
            user.username = request.data["username"]
        user.save()
        profile.save()
        log_audit(request.user, "UPDATE", "SystemUser", user.username,
                  f"Usuario del sistema '{user.username}' actualizado")
        return Response(UserProfileSerializer(profile).data)

    def delete(self, request, user_id):
        try:
            profile = UserProfile.objects.select_related("user").get(user__id=user_id)
        except UserProfile.DoesNotExist:
            return Response({"error": "No encontrado"}, status=404)
        username = profile.user.username
        if profile.user == request.user:
            return Response({"error": "No puedes eliminarte a ti mismo"}, status=400)
        profile.user.delete()
        log_audit(request.user, "DELETE", "SystemUser", username,
                  f"Usuario del sistema '{username}' eliminado")
        return Response(status=status.HTTP_204_NO_CONTENT)


SYSTEM_PERMISSIONS = [
    {"key": "users.read", "label": "Leer usuarios", "group": "Usuarios"},
    {"key": "users.write", "label": "Crear/Editar/Eliminar usuarios", "group": "Usuarios"},
    {"key": "users.password", "label": "Cambiar contraseña de usuarios", "group": "Usuarios"},
    {"key": "users.toggle_status", "label": "Activar/Desactivar usuarios", "group": "Usuarios"},
    {"key": "groups.read", "label": "Leer grupos", "group": "Grupos"},
    {"key": "groups.write", "label": "Crear/Editar/Eliminar grupos", "group": "Grupos"},
    {"key": "computers.read", "label": "Leer equipos", "group": "Equipos"},
    {"key": "computers.write", "label": "Crear/Editar/Eliminar equipos", "group": "Equipos"},
    {"key": "ous.read", "label": "Leer unidades organizativas", "group": "Unidades Organizativas"},
    {"key": "ous.write", "label": "Crear/Editar/Eliminar unidades organizativas", "group": "Unidades Organizativas"},
    {"key": "servers.read", "label": "Leer servidores", "group": "Servidores"},
    {"key": "servers.write", "label": "Crear/Editar/Eliminar servidores", "group": "Servidores"},
    {"key": "solicitudes.read", "label": "Leer solicitudes", "group": "Solicitudes"},
    {"key": "solicitudes.write", "label": "Crear solicitudes", "group": "Solicitudes"},
    {"key": "solicitudes.execute", "label": "Ejecutar/Rechazar solicitudes", "group": "Solicitudes"},
    {"key": "dashboard.read", "label": "Ver dashboard", "group": "Dashboard"},
    {"key": "audit.read", "label": "Ver auditoría", "group": "Auditoría"},
    {"key": "smtp.read", "label": "Leer configuración SMTP", "group": "SMTP"},
    {"key": "smtp.write", "label": "Modificar configuración SMTP", "group": "SMTP"},
    {"key": "auth.config.read", "label": "Leer configuración de autenticación", "group": "Autenticación"},
    {"key": "auth.config.write", "label": "Modificar configuración de autenticación", "group": "Autenticación"},
    {"key": "system.users.read", "label": "Leer usuarios del sistema", "group": "Sistema"},
    {"key": "system.users.write", "label": "Crear/Editar/Eliminar usuarios del sistema", "group": "Sistema"},
    {"key": "system.roles.read", "label": "Leer roles del sistema", "group": "Sistema"},
    {"key": "system.roles.write", "label": "Crear/Editar/Eliminar roles del sistema", "group": "Sistema"},
]


class SystemPermissionsList(APIView):
    def get(self, request):
        return Response(SYSTEM_PERMISSIONS)


class SystemRoleList(APIView):
    def get(self, request):
        roles = SystemRole.objects.all()
        serializer = SystemRoleSerializer(roles, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = SystemRoleSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        perms = data.get("permissions", [])
        if isinstance(perms, str):
            import json
            try:
                perms = json.loads(perms)
            except (json.JSONDecodeError, TypeError):
                perms = [perms] if perms else []
        if not isinstance(perms, list):
            perms = [perms] if perms else []
        role = SystemRole.objects.create(
            name=data["name"],
            description=data.get("description", ""),
            permissions=perms,
            is_default=data.get("is_default", False),
        )
        log_audit(request.user, "CREATE", "SystemRole", role.name,
                  f"Rol '{role.name}' creado")
        return Response(SystemRoleSerializer(role).data, status=status.HTTP_201_CREATED)


class SystemRoleDetail(APIView):
    def put(self, request, role_id):
        try:
            role = SystemRole.objects.get(id=role_id)
        except SystemRole.DoesNotExist:
            return Response({"error": "No encontrado"}, status=404)
        if "name" in request.data:
            role.name = request.data["name"]
        if "description" in request.data:
            role.description = request.data["description"]
        if "permissions" in request.data:
            perms = request.data["permissions"]
            if isinstance(perms, str):
                import json
                try:
                    perms = json.loads(perms)
                except (json.JSONDecodeError, TypeError):
                    perms = [perms] if perms else []
            if not isinstance(perms, list):
                perms = [perms] if perms else []
            role.permissions = perms
        if "is_default" in request.data:
            role.is_default = request.data["is_default"]
        role.save()
        log_audit(request.user, "UPDATE", "SystemRole", role.name,
                  f"Rol '{role.name}' actualizado")
        return Response(SystemRoleSerializer(role).data)

    def delete(self, request, role_id):
        try:
            role = SystemRole.objects.get(id=role_id)
        except SystemRole.DoesNotExist:
            return Response({"error": "No encontrado"}, status=404)
        log_audit(request.user, "DELETE", "SystemRole", role.name,
                  f"Rol '{role.name}' eliminado")
        role.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== MAPEO GRUPOS LDAP A ROLES ====================

class LDAPRoleMappingList(APIView):
    def get(self, request):
        mappings = LDAPRoleMapping.objects.select_related("ldap_server", "role").all()
        return Response([{
            "id": m.id,
            "ldap_server_id": m.ldap_server_id,
            "ldap_server_name": m.ldap_server.name,
            "group_dn": m.group_dn,
            "role_id": m.role_id,
            "role_name": m.role.name,
            "priority": m.priority,
        } for m in mappings])

    def post(self, request):
        ldap_server_id = request.data.get("ldap_server_id")
        group_dn = request.data.get("group_dn", "").strip()
        role_id = request.data.get("role_id")
        priority = request.data.get("priority", 0)
        if not ldap_server_id or not group_dn or not role_id:
            return Response({"error": "ldap_server_id, group_dn y role_id son requeridos"}, status=400)
        try:
            srv = LDAPServerModel.objects.get(id=ldap_server_id)
            role = SystemRole.objects.get(id=role_id)
        except (LDAPServerModel.DoesNotExist, SystemRole.DoesNotExist):
            return Response({"error": "Servidor o rol no encontrado"}, status=404)
        mapping, created = LDAPRoleMapping.objects.get_or_create(
            ldap_server=srv, group_dn=group_dn,
            defaults={"role": role, "priority": priority},
        )
        if not created:
            mapping.role = role
            mapping.priority = priority
            mapping.save()
        log_audit(request.user, "CREATE", "LDAPRoleMapping", group_dn,
                  f"Mapeo grupo->rol creado: {group_dn} -> {role.name}")
        return Response({
            "id": mapping.id, "ldap_server_id": srv.id,
            "ldap_server_name": srv.name, "group_dn": group_dn,
            "role_id": role.id, "role_name": role.name, "priority": priority,
        }, status=201)


class LDAPRoleMappingDetail(APIView):
    def delete(self, request, mapping_id):
        try:
            m = LDAPRoleMapping.objects.get(id=mapping_id)
        except LDAPRoleMapping.DoesNotExist:
            return Response({"error": "No encontrado"}, status=404)
        log_audit(request.user, "DELETE", "LDAPRoleMapping", m.group_dn,
                  f"Mapeo grupo->rol eliminado: {m.group_dn}")
        m.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ==================== AUTENTICACION ====================

class AuthConfigView(APIView):
    def get(self, request):
        config = AuthConfig.objects.first()
        if not config:
            config = AuthConfig.objects.create(mode="db")
        return Response({
            "mode": config.mode,
            "ldap_server_id": config.ldap_server_id if config.ldap_server else None,
            "ldap_bind_template": config.ldap_bind_template,
        })

    def put(self, request):
        config = AuthConfig.objects.first()
        if not config:
            config = AuthConfig.objects.create(mode="db")
        data = request.data
        config.mode = data.get("mode", config.mode)
        ldap_server_id = data.get("ldap_server_id")
        if ldap_server_id:
            try:
                config.ldap_server = LDAPServerModel.objects.get(id=ldap_server_id)
            except LDAPServerModel.DoesNotExist:
                pass
        else:
            config.ldap_server = None
        config.ldap_bind_template = data.get("ldap_bind_template", config.ldap_bind_template)
        config.save()
        cache.delete(AUTH_CACHE_KEY)
        log_audit(request.user, "UPDATE", "AuthConfig", "config",
                  f"Configuracion de autenticacion actualizada: modo={config.mode}")
        return Response({
            "mode": config.mode,
            "ldap_server_id": config.ldap_server_id if config.ldap_server else None,
            "ldap_bind_template": config.ldap_bind_template,
        })


# ==================== SOLICITUDES ====================

class SolicitudList(APIView):
    def get(self, request):
        tipo = request.query_params.get("tipo", "")
        estado = request.query_params.get("estado", "")
        qs = Solicitud.objects.all()
        if tipo:
            qs = qs.filter(tipo=tipo)
        if estado:
            qs = qs.filter(estado=estado)
        serializer = SolicitudSerializer(qs, many=True)
        metrics = {
            "total": Solicitud.objects.count(),
            "altas": Solicitud.objects.filter(tipo="ALTA").count(),
            "bajas": Solicitud.objects.filter(tipo="BAJA").count(),
            "pendientes": Solicitud.objects.filter(estado="PENDIENTE").count(),
            "ejecutadas": Solicitud.objects.filter(estado="EJECUTADA").count(),
        }
        return Response({
            "solicitudes": serializer.data,
            "metrics": metrics,
        })

    def post(self, request):
        data = request.data
        solicitud = Solicitud.objects.create(
            tipo=data["tipo"],
            nombre=data["nombre"],
            apellidos=data["apellidos"],
            username=data["username"],
            email=data.get("email"),
            telefono=data.get("telefono", ""),
            cargo=data.get("cargo", ""),
            dominios=data.get("dominios", []),
            ou=data.get("ou", ""),
        )
        log_audit(request.user, "CREATE", "Solicitud", str(solicitud.id),
                  f"Solicitud {solicitud.get_tipo_display()} creada: {solicitud.nombre} {solicitud.apellidos}")
        return Response(SolicitudSerializer(solicitud).data, status=status.HTTP_201_CREATED)


class SolicitudDetail(APIView):
    def post(self, request, solicitud_id):
        try:
            solicitud = Solicitud.objects.get(id=solicitud_id)
        except Solicitud.DoesNotExist:
            return Response({"error": "No encontrada"}, status=404)
        accion = request.data.get("accion", "")
        if accion == "ejecutar":
            solicitud.estado = "EJECUTADA"
            solicitud.ejecutado_por = request.user
            solicitud.ejecutado_at = timezone.now()
            solicitud.observaciones = request.data.get("observaciones", "")
            solicitud.save()
            log_audit(request.user, "UPDATE", "Solicitud", str(solicitud.id),
                      f"Solicitud {solicitud.get_tipo_display()} ejecutada: {solicitud.nombre} {solicitud.apellidos}")
        elif accion == "rechazar":
            solicitud.estado = "RECHAZADA"
            solicitud.observaciones = request.data.get("observaciones", "")
            solicitud.save()
            log_audit(request.user, "UPDATE", "Solicitud", str(solicitud.id),
                      f"Solicitud {solicitud.get_tipo_display()} rechazada: {solicitud.nombre} {solicitud.apellidos}")
        else:
            return Response({"error": "Accion no valida"}, status=400)
        return Response(SolicitudSerializer(solicitud).data)


# ==================== DASHBOARD / METRICAS ====================

class DashboardMetrics(APIView):
    def get(self, request):
        from infrastructure.persistence.models import LDAPServerModel
        servers = LDAPServerModel.objects.all()
        total_servers = servers.count()
        online_count = 0
        server_list = []
        conn = _get_connector()
        for s in servers:
            server_entity = _repo.find_by_id(s.id)
            ok = server_entity and conn.test_connection(server_entity)
            if ok:
                online_count += 1

            users_total = users_enabled = users_disabled = 0
            if ok and server_entity and server_entity.base_dn:
                try:
                    conn.connect(server_entity)
                    stats = conn.get_user_stats(server_entity.base_dn, "(objectClass=user)")
                    users_total = stats["total"]
                    users_enabled = stats["enabled"]
                    users_disabled = stats["disabled"]
                except Exception:
                    pass

            server_list.append({
                "id": s.id, "name": s.name, "host": s.host, "port": s.port,
                "status": "online" if ok else "offline",
                "user_stats": {
                    "total": users_total,
                    "enabled": users_enabled,
                    "disabled": users_disabled,
                },
            })

        total_system_users = User.objects.count()
        events_24h = AuditLog.objects.filter(
            created_at__gte=timezone.now() - timedelta(hours=24)).count()

        return Response({
            "total_servers": total_servers,
            "online_servers": online_count,
            "offline_servers": total_servers - online_count,
            "total_system_users": total_system_users,
            "events_24h": events_24h,
            "servers": server_list,
        })
