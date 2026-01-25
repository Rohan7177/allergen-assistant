'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native-web';

const CITY_POSITIONS = {
  'San Francisco': { top: '62%', left: '12%' },
  'Los Angeles': { top: '72%', left: '19%' },
  'Seattle': { top: '48%', left: '18%' },
  'Denver': { top: '55%', left: '40%' },
  'Austin': { top: '72%', left: '52%' },
  'Chicago': { top: '48%', left: '58%' },
  'Atlanta': { top: '66%', left: '66%' },
  'New York': { top: '40%', left: '78%' },
};

const POLLEN_LEGEND = [
  { label: 'Minimal', color: '#9be7ff' },
  { label: 'Low', color: '#2ecc71' },
  { label: 'Moderate', color: '#f1c40f' },
  { label: 'High', color: '#e67e22' },
  { label: 'Very High', color: '#e74c3c' },
];

const hexToRgba = (hex, alpha) => {
  if (typeof hex !== 'string') return `rgba(127, 140, 141, ${alpha})`;
  const normalized = hex.replace('#', '');
  if (normalized.length !== 6) return `rgba(127, 140, 141, ${alpha})`;
  const bigint = Number.parseInt(normalized, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

const pollenRadiusForLabel = (label) => {
  switch (label) {
    case 'Minimal':
      return 40;
    case 'Low':
      return 55;
    case 'Moderate':
      return 70;
    case 'High':
      return 95;
    case 'Very High':
      return 120;
    default:
      return 60;
  }
};

const formatMetricValue = (value, fractionDigits = 0) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—';
  }
  const numberValue = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(numberValue)) {
    return '—';
  }
  return numberValue.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatTimestamp = (timestamp) => {
  if (!timestamp) return 'Unknown';
  try {
    const date = typeof timestamp === 'number' ? new Date(timestamp) : new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown';
    return `${date.toLocaleDateString()} ${date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    })}`;
  } catch {
    return 'Unknown';
  }
};

const combineStatus = (status) => {
  if (!status) return 'Awaiting data';
  const diff = Date.now() - status;
  if (Number.isNaN(diff)) return 'Awaiting data';
  if (diff < 30_000) return 'Live';
  if (diff < 120_000) return 'Warming up';
  return 'Reconnecting…';
};

