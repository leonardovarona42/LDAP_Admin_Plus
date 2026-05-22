import axios from 'axios';

const API_BASE = '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      const url = error.config?.url || '';
      if (!url.startsWith('/auth/')) {
        localStorage.removeItem('user');
        window.dispatchEvent(new Event('auth:logout'));
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  login: (username, password) => api.post('/auth/login/', { username, password }),
  logout: () => api.post('/auth/logout/'),
  me: () => api.get('/auth/me/'),
  register: (username, password) => api.post('/auth/register/', { username, password }),
  getConfig: () => api.get('/auth/config/'),
  saveConfig: (data) => api.put('/auth/config/', data),
};

export const serverService = {
  list: () => api.get('/servers/'),
  get: (id) => api.get(`/servers/${id}/`),
  create: (data) => api.post('/servers/', data),
  update: (id, data) => api.put(`/servers/${id}/`, data),
  remove: (id) => api.delete(`/servers/${id}/`),
  connect: (id) => api.post(`/servers/${id}/connect/`),
  disconnect: (id) => api.post(`/servers/${id}/disconnect/`),
  testConnection: (data) => api.post('/servers/test-connection/', data),
  getStats: (id) => api.get(`/servers/${id}/stats/`),
};

export const userService = {
  list: (serverId, params) =>
    api.get(`/servers/${serverId}/users/`, { params }),
  create: (serverId, data) => api.post(`/servers/${serverId}/users/`, data),
  update: (serverId, dn, data) => api.put(`/servers/${serverId}/users/${encodeURIComponent(dn)}/`, data),
  delete: (serverId, dn) => api.delete(`/servers/${serverId}/users/${encodeURIComponent(dn)}/`),
  changePassword: (serverId, dn, newPassword) =>
    api.post(`/servers/${serverId}/users/${encodeURIComponent(dn)}/password/`, { new_password: newPassword }),
  toggleStatus: (serverId, dn, enable) =>
    api.post(`/servers/${serverId}/users/${encodeURIComponent(dn)}/toggle-status/`, { enable }),
};

export const groupService = {
  list: (serverId, baseDn) =>
    api.get(`/servers/${serverId}/groups/`, { params: { base_dn: baseDn } }),
};

export const ouService = {
  list: (serverId, baseDn) =>
    api.get(`/servers/${serverId}/ous/`, { params: { base_dn: baseDn } }),
};

export const computerService = {
  list: (serverId, params) =>
    api.get(`/servers/${serverId}/computers/`, { params }),
};

export const auditService = {
  list: (params) => api.get('/audit/', { params }),
};

export const smtpService = {
  get: () => api.get('/smtp/'),
  save: (data) => api.post('/smtp/', data),
  test: () => api.post('/smtp/test/'),
};

export const systemService = {
  listUsers: () => api.get('/system/users/'),
  createUser: (data) => api.post('/system/users/', data),
  updateUser: (id, data) => api.put(`/system/users/${id}/`, data),
  deleteUser: (id) => api.delete(`/system/users/${id}/`),
  listRoles: () => api.get('/system/roles/'),
  createRole: (data) => api.post('/system/roles/', data),
  updateRole: (id, data) => api.put(`/system/roles/${id}/`, data),
  deleteRole: (id) => api.delete(`/system/roles/${id}/`),
  listPermissions: () => api.get('/system/permissions/'),
};

export const solicitudService = {
  list: (params) => api.get('/solicitudes/', { params }),
  create: (data) => api.post('/solicitudes/', data),
  execute: (id, data) => api.post(`/solicitudes/${id}/`, data),
};

export const ldapRoleMappingService = {
  list: () => api.get('/ldap-role-mappings/'),
  create: (data) => api.post('/ldap-role-mappings/', data),
  remove: (id) => api.delete(`/ldap-role-mappings/${id}/`),
};

export const dashboardService = {
  metrics: () => api.get('/dashboard/metrics/'),
};

export default api;
