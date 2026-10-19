export const formatStatusLabel = (status) => status ? String(status).replace(/_/g, ' ').toUpperCase() : 'UNKNOWN';
