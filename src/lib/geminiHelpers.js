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

  const formatBlockedMessage = () => {
    const blockReason = response?.promptFeedback?.blockReason;
    const blockMessage = response?.promptFeedback?.blockReasonMessage;
    const safetyRatings = response?.promptFeedback?.safetyRatings ?? [];

    const reasonText = blockReason ? blockReason.replace(/_/g, ' ').toLowerCase() : 'unspecified safety concern';

    const categorySummary = safetyRatings
      .map((rating) => {
        const category = rating?.category?.replace(/_/g, ' ').toLowerCase();
        const probability = rating?.probability?.replace(/_/g, ' ').toLowerCase();
        if (!category) return null;
        return probability ? `${category} (${probability})` : category;
      })
      .filter(Boolean)
      .join(', ');

    const details = categorySummary ? ` Categories flagged: ${categorySummary}.` : '';
    const message = blockMessage ? ` ${blockMessage}` : '';

    return `Gemini was unable to produce a response due to ${reasonText}.${message}${details} Please adjust the prompt and try again.`;
  };

  const consolidateSegments = (segments) =>
    segments
      .filter((segment) => typeof segment === 'string')
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .join('\n')
      .trim();

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

  const candidates = Array.isArray(response.candidates) ? response.candidates : [];

  const textSegments = [];
  for (const candidate of candidates) {
    const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
    for (const part of parts) {
      if (typeof part?.text === 'string') {
        textSegments.push(part.text);
      }
    }
  }

  const consolidated = consolidateSegments(textSegments);

  if (consolidated) {
    return consolidated;
  }

  if (response?.promptFeedback) {
    return formatBlockedMessage();
  }

  return 'Gemini did not return any textual content. Please try again with a different prompt.';
};
