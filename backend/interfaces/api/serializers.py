from rest_framework import serializers


class LDAPServerSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(max_length=255)
    host = serializers.CharField(max_length=255)
    port = serializers.IntegerField(default=389)
    protocol = serializers.ChoiceField(choices=["ldap", "ldaps"])
    base_dn = serializers.CharField(max_length=512)
    bind_dn = serializers.CharField(max_length=512)
    bind_password = serializers.CharField(max_length=512, write_only=True)
    timeout = serializers.IntegerField(default=10)
    use_tls = serializers.BooleanField(default=False)
    version = serializers.IntegerField(default=3)
    description = serializers.CharField(allow_blank=True, default="")
    status = serializers.CharField(read_only=True)
    attribute_mappings = serializers.JSONField(required=False)


class LDAPUserSerializer(serializers.Serializer):
    dn = serializers.CharField()
    cn = serializers.CharField()
    uid = serializers.CharField()
    sn = serializers.CharField()
    givenName = serializers.CharField(source="given_name")
    mail = serializers.CharField(allow_null=True)
    telephone = serializers.CharField(allow_null=True)
    mobile = serializers.CharField(allow_null=True)
    department = serializers.CharField(allow_null=True)
    company = serializers.CharField(allow_null=True)
    ci = serializers.CharField(allow_null=True)
    cargo = serializers.CharField(allow_null=True)
    description = serializers.CharField(allow_null=True)
    enabled = serializers.BooleanField()
    memberOf = serializers.ListField(child=serializers.CharField(), source="member_of")
    displayName = serializers.CharField(source="display_name", read_only=True)


class LDAPGroupSerializer(serializers.Serializer):
    dn = serializers.CharField()
    cn = serializers.CharField()
    description = serializers.CharField(allow_null=True)
    members = serializers.ListField(child=serializers.CharField())


class OUSerializer(serializers.Serializer):
    dn = serializers.CharField()
    name = serializers.CharField()
    description = serializers.CharField(allow_null=True)
    parentDn = serializers.CharField(allow_null=True, source="parent_dn")


# -- Auditoria --
class AuditLogSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    username = serializers.CharField()
    action = serializers.ChoiceField(choices=[
        "CREATE","UPDATE","DELETE","LOGIN","LOGOUT","CONNECT","DISCONNECT",
        "PASSWORD_CHANGE","USER_ENABLE","USER_DISABLE","TEST_CONNECTION","EXPORT","OTHER",
    ])
    target_type = serializers.CharField(required=False, allow_blank=True)
    target_id = serializers.CharField(required=False, allow_blank=True)
    details = serializers.CharField(required=False, allow_blank=True)
    ip_address = serializers.CharField(required=False, allow_null=True)
    ldap_server = serializers.CharField(required=False, allow_blank=True)
    success = serializers.BooleanField(default=True)
    timestamp = serializers.DateTimeField(source="created_at", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


# -- SMTP --
class SMTPConfigSerializer(serializers.Serializer):
    host = serializers.CharField(max_length=255)
    port = serializers.IntegerField(default=587)
    use_tls = serializers.BooleanField(default=True)
    use_ssl = serializers.BooleanField(default=False)
    username = serializers.CharField(required=False, allow_blank=True)
    password = serializers.CharField(required=False, allow_blank=True, write_only=True)
    from_email = serializers.EmailField()
    from_name = serializers.CharField(required=False, allow_blank=True)
    enabled = serializers.BooleanField(default=False)


# -- Roles / Permisos del sistema --
class SystemRoleSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    name = serializers.CharField(max_length=100)
    description = serializers.CharField(required=False, allow_blank=True)
    permissions = serializers.JSONField(default=list)
    is_default = serializers.BooleanField(default=False)
    created_at = serializers.DateTimeField(read_only=True)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        perms = data.get("permissions")
        if isinstance(perms, str):
            import json
            try:
                data["permissions"] = json.loads(perms)
            except (json.JSONDecodeError, TypeError):
                data["permissions"] = [perms] if perms else []
        if not isinstance(data["permissions"], list):
            data["permissions"] = [data["permissions"]] if data["permissions"] else []
        return data


class UserProfileSerializer(serializers.Serializer):
    id = serializers.IntegerField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username")
    email = serializers.EmailField(source="user.email", allow_blank=True)
    role_id = serializers.IntegerField(source="role.id", allow_null=True)
    role_name = serializers.CharField(source="role.name", read_only=True, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    is_active = serializers.BooleanField(source="is_active_ldap")
    is_superuser = serializers.BooleanField(source="user.is_superuser", read_only=True)
    last_login = serializers.DateTimeField(source="user.last_login", read_only=True)
    created_at = serializers.DateTimeField(read_only=True)


class ChangePasswordSerializer(serializers.Serializer):
    new_password = serializers.CharField(min_length=4)


class AuthConfigSerializer(serializers.Serializer):
    mode = serializers.ChoiceField(choices=["db", "ldap", "both"])
    ldap_server_id = serializers.CharField(allow_null=True, required=False)
    ldap_bind_template = serializers.CharField(allow_blank=True, required=False, default="")


class SolicitudSerializer(serializers.Serializer):
    id = serializers.IntegerField(read_only=True)
    tipo = serializers.ChoiceField(choices=["ALTA", "BAJA"])
    nombre = serializers.CharField()
    apellidos = serializers.CharField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_null=True, required=False)
    telefono = serializers.CharField(allow_blank=True, required=False, default="")
    cargo = serializers.CharField(allow_blank=True, required=False, default="")
    password = serializers.CharField(write_only=True, required=False, allow_blank=True, default="")
    dominios = serializers.JSONField(default=list)
    ou = serializers.CharField(allow_blank=True, required=False, default="")
    estado = serializers.ChoiceField(choices=["PENDIENTE", "EJECUTADA", "RECHAZADA"], read_only=True)
    ejecutado_por = serializers.CharField(read_only=True, allow_null=True)
    ejecutado_at = serializers.DateTimeField(read_only=True, allow_null=True)
    observaciones = serializers.CharField(allow_blank=True, required=False, default="")
    created_at = serializers.DateTimeField(read_only=True)


class SolicitudMetricsSerializer(serializers.Serializer):
    total = serializers.IntegerField()
    altas = serializers.IntegerField()
    bajas = serializers.IntegerField()
    pendientes = serializers.IntegerField()
    ejecutadas = serializers.IntegerField()


class ServerMetricsSerializer(serializers.Serializer):
    total_servers = serializers.IntegerField()
    online_servers = serializers.IntegerField()
    offline_servers = serializers.IntegerField()
    total_users = serializers.IntegerField()
    total_audit_events = serializers.IntegerField()
    recent_events = serializers.ListField(child=AuditLogSerializer())
