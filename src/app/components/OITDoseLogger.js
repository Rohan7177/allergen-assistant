'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Platform,
} from 'react-native-web';

const REACTION_OPTIONS = [
  { value: 'none', label: 'No Reaction' },
  { value: 'mild', label: 'Mild Reaction' },
  { value: 'severe', label: 'Severe Reaction' },
];

const REACTION_BADGE = {
  none: { text: 'No Reaction', color: '#1f5137', border: '#2ddf86', textColor: '#d4ffe9' },
  mild: { text: 'Mild Reaction', color: '#57461a', border: '#facc15', textColor: '#fff7ce' },
  severe: { text: 'Severe Reaction', color: '#5b1a1a', border: '#fb7185', textColor: '#ffe4e6' },
};

const ROW_HIGHLIGHTS = {
  none: 'rgba(36, 124, 82, 0.25)',
  mild: 'rgba(202, 138, 4, 0.28)',
  severe: 'rgba(220, 38, 38, 0.28)',
};

const formatDose = (value) => {
  if (value === undefined || value === null || Number.isNaN(value)) return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '—';
  return `${numeric.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} mg`;
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return '—';
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '—';
  return `${date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })} · ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const PickerOption = ({ label, selected, onPress }) => (
  <TouchableOpacity onPress={onPress} style={[styles.pickerOption, selected && styles.pickerOptionSelected]}>
    <Text style={[styles.pickerOptionText, selected && styles.pickerOptionTextSelected]}>{label}</Text>
  </TouchableOpacity>
);

const AllergenPicker = ({ options, value, onChange }) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!scrollRef.current || !options.length) return;
    const index = Math.max(0, options.findIndex((item) => item.code === value));
    if (index < 0) return;

    const itemHeight = 48;
    const offset = clamp(index * itemHeight - itemHeight, 0, itemHeight * options.length);
    if (typeof scrollRef.current.scrollTo === 'function') {
      scrollRef.current.scrollTo({ y: offset, animated: true });
    }
  }, [options, value]);

  return (
    <View style={styles.pickerContainer}>
      <View style={styles.pickerOverlayTop} pointerEvents="none" />
      <View style={styles.pickerOverlayBottom} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.pickerScrollContent}
      >
        {options.map((option) => (
          <PickerOption
            key={option.code}
            label={option.label}
            selected={option.code === value}
            onPress={() => onChange(option.code)}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const ReactionSelector = ({ value, onChange, disabled }) => (
  <View style={styles.reactionRow}>
    {REACTION_OPTIONS.map((option) => {
      const isActive = option.value === value;
      return (
        <TouchableOpacity
          key={option.value}
          style={[styles.reactionChip, isActive && styles.reactionChipActive]}
          onPress={() => !disabled && onChange(option.value)}
          disabled={disabled}
        >
          <View style={[styles.reactionIndicator, isActive && styles.reactionIndicatorActive]} />
          <Text style={[styles.reactionChipText, isActive && styles.reactionChipTextActive]}>{option.label}</Text>
        </TouchableOpacity>
      );
    })}
  </View>
);

const Badge = ({ reaction }) => {
  const config = REACTION_BADGE[reaction] ?? REACTION_BADGE.none;
  return (
    <View style={[styles.reactionBadge, { backgroundColor: config.color, borderColor: config.border }]}>
      <Text style={[styles.reactionBadgeText, { color: config.textColor }]}>{config.text}</Text>
    </View>
  );
};

const ActionButton = ({ label, onPress, tone = 'primary', disabled }) => (
  <TouchableOpacity
    onPress={onPress}
    style={[styles.actionButton, styles[`actionButton_${tone}`], disabled && styles.actionButtonDisabled]}
    disabled={disabled}
  >
    <Text style={[styles.actionButtonText, styles[`actionButtonText_${tone}`]]}>{label}</Text>
  </TouchableOpacity>
);

const OITDoseLogger = () => {
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [allergens, setAllergens] = useState([]);
  const [logs, setLogs] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [selectedAllergen, setSelectedAllergen] = useState(null);
  const [doseInput, setDoseInput] = useState('');
  const [reaction, setReaction] = useState('none');

  const selectedAllergenLabel = useMemo(() => {
    const item = allergens.find((entry) => entry.code === selectedAllergen);
    return item?.label ?? 'Select allergen';
  }, [allergens, selectedAllergen]);

  const resetForm = useCallback(() => {
    const fallbackCode = allergens[0]?.code ?? null;
    setEditingId(null);
    setSelectedAllergen(fallbackCode);
    setDoseInput('');
    setReaction('none');
  }, [allergens]);

  const applyResponse = useCallback((payload) => {
    if (!payload) return;
    if (Array.isArray(payload.allergens)) {
      setAllergens(payload.allergens);
      if (!payload.allergens.some((item) => item.code === selectedAllergen)) {
        setSelectedAllergen(payload.allergens[0]?.code ?? null);
      }
    }
    if (Array.isArray(payload.logs)) {
      setLogs(payload.logs);
    }
  }, [selectedAllergen]);

  const loadData = useCallback(async () => {
    setIsFetching(true);
    setError(null);
    try {
      // Fetch OIT dose logs from server via AJAX to display user's dosing history.
      const response = await fetch('/api/oit-doses', { cache: 'no-store' });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Request failed with status ${response.status}`);
      }
      const payload = await response.json();
      applyResponse(payload);
    } catch (err) {
      setError(err.message || 'Failed to load OIT dose logs.');
    } finally {
      setIsFetching(false);
    }
  }, [applyResponse]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedAllergen && allergens.length) {
      setSelectedAllergen(allergens[0].code);
    }
  }, [allergens, selectedAllergen]);

  const handleSubmit = useCallback(async () => {
    setError(null);
    if (!selectedAllergen) {
      setError('Choose an allergen to log.');
      return;
    }

    const numericDose = Number.parseFloat(doseInput);
    if (!Number.isFinite(numericDose) || numericDose <= 0) {
      setError('Dose amount must be a positive number.');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        allergenCode: selectedAllergen,
        doseMg: numericDose,
        reaction,
      };

      // Save or update OIT dose log via AJAX to maintain persistent dosing records.

      const response = await fetch('/api/oit-doses', {
        method: editingId ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to persist dose log.');
      }

      applyResponse(data);
      resetForm();
    } catch (err) {
      setError(err.message || 'Failed to save dose log.');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedAllergen, doseInput, reaction, editingId, applyResponse, resetForm]);

  const handleEdit = useCallback((entry) => {
    setEditingId(entry.id);
    setSelectedAllergen(entry.allergenCode);
    setDoseInput(String(entry.doseMg));
    setReaction(entry.reaction);
    setError(null);
  }, []);

  const handleCancelEdit = useCallback(() => {
    resetForm();
  }, [resetForm]);

  const handleDelete = useCallback(async (entry) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/oit-doses', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: entry.id }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || 'Failed to delete dose log.');
      }
      applyResponse(data);
      if (editingId === entry.id) {
        resetForm();
      }
    } catch (err) {
      setError(err.message || 'Failed to delete dose log.');
    } finally {
      setIsSubmitting(false);
    }
  }, [applyResponse, editingId, resetForm]);

  const sortedLogs = useMemo(() => logs.slice().sort((a, b) => {
    const aTime = new Date(a.loggedAt ?? 0).getTime();
    const bTime = new Date(b.loggedAt ?? 0).getTime();
    return bTime - aTime;
  }), [logs]);

  return (
    <View style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Oral Immunotherapy Dose Chronicle</Text>
        <Text style={styles.heroSubtitle}>
          Capture every escalation and response. Track tolerance as you advance through OIT protocols.
        </Text>
        <View style={styles.heroMetaRow}>
          <View style={styles.heroMetaBadge}>
            <Text style={styles.heroMetaBadgeText}>{selectedAllergenLabel}</Text>
          </View>
          <TouchableOpacity style={styles.heroRefresh} onPress={loadData} disabled={isFetching}>
            <Text style={styles.heroRefreshText}>{isFetching ? 'Refreshing…' : 'Refresh Logs'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Log a Dose</Text>
        <Text style={styles.sectionSubtitle}>
          Spin the allergen selector, record the administered dose in milligrams, then flag the observed response.
        </Text>

        <View style={styles.formRow}>
          <View style={styles.formColumnPicker}>
            <Text style={styles.label}>Allergen</Text>
            <AllergenPicker options={allergens} value={selectedAllergen} onChange={setSelectedAllergen} />
          </View>

          <View style={styles.formColumnFields}>
            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Dose (mg)</Text>
              <TextInput
                value={doseInput}
                onChangeText={setDoseInput}
                placeholder="e.g. 25"
                placeholderTextColor="#8b8b8b"
                keyboardType="numeric"
                style={styles.textInput}
                inputMode="decimal"
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.label}>Reaction Check</Text>
              <ReactionSelector value={reaction} onChange={setReaction} disabled={isSubmitting} />
            </View>

            <View style={styles.formActions}>
              <ActionButton
                label={editingId ? 'Update Log' : 'Save Log'}
                onPress={handleSubmit}
                disabled={isSubmitting || !allergens.length}
                tone="primary"
              />
              {editingId && (
                <ActionButton
                  label="Cancel Edit"
                  onPress={handleCancelEdit}
                  disabled={isSubmitting}
                  tone="ghost"
                />
              )}
            </View>
          </View>
        </View>

        {error && <Text style={styles.feedbackError}>{error}</Text>}
      </View>

      <View style={[styles.card, styles.tableCard]}>
        <Text style={styles.sectionTitle}>Dose History</Text>
        <Text style={styles.sectionSubtitle}>
          Rows glow according to reaction severity. Click any record to edit or remove.
        </Text>

        <ScrollView style={styles.tableBody} contentContainerStyle={styles.tableBodyContent}>
          {sortedLogs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateTitle}>No OIT doses recorded yet.</Text>
              <Text style={styles.emptyStateSubtitle}>Log your first administered dose to begin trending tolerance.</Text>
            </View>
          ) : (
            sortedLogs.map((entry) => (
              <TouchableOpacity
                key={entry.id}
                style={[styles.tableRow, { backgroundColor: ROW_HIGHLIGHTS[entry.reaction] ?? ROW_HIGHLIGHTS.none }]}
                onPress={() => handleEdit(entry)}
                activeOpacity={0.85}
              >
                <View style={styles.tableRowMain}>
                  <Text style={styles.tableAllergen}>{entry.allergenLabel}</Text>
                  <Text style={styles.tableDose}>{formatDose(entry.doseMg)}</Text>
                </View>
                <View style={styles.tableRowMeta}>
                  <Badge reaction={entry.reaction} />
                  <Text style={styles.tableTimestamp}>{formatTimestamp(entry.loggedAt)}</Text>
                </View>
                <View style={styles.tableRowDivider} />
                <View style={styles.tableRowActions}>
                  <TouchableOpacity
                    style={styles.inlineButton}
                    onPress={() => handleEdit(entry)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.inlineButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.inlineButton, styles.inlineButtonDanger]}
                    onPress={() => handleDelete(entry)}
                    disabled={isSubmitting}
                  >
                    <Text style={styles.inlineButtonText}>Delete</Text>
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    gap: 24,
    paddingBottom: 40,
  },
  heroCard: {
    backgroundColor: '#321f46',
    backgroundImage: 'linear-gradient(135deg, #321f46 0%, #561f3a 45%, #691b2b 100%)',
    borderRadius: 28,
    padding: Platform.select({ default: 20, web: 28 }),
    shadowColor: '#0f172a',
    shadowOpacity: 0.45,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 16 },
    elevation: 18,
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.25)',
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fdf6ff',
    marginBottom: 10,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
    letterSpacing: 0.4,
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#f1d9ff',
    lineHeight: 22,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  heroMetaRow: {
    marginTop: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  heroMetaBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(244, 114, 182, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.5)',
  },
  heroMetaBadgeText: {
    color: '#fee2ff',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  heroRefresh: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: 'rgba(249, 168, 212, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.35)',
  },
  heroRefreshText: {
    color: '#ffe4f6',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  card: {
    backgroundColor: 'rgba(26, 16, 41, 0.88)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(217, 70, 239, 0.18)',
    shadowColor: '#111827',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
    gap: 18,
  },
  tableCard: {
    paddingBottom: 12,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fbe9ff',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#d6bcfa',
    lineHeight: 20,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  formRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 24,
  },
  formColumnPicker: {
    width: Platform.select({ web: '32%', default: '100%' }),
    minWidth: 240,
    flexShrink: 0,
    gap: 12,
  },
  formColumnFields: {
    flex: 1,
    minWidth: 240,
    gap: 18,
  },
  label: {
    fontSize: 14,
    color: '#f5d0fe',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  pickerContainer: {
    position: 'relative',
    height: 196,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(233, 213, 255, 0.35)',
    backgroundColor: 'rgba(31, 41, 55, 0.45)',
  },
  pickerScrollContent: {
    paddingVertical: 16,
  },
  pickerOption: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  pickerOptionSelected: {
    backgroundColor: 'rgba(217, 70, 239, 0.16)',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#e9d5ff',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  pickerOptionTextSelected: {
    fontWeight: '700',
    color: '#fdf4ff',
  },
  pickerOverlayTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundImage: 'linear-gradient(180deg, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0))',
    zIndex: 6,
  },
  pickerOverlayBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 36,
    backgroundImage: 'linear-gradient(0deg, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0))',
    zIndex: 6,
  },
  fieldGroup: {
    gap: 8,
  },
  textInput: {
    height: 52,
    borderRadius: 16,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(17, 24, 39, 0.7)',
    borderWidth: 1,
    borderColor: 'rgba(244, 114, 182, 0.3)',
    color: '#f1f5f9',
    fontSize: 16,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  reactionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(248, 250, 252, 0.18)',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
  },
  reactionChipActive: {
    borderColor: 'rgba(250, 204, 21, 0.6)',
    backgroundColor: 'rgba(202, 138, 4, 0.2)',
  },
  reactionIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: 'rgba(248, 250, 252, 0.5)',
    backgroundColor: 'transparent',
  },
  reactionIndicatorActive: {
    borderColor: '#facc15',
    backgroundColor: '#facc15',
  },
  reactionChipText: {
    color: '#fef3c7',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  reactionChipTextActive: {
    fontWeight: '600',
    color: '#fef9c3',
  },
  formActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  actionButton_primary: {
    backgroundColor: '#f472b6',
    borderColor: '#fb7185',
  },
  actionButton_ghost: {
    backgroundColor: 'transparent',
    borderColor: 'rgba(244, 114, 182, 0.35)',
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  actionButtonText_primary: {
    color: '#2a0f1b',
  },
  actionButtonText_ghost: {
    color: '#f9a8d4',
  },
  feedbackError: {
    color: '#fecdd3',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  feedbackSuccess: {
    color: '#d9f99d',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  tableBody: {
    maxHeight: 420,
  },
  tableBodyContent: {
    paddingVertical: 12,
    gap: 10,
  },
  tableRow: {
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 16,
    borderWidth: 1,
    borderColor: 'rgba(250, 204, 21, 0.24)',
  },
  tableRowMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
  },
  tableAllergen: {
    flexShrink: 1,
    color: '#fdf4ff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  tableDose: {
    color: '#fef3c7',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  tableRowMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableTimestamp: {
    color: '#cbd5f5',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  tableRowDivider: {
    height: 1,
    backgroundColor: 'rgba(248, 250, 252, 0.08)',
    borderRadius: 999,
  },
  tableRowActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-end',
  },
  inlineButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.25)',
    backgroundColor: 'rgba(31, 41, 55, 0.35)',
  },
  inlineButtonDanger: {
    borderColor: 'rgba(248, 113, 113, 0.5)',
    backgroundColor: 'rgba(248, 113, 113, 0.15)',
  },
  inlineButtonText: {
    color: '#fdf4ff',
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  reactionBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  reactionBadgeText: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 8,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#e0e7ff',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#c7d2fe',
    textAlign: 'center',
    maxWidth: 360,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
});

export default OITDoseLogger;
