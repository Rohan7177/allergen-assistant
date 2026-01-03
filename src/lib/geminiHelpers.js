export const buildUserTextContent = (text) => {
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Gemini prompt must be a non-empty string.');
  }

  return {
    role: 'user',
    parts: [{ text }],
  };
};

export const extractModelText = (result) => {
  if (!result?.response) {
    throw new Error('Gemini response payload was empty.');
  }

  const { response } = result;

  if (typeof response.text === 'function') {
    try {
      const helperText = response.text();
      if (typeof helperText === 'string' && helperText.trim()) {
        return helperText.trim();
      }
    } catch {
      // Fallback to manual extraction below.
    }
  }

  const candidates = response.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini response did not include any candidates.');
  }

  const parts = candidates[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) {
    throw new Error('Gemini response candidate did not include text parts.');
  }

  const textSegments = parts
    .map((part) => (typeof part?.text === 'string' ? part.text : null))
    .filter((segment) => typeof segment === 'string' && segment.trim().length > 0);

  if (textSegments.length === 0) {
    throw new Error('Gemini response did not contain text content.');
  }

  return textSegments.join('').trim();
};
