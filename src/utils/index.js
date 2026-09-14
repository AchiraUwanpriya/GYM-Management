import { API_BASE_URL } from '../../index';

export const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    let s = String(dateStr).trim();
    const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
    if (match) s = `${match[3]}-${match[2]}-${match[1]}T00:00:00`;
    else s = s.replace(' ', 'T').split('.')[0];
    
    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch { return dateStr; }
};

export const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  try {
    let s = String(dateStr).trim();
    const match = s.match(/^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2}):(\d{2})/);
    if (match) s = `${match[3]}-${match[2]}-${match[1]}T${match[4]}:${match[5]}:${match[6]}`;
    else s = s.replace(' ', 'T').split('.')[0];

    const d = new Date(s);
    if (isNaN(d.getTime())) return dateStr;

    return d.toLocaleString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  } catch { return dateStr; }
};

export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return 'LKR ' + num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

export const sumBy = (arr, key) =>
  (arr || []).reduce((acc, item) => acc + (parseFloat(item[key]) || 0), 0);

export const isSuccess = (res) =>
  res && (res.StatusCode === 200 || res.Success === true || res.success === true);

export const getErrorMsg = (res) =>
  res?.Message || res?.message || res?.Result || 'An error occurred';

export const debounce = (fn, delay) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
};

export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '??';
  return name.split(' ').map((w) => w[0]).join('').toUpperCase().substring(0, 2);
};

export const uid = () => Math.random().toString(36).substring(2, 9);

/**
 * Normalize stored image paths and prefer same-origin URLs so Vite/IIS proxying
 * can serve uploads without mixed-content or host mismatch issues.
 */
export const getImgUrl = (path, defaultImg = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png') => {
  if (!path || typeof path !== 'string' || !path.trim()) return defaultImg;
  const rawPath = path.trim();
  const normalizedPath = rawPath.replace(/\\/g, '/');

  if (
    normalizedPath.startsWith('http://') ||
    normalizedPath.startsWith('https://') ||
    normalizedPath.startsWith('data:') ||
    normalizedPath.startsWith('blob:')
  ) {
    return normalizedPath;
  }

  if (/^[a-zA-Z]:\//.test(normalizedPath)) {
    return `${API_BASE_URL}/User/UserImage?imagePath=${encodeURIComponent(rawPath)}`;
  }

  const appRelativePath = `/${normalizedPath.replace(/^\.?\/+/, '')}`;
  return `${API_BASE_URL}${appRelativePath}`;
};

/**
 * Safely extract profile image from a user/member object.
 * Handles both snake_case (profile_image) and camelCase (profileImage) field names.
 */
export const getProfileImg = (obj) => {
  if (!obj) return null;
  return obj.profile_image || obj.profileImage || obj.image_path || obj.imagePath || null;
};
