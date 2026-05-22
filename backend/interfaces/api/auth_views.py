from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import serializers

from django.core.cache import cache

from ldap3 import Server, Connection, ALL
from ldap3.core.exceptions import LDAPException, LDAPBindError
from ldap3.utils.conv import escape_filter_chars

from infrastructure.persistence.models import AuditLog, UserProfile, AuthConfig, LDAPServerModel, LDAPRoleMapping


def _log(user, action, details="", success=True):
    if user and user.is_authenticated:
        AuditLog.objects.create(
            user=user, username=user.username,
            action=action, details=details, success=success,
        )


def _escape(s):
    return escape_filter_chars(s)


def _ldap_authenticate(username, password):
    """Try LDAP auth using AuthConfig. Returns Django user or None."""
    try:
        config = cache.get_or_set("auth_config", lambda: AuthConfig.objects.first(), 60)
        if not config or config.mode == "db":
            return None
        if not config.ldap_server:
            return None
        srv = config.ldap_server
        template = config.ldap_bind_template
        if not template:
            return None
        bind_dn = template.replace("{username}", username)
        server = Server(srv.host, port=srv.port, use_ssl=srv.protocol == "ldaps", connect_timeout=10)
        conn = Connection(server, user=bind_dn, password=password, auto_bind=True, raise_exceptions=True)
    except Exception:
        return None

    member_of = []
    if srv.base_dn:
        try:
            conn.search(
                search_base=srv.base_dn,
                search_filter=f"(sAMAccountName={_escape(username)})",
                search_scope="SUBTREE",
                attributes=["memberOf"],
                size_limit=1,
            )
            if conn.entries:
                entry = conn.entries[0]
                raw = entry.get("memberOf", [])
                if raw:
                    member_of = [str(m) for m in (raw if isinstance(raw, list) else [raw])]
        except Exception:
            pass
    try:
        conn.unbind()
    except Exception:
        pass

    user, _ = User.objects.get_or_create(username=username)
    profile, _ = UserProfile.objects.get_or_create(user=user)

    if member_of:
        mappings = LDAPRoleMapping.objects.filter(
            ldap_server=srv, group_dn__in=member_of,
        ).select_related("role").order_by("priority")
        for mapping in mappings:
            if profile.role_id != mapping.role_id:
                profile.role = mapping.role
                profile.save()
            break

    return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField()


class LoginView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        username = serializer.validated_data["username"]
        password = serializer.validated_data["password"]

        config = AuthConfig.objects.first()
        mode = config.mode if config else "db"

        user = None
        if mode in ("db", "both"):
            user = authenticate(username=username, password=password)
        if not user and mode in ("ldap", "both"):
            user = _ldap_authenticate(username, password)

        if user is None:
            _log(None, "LOGIN", f"Intento fallido: {username}", False)
            return Response(
                {"error": "Credenciales inválidas"},
                status=status.HTTP_401_UNAUTHORIZED,
            )
        login(request, user)
        _log(user, "LOGIN", f"Inicio sesion: {user.username}")
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.last_login_ip = request.META.get("REMOTE_ADDR")
        profile.save()
        role_name = profile.role.name if profile and profile.role else None
        permissions = profile.role.permissions if profile and profile.role else []
        return Response({
            "id": user.id,
            "username": user.username,
            "email": user.email,
            "role": role_name,
            "permissions": permissions,
            "is_superuser": user.is_superuser,
        })


class LogoutView(APIView):
    def post(self, request):
        _log(request.user, "LOGOUT", f"Cierre sesion: {request.user.username}")
        logout(request)
        return Response({"ok": True})


class MeView(APIView):
    authentication_classes = []
    permission_classes = []

    def get(self, request):
        if not request.user.is_authenticated:
            return Response({"authenticated": False})
        profile = UserProfile.objects.filter(user=request.user).first()
        role_name = profile.role.name if profile and profile.role else None
        permissions = profile.role.permissions if profile and profile.role else []
        return Response({
            "authenticated": True,
            "id": request.user.id,
            "username": request.user.username,
            "email": request.user.email,
            "role": role_name,
            "permissions": permissions,
            "is_superuser": request.user.is_superuser,
        })


class RegisterView(APIView):
    authentication_classes = []
    permission_classes = []

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if User.objects.filter(username=serializer.validated_data["username"]).exists():
            return Response({"error": "El usuario ya existe"}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.create_user(
            username=serializer.validated_data["username"],
            password=serializer.validated_data["password"],
        )
        UserProfile.objects.create(user=user)
        return Response({
            "id": user.id,
            "username": user.username,
        }, status=status.HTTP_201_CREATED)
