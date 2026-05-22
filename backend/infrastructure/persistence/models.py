from django.db import models
from django.contrib.auth.models import User


class LDAPServerModel(models.Model):
    id = models.CharField(max_length=64, primary_key=True)
    name = models.CharField(max_length=255)
    host = models.CharField(max_length=255)
    port = models.IntegerField(default=389)
    protocol = models.CharField(max_length=5, default="ldap")
    base_dn = models.CharField(max_length=512)
    bind_dn = models.CharField(max_length=512)
    bind_password = models.CharField(max_length=512)
    timeout = models.IntegerField(default=10)
    use_tls = models.BooleanField(default=False)
    version = models.IntegerField(default=3)
    description = models.TextField(blank=True, default="")
    enabled = models.BooleanField(default=True)
    attribute_mappings = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ldap_servers"


class AuditLog(models.Model):
    ACTION_CHOICES = [
        ("CREATE", "Creacion"),
        ("UPDATE", "Actualizacion"),
        ("DELETE", "Eliminacion"),
        ("LOGIN", "Inicio sesion"),
        ("LOGOUT", "Cierre sesion"),
        ("CONNECT", "Conexion LDAP"),
        ("DISCONNECT", "Desconexion LDAP"),
        ("PASSWORD_CHANGE", "Cambio contrasenia"),
        ("USER_ENABLE", "Habilitar usuario"),
        ("USER_DISABLE", "Deshabilitar usuario"),
        ("TEST_CONNECTION", "Prueba conexion"),
        ("EXPORT", "Exportacion"),
        ("OTHER", "Otro"),
    ]

    id = models.AutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    username = models.CharField(max_length=150)
    action = models.CharField(max_length=30, choices=ACTION_CHOICES)
    target_type = models.CharField(max_length=100, blank=True, default="")
    target_id = models.CharField(max_length=512, blank=True, default="")
    details = models.TextField(blank=True, default="")
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    ldap_server = models.CharField(max_length=255, blank=True, default="")
    success = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "audit_log"
        ordering = ["-created_at"]


class SMTPConfig(models.Model):
    id = models.AutoField(primary_key=True)
    host = models.CharField(max_length=255)
    port = models.IntegerField(default=587)
    use_tls = models.BooleanField(default=True)
    use_ssl = models.BooleanField(default=False)
    username = models.CharField(max_length=255, blank=True, default="")
    password = models.CharField(max_length=512, blank=True, default="")
    from_email = models.EmailField(max_length=255)
    from_name = models.CharField(max_length=255, blank=True, default="")
    enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "smtp_config"


class SystemRole(models.Model):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, default="")
    permissions = models.JSONField(default=list)
    is_default = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "system_roles"


class LDAPRoleMapping(models.Model):
    ldap_server = models.ForeignKey(
        LDAPServerModel, on_delete=models.CASCADE,
        help_text="Servidor LDAP donde existe el grupo",
    )
    group_dn = models.CharField(
        max_length=512,
        help_text="DN completo del grupo LDAP/AD (ej: CN=Admin,OU=Groups,DC=...)",
    )
    role = models.ForeignKey(
        SystemRole, on_delete=models.CASCADE,
        help_text="Rol del sistema a asignar",
    )
    priority = models.IntegerField(default=0, help_text="Menor número = mayor prioridad")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ldap_role_mappings"
        ordering = ["priority"]
        unique_together = [("ldap_server", "group_dn")]


class AuthConfig(models.Model):
    MODE_CHOICES = [
        ("db", "Solo base de datos"),
        ("ldap", "Solo LDAP"),
        ("both", "Base de datos + LDAP"),
    ]
    id = models.AutoField(primary_key=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default="db")
    ldap_server = models.ForeignKey(
        LDAPServerModel, on_delete=models.SET_NULL, null=True, blank=True,
        help_text="Servidor LDAP para autenticación",
    )
    ldap_bind_template = models.CharField(
        max_length=512, blank=True, default="",
        help_text="Ej: {username}@domain.com o CN={username},OU=Users,DC=...",
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "auth_config"


class Solicitud(models.Model):
    TIPO_CHOICES = [("ALTA", "Alta"), ("BAJA", "Baja")]
    ESTADO_CHOICES = [("PENDIENTE", "Pendiente"), ("EJECUTADA", "Ejecutada"), ("RECHAZADA", "Rechazada")]

    id = models.AutoField(primary_key=True)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    nombre = models.CharField(max_length=255)
    apellidos = models.CharField(max_length=255)
    username = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, blank=True, null=True)
    telefono = models.CharField(max_length=50, blank=True, default="")
    cargo = models.CharField(max_length=255, blank=True, default="")
    dominios = models.JSONField(default=list)
    ou = models.CharField(max_length=512, blank=True, default="")
    estado = models.CharField(max_length=20, choices=ESTADO_CHOICES, default="PENDIENTE")
    ejecutado_por = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    ejecutado_at = models.DateTimeField(null=True, blank=True)
    observaciones = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "solicitudes"
        ordering = ["-created_at"]


class UserProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="profile")
    role = models.ForeignKey(SystemRole, on_delete=models.SET_NULL, null=True, blank=True)
    phone = models.CharField(max_length=50, blank=True, default="")
    is_active_ldap = models.BooleanField(default=True)
    last_login_ip = models.GenericIPAddressField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "user_profiles"
