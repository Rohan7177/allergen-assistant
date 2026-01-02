const ALLERGEN_OPTIONS = [
  'peanuts',
  'pistachios',
  'tree nuts',
  'eggs',
  'shellfish',
  'wheat',
  'cashews',
  'almonds',
  'milk',
  'fish',
  'soy',
  'gluten',
];

const ALLERGEN_OPTIONS_SET = new Set(ALLERGEN_OPTIONS);

const SAFE_TEXT_REGEX = /^[\p{L}\p{N}\s.,!?"'()\-_/&:;%@#+]+$/u;
const UNSAFE_TEXT_CHARS_REGEX = /[^\p{L}\p{N}\s.,!?"'()\-_/&:;%@#+]/gu;
const SAFE_ALLERGEN_REGEX = /^[\p{L}\s-]+$/u;
const SAFE_DATA_URL_REGEX = /^data:(image\/[a-z0-9.+-]+);base64,[A-Za-z0-9+/=]+$/i;

const MAX_TEXT_LENGTH = 280;
const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/heic',
  'image/heif',
]);

export const validationConstants = {
  MAX_TEXT_LENGTH,
  MAX_IMAGE_SIZE_BYTES,
  ALLOWED_IMAGE_MIME_TYPES,
};

export const sanitizeAllergenList = (list) => {
  if (!Array.isArray(list)) return [];

  const sanitized = list
    .map((item) => (typeof item === 'string' ? item.trim().toLowerCase() : ''))
    .filter(
      (item) =>
        item.length > 0 &&
        SAFE_ALLERGEN_REGEX.test(item) &&
        ALLERGEN_OPTIONS_SET.has(item)
    );

  return Array.from(new Set(sanitized));
};

export const sanitizeTextInput = (value) => {
  if (typeof value !== 'string') return '';

  const trimmed = value.trim();
  if (!trimmed) return '';

  const withoutAngleBrackets = trimmed.replace(/[<>]/g, '');
  const condensedWhitespace = withoutAngleBrackets.replace(/\s+/g, ' ');
  const safeOnly = condensedWhitespace.replace(UNSAFE_TEXT_CHARS_REGEX, '');

  return safeOnly.slice(0, MAX_TEXT_LENGTH);
};

export const isSafeText = (value) => value === '' || SAFE_TEXT_REGEX.test(value);

export const validateAndNormalizeText = (value, { required = true } = {}) => {
  const sanitized = sanitizeTextInput(value);

  if (!sanitized) {
    if (required) {
      throw new Error('Input is required.');
    }
    return '';
  }

  if (!isSafeText(sanitized)) {
    throw new Error('Input contains unsupported characters.');
  }

  return sanitized;
};

export const validateImagePayload = ({ dataUrl, mimeType, size }) => {
  if (!mimeType || !ALLOWED_IMAGE_MIME_TYPES.has(mimeType)) {
    throw new Error('Unsupported image type.');
  }

  if (typeof size === 'number' && size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error('Image is too large.');
  }

  if (typeof dataUrl !== 'string' || !SAFE_DATA_URL_REGEX.test(dataUrl)) {
    throw new Error('Invalid image encoding.');
  }

  if (!dataUrl.startsWith(`data:${mimeType};base64,`)) {
    throw new Error('Image payload does not match mime type.');
  }

  return true;
};
