from django.urls import path, re_path
from . import views
from . import auth_views

urlpatterns = [
    path("auth/login/", auth_views.LoginView.as_view(), name="auth-login"),
    path("auth/logout/", auth_views.LogoutView.as_view(), name="auth-logout"),
    path("auth/me/", auth_views.MeView.as_view(), name="auth-me"),
    path("auth/register/", auth_views.RegisterView.as_view(), name="auth-register"),

    # Servidores LDAP
    path("servers/", views.ServerList.as_view(), name="server-list"),
    path("servers/<str:server_id>/", views.ServerDetail.as_view(), name="server-detail"),
    path("servers/<str:server_id>/connect/", views.ServerConnect.as_view(), name="server-connect"),
    path("servers/<str:server_id>/disconnect/", views.ServerDisconnect.as_view(), name="server-disconnect"),
    path("servers/<str:server_id>/users/", views.UserList.as_view(), name="user-list"),
    re_path(r"^servers/(?P<server_id>[^/]+)/users/(?P<dn>.+)/password/$",
            views.UserPasswordChange.as_view(), name="user-password"),
    re_path(r"^servers/(?P<server_id>[^/]+)/users/(?P<dn>.+)/toggle-status/$",
            views.UserToggleStatus.as_view(), name="user-toggle-status"),
    re_path(r"^servers/(?P<server_id>[^/]+)/users/(?P<dn>.+)/$",
            views.UserDetail.as_view(), name="user-detail"),
    path("servers/<str:server_id>/groups/", views.GroupList.as_view(), name="group-list"),
    path("servers/<str:server_id>/ous/", views.OUList.as_view(), name="ou-list"),
    path("servers/<str:server_id>/computers/", views.ComputerList.as_view(), name="computer-list"),

    # Test conexion (sin guardar)
    path("servers/<str:server_id>/stats/", views.ServerStats.as_view(), name="server-stats"),
    path("servers/test-connection/", views.TestConnection.as_view(), name="test-connection"),

    # Auditoria
    path("audit/", views.AuditLogList.as_view(), name="audit-list"),

    # Autenticacion
    path("auth/config/", views.AuthConfigView.as_view(), name="auth-config"),

    # SMTP
    path("smtp/", views.SMTPConfigView.as_view(), name="smtp-config"),
    path("smtp/test/", views.SMTPTestView.as_view(), name="smtp-test"),

    # Usuarios del sistema
    path("system/users/", views.SystemUserList.as_view(), name="system-user-list"),
    path("system/users/<int:user_id>/", views.SystemUserDetail.as_view(), name="system-user-detail"),
    path("system/permissions/", views.SystemPermissionsList.as_view(), name="system-permissions"),
    path("system/roles/", views.SystemRoleList.as_view(), name="system-role-list"),
    path("system/roles/<int:role_id>/", views.SystemRoleDetail.as_view(), name="system-role-detail"),

    # Mapeo de grupos LDAP a roles
    path("ldap-role-mappings/", views.LDAPRoleMappingList.as_view(), name="ldap-role-mapping-list"),
    path("ldap-role-mappings/<int:mapping_id>/", views.LDAPRoleMappingDetail.as_view(), name="ldap-role-mapping-detail"),

    # Solicitudes
    path("solicitudes/", views.SolicitudList.as_view(), name="solicitud-list"),
    path("solicitudes/<int:solicitud_id>/", views.SolicitudDetail.as_view(), name="solicitud-detail"),

    # Dashboard
    path("dashboard/metrics/", views.DashboardMetrics.as_view(), name="dashboard-metrics"),
]
