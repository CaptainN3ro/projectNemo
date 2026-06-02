import client from './client';

export const petsApi = {
  getAll: () => client.get('/pets').then(r => r.data),
  getOne: (id) => client.get(`/pets/${id}`).then(r => r.data),
  create: (data) => client.post('/pets', data).then(r => r.data),
  update: (id, data) => client.put(`/pets/${id}`, data).then(r => r.data),
  delete: (id) => client.delete(`/pets/${id}`).then(r => r.data),
  uploadPhoto: (id, file) => {
    const fd = new FormData(); fd.append('photo', file);
    return client.post(`/pets/${id}/photo`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  }
};

export const vetVisitsApi = {
  getAll: (petId) => client.get(`/pets/${petId}/vet-visits`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/vet-visits`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/vet-visits/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/vet-visits/${id}`).then(r => r.data)
};

export const medicationsApi = {
  getAll: (petId) => client.get(`/pets/${petId}/medications`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/medications`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/medications/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/medications/${id}`).then(r => r.data)
};

export const bloodWorkApi = {
  getAll: (petId) => client.get(`/pets/${petId}/blood-work`).then(r => r.data),
  upload: (petId, file, meta) => {
    const fd = new FormData(); fd.append('file', file);
    Object.entries(meta).forEach(([k, v]) => fd.append(k, v));
    return client.post(`/pets/${petId}/blood-work`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  download: (petId, id) => `${import.meta.env.VITE_API_URL || ''}/api/pets/${petId}/blood-work/${id}/download`,
  delete: (petId, id) => client.delete(`/pets/${petId}/blood-work/${id}`).then(r => r.data)
};

export const stoolApi = {
  getAll: (petId, params) => client.get(`/pets/${petId}/stool`, { params }).then(r => r.data),
  create: (petId, data, files) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    files?.forEach(f => fd.append('images', f));
    return client.post(`/pets/${petId}/stool`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  update: (petId, id, data) => client.put(`/pets/${petId}/stool/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/stool/${id}`).then(r => r.data)
};

export const behaviorApi = {
  getAll: (petId, params) => client.get(`/pets/${petId}/behavior`, { params }).then(r => r.data),
  create: (petId, data, files) => {
    const fd = new FormData();
    Object.entries(data).forEach(([k, v]) => fd.append(k, v));
    files?.forEach(f => fd.append('images', f));
    return client.post(`/pets/${petId}/behavior`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  update: (petId, id, data) => client.put(`/pets/${petId}/behavior/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/behavior/${id}`).then(r => r.data)
};

export const feedingApi = {
  getAll: (petId) => client.get(`/pets/${petId}/feeding`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/feeding`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/feeding/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/feeding/${id}`).then(r => r.data)
};

export const vaccinationsApi = {
  getAll: (petId) => client.get(`/pets/${petId}/vaccinations`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/vaccinations`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/vaccinations/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/vaccinations/${id}`).then(r => r.data)
};

export const eventsApi = {
  getAll: (petId) => client.get(`/pets/${petId}/events`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/events`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/events/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/events/${id}`).then(r => r.data)
};

export const statsApi = {
  get: (petId, params) => client.get(`/statistics/${petId}/stats`, { params }).then(r => r.data)
};

export const backupApi = {
  exportPet: (petId) =>
    client.get(`/pets/${petId}/export`, { responseType: 'blob' }).then(r => ({
      blob: r.data,
      filename: (r.headers['content-disposition'] || '').match(/filename="?([^"]+)"?/)?.[1] || `nemo-export-${petId}.zip`
    })),
  importPet: (file) => {
    const fd = new FormData();
    fd.append('backup', file);
    return client.post('/pets/import', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  }
};

export const weightApi = {
  getAll: (petId) => client.get(`/pets/${petId}/weight`).then(r => r.data),
  create: (petId, data) => client.post(`/pets/${petId}/weight`, data).then(r => r.data),
  update: (petId, id, data) => client.put(`/pets/${petId}/weight/${id}`, data).then(r => r.data),
  delete: (petId, id) => client.delete(`/pets/${petId}/weight/${id}`).then(r => r.data)
};

export const calendarApi = {
  getEvents: (params) => client.get('/calendar', { params }).then(r => r.data),
  getIcsToken: () => client.get('/calendar/ics-token').then(r => r.data),
  refreshIcsToken: () => client.post('/calendar/ics-token/refresh').then(r => r.data)
};

export const dashboardApi = {
  get: () => client.get('/dashboard').then(r => r.data)
};