const AirQualitySection = () => {
  const [citySummaries, setCitySummaries] = useState([]);
  const [availableCities, setAvailableCities] = useState([]);
  const [selectedCityName, setSelectedCityName] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [streamStatus, setStreamStatus] = useState(null);
  const [streamError, setStreamError] = useState(null);
  const [manualCityQuery, setManualCityQuery] = useState('');
  const [manualResult, setManualResult] = useState(null);
  const [manualError, setManualError] = useState(null);
  const [isManualLoading, setIsManualLoading] = useState(false);
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  const eventSourceRef = useRef(null);

  const selectedCity = useMemo(() => {
    if (!citySummaries.length) return null;
    if (!selectedCityName) return citySummaries[0];
    return citySummaries.find((item) => item.city === selectedCityName) || citySummaries[0];
  }, [citySummaries, selectedCityName]);

  const startStream = useCallback(
    (cities) => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }

      if (typeof window === 'undefined') return;

      const params = new URLSearchParams({ mode: 'stream' });
      if (Array.isArray(cities) && cities.length > 0) {
        params.set('cities', cities.join(','));
      }

      const source = new EventSource(`/api/air-quality?${params.toString()}`);
      eventSourceRef.current = source;

      source.addEventListener('open', () => {
        setStreamError(null);
        setStreamStatus(Date.now());
      });

      source.addEventListener('heartbeat', (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.timestamp) {
            setStreamStatus(payload.timestamp);
          }
        } catch {
          setStreamStatus(Date.now());
        }
      });

      source.addEventListener('update', (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (Array.isArray(payload?.results)) {
            setCitySummaries(payload.results);
            setLastUpdate(Date.now());
          }
        } catch {
          setStreamError('Failed to parse live update.');
        }
      });

      source.addEventListener('error', () => {
        setStreamError('Live connection interrupted. Attempting to reconnect…');
      });
    },
    []
  );

  useEffect(() => {
    let isMounted = true;

    const loadInitialData = async () => {
      try {
        // Fetch air quality data from server via AJAX for real-time environmental updates.
        const response = await fetch('/api/air-quality', { cache: 'no-store' });
        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!isMounted) return;

        if (Array.isArray(data?.results)) {
          setCitySummaries(data.results);
          setLastUpdate(Date.now());
          if (!selectedCityName && data.results.length) {
            setSelectedCityName(data.results[0].city);
          }
        }

        if (Array.isArray(data?.availableCities)) {
          setAvailableCities(data.availableCities);
        }

        startStream(data?.availableCities);
      } catch (err) {
        if (!isMounted) return;
        setStreamError(err.message || 'Failed to load air quality data.');
      }
    };

    loadInitialData();

    return () => {
      isMounted = false;
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [selectedCityName, startStream]);

  const handleCityPress = useCallback(
    (cityName) => {
      setSelectedCityName(cityName);
    },
    []
  );

  const handleManualLookup = useCallback(async () => {
    setManualError(null);

    const trimmed = manualCityQuery.trim();
    if (!trimmed) {
      setManualError('Enter a city name to analyze.');
      return;
    }

    setIsManualLoading(true);
    setManualResult(null);

    try {
      const params = new URLSearchParams({ city: trimmed });
      const response = await fetch(`/api/air-quality?${params.toString()}`, { cache: 'no-store' });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || `Request failed with status ${response.status}`);
      }

      const data = await response.json();
      setManualResult(data);
    } catch (err) {
      setManualError(err.message || 'Failed to fetch AQI details for that city.');
    } finally {
      setIsManualLoading(false);
    }
  }, [manualCityQuery]);

  const computedStatus = combineStatus(streamStatus);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>Live Air Quality & Pollen Radar</Text>
        <Text style={styles.heroSubtitle}>
          Stay ahead of high pollen zones and track particulate levels as the atmosphere shifts in real time.
        </Text>

        <View style={styles.statusRow}>
          <View style={styles.statusIndicator}>
            <View style={[
              styles.statusDot,
              computedStatus === 'Live' && styles.statusDotLive,
              computedStatus === 'Warming up' && styles.statusDotWarning,
              computedStatus === 'Reconnecting…' && styles.statusDotOffline,
            ]}
            />
            <Text style={styles.statusText}>{computedStatus}</Text>
          </View>
          {lastUpdate && (
            <Text style={styles.statusTimestamp}>Last update: {formatTimestamp(lastUpdate)}</Text>
          )}
        </View>

        {streamError && <Text style={styles.errorText}>{streamError}</Text>}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>City Focus</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.cityPillRow}>
          {availableCities.map((city) => (
            <TouchableOpacity
              key={city}
              onPress={() => handleCityPress(city)}
              style={[
                styles.cityPill,
                selectedCity?.city === city && styles.cityPillActive,
              ]}
            >
              <Text
                style={[
                  styles.cityPillText,
                  selectedCity?.city === city && styles.cityPillTextActive,
                ]}
              >
                {city}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {selectedCity ? (
          <View style={styles.detailCard}>
            <View style={styles.detailHeader}>
              <Text style={styles.detailCity}>{selectedCity.city}</Text>
              <View style={styles.detailBadge}>
                <Text style={styles.detailBadgeText}>{selectedCity.aqiLevel?.label ?? 'Unknown'}</Text>
              </View>
            </View>

            <Text style={styles.detailMetricHeadline}>
              US AQI {formatMetricValue(selectedCity.air?.usAqi)} · PM2.5 {formatMetricValue(selectedCity.air?.pm25, 1)} µg/m³
            </Text>

            <View style={styles.metricRow}>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Air Quality</Text>
                <Text style={[styles.metricValue, { color: selectedCity.aqiLevel?.color ?? '#f0f0f0' }]}>
                  {selectedCity.aqiLevel?.label ?? 'Unknown'}
                </Text>
              </View>
              <View style={styles.metricBlock}>
                <Text style={styles.metricLabel}>Pollen Index</Text>
                <Text style={[styles.metricValue, { color: selectedCity.pollenLevel?.color ?? '#f0f0f0' }]}>
                  {formatMetricValue(selectedCity.pollen?.index, 1)} ({selectedCity.pollenLevel?.label ?? 'Unknown'})
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <Text style={styles.placeholderText}>Waiting for live city data…</Text>
        )}
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Pollen Storm Map</Text>
        <Text style={styles.sectionSubtitle}>
          Regions glow based on pollen concentration. Tap a city chip above to highlight its metrics.
        </Text>

        <View style={styles.mapWrapper}>
          <View style={styles.mapBackground} />
          {citySummaries.map((entry) => {
            const point = CITY_POSITIONS[entry.city];
            if (!point) return null;

            const pollenLabel = entry.pollenLevel?.label ?? 'Unknown';
            const pollenColor = entry.pollenLevel?.color ?? '#7f8c8d';
            const glowColor = hexToRgba(pollenColor, selectedCity?.city === entry.city ? 0.6 : 0.35);
            const radius = pollenRadiusForLabel(pollenLabel);
            const highlight = selectedCity?.city === entry.city;

            return (
              <View
                key={entry.city}
                style={[
                  styles.mapMarker,
                  { top: point.top, left: point.left },
                ]}
              >
                <View
                  style={[
                    styles.markerGlow,
                    {
                      width: radius,
                      height: radius,
                      borderRadius: radius / 2,
                      backgroundColor: glowColor,
                      opacity: highlight ? 0.8 : 0.5,
                    },
                  ]}
                />
                <View
                  style={[
                    styles.markerCore,
                    { borderColor: pollenColor },
                    highlight && styles.markerCoreHighlight,
                  ]}
                />
                <Text style={styles.markerLabel}>{entry.city}</Text>
              </View>
            );
          })}
          {isLegendExpanded && (
            <View style={styles.mapLegend}>
              <Text style={styles.legendTitle}>Pollen Key</Text>
              {POLLEN_LEGEND.map((item) => (
                <View key={item.label} style={styles.legendRow}>
                  <View style={[styles.legendSwatch, { backgroundColor: item.color }]} />
                  <Text style={styles.legendLabel}>{item.label}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            onPress={() => setIsLegendExpanded((prev) => !prev)}
            style={[styles.legendToggle, isLegendExpanded && styles.legendToggleActive]}
          >
            <Text style={styles.legendToggleText}>{isLegendExpanded ? 'Hide' : 'Key'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>City Snapshot Console</Text>
        <Text style={styles.sectionSubtitle}>
          Drop in any city worldwide and see the latest particulate and pollen pulse before you head out.
        </Text>

        <View style={styles.manualRow}>
          <TextInput
            style={styles.manualInput}
            placeholder="Try 'Portland' or 'London'"
            placeholderTextColor="#64748b"
            value={manualCityQuery}
            onChangeText={setManualCityQuery}
            editable={!isManualLoading}
          />
          <TouchableOpacity
            style={[styles.manualButton, isManualLoading && styles.manualButtonDisabled]}
            onPress={handleManualLookup}
            disabled={isManualLoading}
          >
            <Text style={styles.manualButtonText}>{isManualLoading ? 'Scanning…' : 'Analyze'}</Text>
          </TouchableOpacity>
        </View>

        {manualError && <Text style={styles.errorText}>{manualError}</Text>}

        {manualResult && (
          <View style={styles.manualResultCard}>
            <Text style={styles.manualResultTitle}>{manualResult?.location?.label ?? 'Custom Location'}</Text>
            <Text style={styles.manualResultCoords}>
              {formatMetricValue(manualResult?.location?.coordinates?.latitude, 4)},
              {' '}
              {formatMetricValue(manualResult?.location?.coordinates?.longitude, 4)}
            </Text>
            <View style={styles.manualMetricsRow}>
              <View style={styles.manualMetricBlock}>
                <Text style={styles.manualMetricLabel}>Air Quality</Text>
                <Text style={[styles.manualMetricValue, { color: manualResult?.aqiLevel?.color ?? '#f0f0f0' }]}>
                  {manualResult?.aqiLevel?.label ?? 'Unknown'}
                </Text>
                <Text style={styles.manualMetricDetail}>
                  US AQI {formatMetricValue(manualResult?.metrics?.air?.usAqi)}
                </Text>
              </View>
              <View style={styles.manualMetricBlock}>
                <Text style={styles.manualMetricLabel}>Pollen Index</Text>
                <Text style={[styles.manualMetricValue, { color: manualResult?.pollenLevel?.color ?? '#f0f0f0' }]}>
                  {formatMetricValue(manualResult?.metrics?.pollen?.index, 1)} ({manualResult?.pollenLevel?.label ?? 'Unknown'})
                </Text>
              </View>
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
  },
  contentContainer: {
    paddingBottom: 36,
  },
  heroCard: {
    backgroundColor: '#182235',
    borderRadius: 24,
    padding: 24,
    marginBottom: 24,
    shadowColor: '#0f172a',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 14 },
    elevation: 16,
  },
  heroTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 8,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  heroSubtitle: {
    fontSize: 16,
    color: '#bcccdc',
    lineHeight: 22,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 18,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#475569',
  },
  statusDotLive: {
    backgroundColor: '#34d399',
  },
  statusDotWarning: {
    backgroundColor: '#facc15',
  },
  statusDotOffline: {
    backgroundColor: '#f87171',
  },
  statusText: {
    fontSize: 14,
    color: '#cbd5f5',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  statusTimestamp: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  errorText: {
    marginTop: 16,
    color: '#fca5a5',
    fontSize: 14,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  section: {
    marginBottom: 36,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 16,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  sectionSubtitle: {
    fontSize: 15,
    color: '#94a3b8',
    lineHeight: 20,
    marginBottom: 18,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  cityPillRow: {
    marginBottom: 18,
  },
  cityPill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    marginRight: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.6)',
  },
  cityPillActive: {
    backgroundColor: '#0ea5e9',
    borderColor: '#38bdf8',
  },
  cityPillText: {
    fontSize: 14,
    color: '#cbd5f5',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  cityPillTextActive: {
    color: '#0f172a',
    fontWeight: '700',
  },
  detailCard: {
    backgroundColor: '#1f2937',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailCity: {
    fontSize: 20,
    fontWeight: '700',
    color: '#f8fafc',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  detailBadge: {
    backgroundColor: 'rgba(148, 163, 184, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999,
  },
  detailBadgeText: {
    fontSize: 13,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  detailMetricHeadline: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 18,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  metricRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  metricBlock: {
    flexGrow: 1,
    minWidth: 160,
    padding: 14,
    borderRadius: 14,
    backgroundColor: '#111827',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  metricLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  metricValueSmall: {
    fontSize: 14,
    color: '#cbd5f5',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  placeholderText: {
    color: '#64748b',
    fontSize: 15,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  mapWrapper: {
    position: 'relative',
    width: '100%',
    aspectRatio: 1.6,
    borderRadius: 22,
    overflow: 'hidden',
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#0f172a',
    shadowOpacity: 0.45,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 14 },
    elevation: 14,
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    backgroundImage:
      'radial-gradient(circle at 20% 30%, rgba(56, 189, 248, 0.15), transparent 60%), radial-gradient(circle at 80% 70%, rgba(16, 185, 129, 0.12), transparent 55%), linear-gradient(135deg, rgba(15, 23, 42, 0.95), rgba(8, 47, 73, 0.92))',
  },
  mapMarker: {
    position: 'absolute',
    overflow: 'hidden',
  },
  legendToggle: {
    position: 'absolute',
    top: 16,
    left: 16,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(15, 23, 42, 0.8)',
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.5)',
    shadowColor: '#000',
    shadowOpacity: 0.45,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  legendToggleActive: {
    backgroundColor: 'rgba(30, 64, 175, 0.85)',
    borderColor: 'rgba(96, 165, 250, 0.8)',
  },
  legendToggleText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
    letterSpacing: 0.3,
    fontWeight: '500',
  },
  markerGlow: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -0.5 }, { translateY: -0.5 }],
  },
  markerCore: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0f172a',
    borderWidth: 2,
    borderColor: 'rgba(148, 163, 184, 0.2)',
  },
  markerCoreHighlight: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  markerLabel: {
    marginTop: 8,
    fontSize: 12,
    color: '#e2e8f0',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
    textShadowColor: 'rgba(15, 23, 42, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  mapLegend: {
    position: 'absolute',
    top: 50,
    left: 16,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.25)',
    shadowColor: '#0f172a',
    shadowOpacity: 0.6,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
    elevation: 24,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  legendTitle: {
    fontSize: 14,
    color: '#e2e8f0',
    fontWeight: '600',
    marginBottom: 10,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  legendSwatch: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginRight: 10,
  },
  legendLabel: {
    color: '#d1d5db',
    fontSize: 12,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  manualInput: {
    flex: 1,
    minWidth: 220,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
    color: '#e2e8f0',
    fontSize: 15,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#0ea5e9',
    shadowColor: '#0ea5e9',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  manualButtonDisabled: {
    backgroundColor: '#334155',
    shadowOpacity: 0,
  },
  manualButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualResultCard: {
    marginTop: 22,
    padding: 20,
    borderRadius: 18,
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#0f172a',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  manualResultTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 4,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualResultCoords: {
    fontSize: 14,
    color: '#94a3b8',
    marginBottom: 16,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualMetricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 18,
  },
  manualMetricBlock: {
    flexGrow: 1,
    minWidth: 180,
    padding: 16,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  manualMetricLabel: {
    fontSize: 13,
    color: '#64748b',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualMetricValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#e2e8f0',
    marginBottom: 6,
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
  manualMetricDetail: {
    fontSize: 13,
    color: '#94a3b8',
    fontFamily: 'Space Grotesk, Inter, sans-serif',
  },
});

export default AirQualitySection;
