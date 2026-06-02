import client from './client';

export const brandingApi = {
  get: () => client.get('/admin/branding').then(r => r.data),
  update: (data) => client.put('/admin/branding', data).then(r => r.data),
  uploadLogo: (file) => {
    const fd = new FormData(); fd.append('logo', file);
    return client.post('/admin/branding/logo', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  uploadFavicon: (file) => {
    const fd = new FormData(); fd.append('favicon', file);
    return client.post('/admin/branding/favicon', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  deleteLogo: () => client.delete('/admin/branding/logo').then(r => r.data),
  deleteFavicon: () => client.delete('/admin/branding/favicon').then(r => r.data)
};
