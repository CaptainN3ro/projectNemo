import client from './client';

export const adminUsersApi = {
  getAll: () => client.get('/admin/users').then(r => r.data),
  create: (data) => client.post('/admin/users', data).then(r => r.data),
  update: (id, data) => client.put(`/admin/users/${id}`, data).then(r => r.data),
  deactivate: (id) => client.delete(`/admin/users/${id}`).then(r => r.data),
  permanentDelete: (id) => client.delete(`/admin/users/${id}/permanent`).then(r => r.data)
};

export const adminPluginsApi = {
  getAll: () => client.get('/admin/plugins').then(r => r.data),
  install: (file) => {
    const fd = new FormData(); fd.append('plugin', file);
    return client.post('/admin/plugins/install', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  toggle: (id) => client.put(`/admin/plugins/${id}/toggle`).then(r => r.data),
  uninstall: (id) => client.delete(`/admin/plugins/${id}`).then(r => r.data)
};

export const adminSmtpApi = {
  get: () => client.get('/admin/smtp').then(r => r.data),
  update: (data) => client.put('/admin/smtp', data).then(r => r.data),
  test: () => client.post('/admin/smtp/test').then(r => r.data)
};

export const adminSettingsApi = {
  get: () => client.get('/admin/settings').then(r => r.data),
  update: (data) => client.put('/admin/settings', data).then(r => r.data)
};

export const authApi = {
  login: (email, password) => client.post('/auth/login', { email, password }).then(r => r.data),
  register: (data) => client.post('/auth/register', data).then(r => r.data),
  refresh: (refreshToken) => client.post('/auth/refresh', { refreshToken }).then(r => r.data),
  me: () => client.get('/auth/me').then(r => r.data),
  changePassword: (data) => client.put('/auth/password', data).then(r => r.data),
  changeEmail: (data) => client.put('/auth/email', data).then(r => r.data),
  deleteAccount: (currentPassword) => client.delete('/auth/account', { data: { currentPassword } }).then(r => r.data),
  forgotPassword: (email) => client.post('/auth/forgot-password', { email }).then(r => r.data),
  resetPassword: (token, password) => client.post('/auth/reset-password', { token, password }).then(r => r.data),
  verifyEmail: (token) => client.get(`/auth/verify-email?token=${token}`).then(r => r.data),
  publicSettings: () => client.get('/auth/public-settings').then(r => r.data)
};
