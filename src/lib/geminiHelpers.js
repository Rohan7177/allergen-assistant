const normalizeModelName = (name) =>
  typeof name === 'string' ? name.trim().replace(/^models\//i, '') : '';

const DEFAULT_TEXT_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
  'gemini-1.0-pro-001',
];

const DEFAULT_MULTIMODAL_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash-latest',
  'gemini-1.5-pro-latest',
];

export const buildModelCandidateList = (
  requestedModel,
  fallbackModels = DEFAULT_TEXT_MODELS
) => {
  const candidates = [];
  const seen = new Set();

  const pushModel = (modelName) => {
    const normalized = normalizeModelName(modelName);
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    candidates.push(normalized);
  };

  pushModel(requestedModel);
  fallbackModels.forEach((model) => pushModel(model));

  return candidates;
};

export const buildMultimodalCandidateList = (requestedModel) =>
  buildModelCandidateList(requestedModel, DEFAULT_MULTIMODAL_MODELS);

export const isRetryableModelError = (error) => {
  if (!error) return false;

  const statusCode =
    typeof error.status === 'number'
      ? error.status
      : typeof error.code === 'number'
      ? error.code
      : typeof error?.response?.status === 'number'
      ? error.response.status
      : null;

  if (statusCode === 403 || statusCode === 404) {
    return true;
  }

  const message = typeof error.message === 'string' ? error.message : '';

  if (!message) return false;

  const indicators = [
    /permission denied/i,
    /insufficient permission/i,
    /not found/i,
    /model .*? does not exist/i,
    /404/,
    /403/,
  ];

  return indicators.some((regex) => regex.test(message));
};

export const summarizeModelAccessIssue = (triedModels) => {
  if (!Array.isArray(triedModels) || triedModels.length === 0) {
    return 'Gemini did not provide an accessible model for this request. Please verify your API key permissions.';
  }

  const models = triedModels.join(', ');
  return `Gemini reported that none of the configured models are accessible with the current API key. Tried models: ${models}. Update GEMINI_CHAT_MODEL (or related env vars) to a model enabled for your key, or adjust API access in Google AI Studio.`;
};

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
