export const PHONE_ERROR_MESSAGE = 'Enter a valid phone number (10 digits, or +[country code][10 digits]).';

export const PHONE_REGEX = /^(\d{10}|\+\d{11})$/;

export const normalizePhoneInput = (value = '') => {
  let next = value.replace(/[^\d+]/g, '');
  next = next.replace(/(?!^)\+/g, '');

  if (next.startsWith('+')) {
    return next.slice(0, 12);
  }

  return next.slice(0, 10);
};

export const isValidPhone = (phone) => !phone || PHONE_REGEX.test((phone || '').trim());

export const getPhoneError = (phone) => {
  const trimmed = (phone || '').trim();
  if (!trimmed) return '';
  return isValidPhone(trimmed) ? '' : PHONE_ERROR_MESSAGE;
};
