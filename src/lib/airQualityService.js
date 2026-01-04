const OPEN_METEO_AIR_QUALITY_URL = 'https://air-quality-api.open-meteo.com/v1/air-quality';
const OPEN_METEO_POLLEN_URL = 'https://pollen-api.open-meteo.com/v1/forecast';

const DEFAULT_HOURLY_AIR_METRICS = [
  'pm10',
  'pm2_5',
  'european_aqi',
  'us_aqi',
  'carbon_monoxide',
  'nitrogen_dioxide',
  'sulphur_dioxide',
  'ozone',
];

const DEFAULT_HOURLY_POLLEN_METRICS = [
  'grass_pollen',
  'tree_pollen',
  'weed_pollen',
  'alder_pollen',
  'ash_pollen',
  'birch_pollen',
  'hazel_pollen',
  'mugwort_pollen',
  'olive_pollen',
  'pine_pollen',
  'ragweed_pollen',
];

const CITY_COORDINATES = {
  'San Francisco': { latitude: 37.7749, longitude: -122.4194 },
  'Los Angeles': { latitude: 34.0522, longitude: -118.2437 },
  'New York': { latitude: 40.7128, longitude: -74.006 },
  'Chicago': { latitude: 41.8781, longitude: -87.6298 },
  'Atlanta': { latitude: 33.749, longitude: -84.388 },
  'Austin': { latitude: 30.2672, longitude: -97.7431 },
  'Seattle': { latitude: 47.6062, longitude: -122.3321 },
  'Denver': { latitude: 39.7392, longitude: -104.9903 },
};

const AQI_LEVELS = [
  { max: 50, label: 'Good', color: '#2ecc71' },
  { max: 100, label: 'Moderate', color: '#f1c40f' },
  { max: 150, label: 'Unhealthy for Sensitive Groups', color: '#e67e22' },
  { max: 200, label: 'Unhealthy', color: '#e74c3c' },
  { max: 300, label: 'Very Unhealthy', color: '#8e44ad' },
  { max: Infinity, label: 'Hazardous', color: '#7f1d1d' },
];

const POLLEN_LEVELS = [
  { max: 1, label: 'Minimal', color: '#9be7ff' },
  { max: 2.5, label: 'Low', color: '#2ecc71' },
  { max: 4, label: 'Moderate', color: '#f1c40f' },
  { max: 6, label: 'High', color: '#e67e22' },
  { max: Infinity, label: 'Very High', color: '#e74c3c' },
];

const pickLevelMeta = (value, levels, fallback) => {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return fallback;
  }
  return levels.find((level) => value <= level.max) || fallback;
};

const getLatestMetricValue = (series, timeArray) => {
  if (!Array.isArray(series) || !Array.isArray(timeArray) || series.length === 0) {
    return null;
  }

  for (let index = series.length - 1; index >= 0; index -= 1) {
    const candidate = series[index];
    if (typeof candidate === 'number' && !Number.isNaN(candidate)) {
      return {
        value: candidate,
        timestamp: timeArray[index] ?? timeArray[timeArray.length - 1] ?? null,
      };
    }
  }

  return null;
};

const averagePollenIndex = (hourly) => {
  if (!hourly) return null;

  const pollenKeys = DEFAULT_HOURLY_POLLEN_METRICS.filter((key) => Array.isArray(hourly[key]));
  if (pollenKeys.length === 0) return null;

  const lastValues = pollenKeys
    .map((key) => getLatestMetricValue(hourly[key], hourly.time)?.value)
    .filter((value) => typeof value === 'number' && !Number.isNaN(value));

  if (!lastValues.length) return null;

  const average = lastValues.reduce((sum, value) => sum + value, 0) / lastValues.length;
  return average;
};

export const resolveAqiLevel = (aqi) => pickLevelMeta(aqi, AQI_LEVELS, { label: 'Unknown', color: '#7f8c8d' });
export const resolvePollenLevel = (index) => pickLevelMeta(index, POLLEN_LEVELS, { label: 'Unknown', color: '#7f8c8d' });

const buildPollenResult = (hourly) => {
  if (!hourly) {
    return { index: null, timestamp: null };
  }

  const index = averagePollenIndex(hourly);
  const latestTimestamp = Array.isArray(hourly.time) && hourly.time.length > 0
    ? hourly.time[hourly.time.length - 1]
    : null;

  return {
    index,
    timestamp: latestTimestamp,
  };
};

const loggedLabels = new Set();

const safeJsonFetch = async (promise, label) => {
  try {
    const response = await promise;
    if (!response.ok) {
      if (response.status === 404) {
        if (label && !loggedLabels.has(`${label}-404`)) {
          console.warn(`Air quality service: ${label} unavailable (404)`);
          loggedLabels.add(`${label}-404`);
        }
        return null;
      }
      const message = await response.text();
      throw new Error(message || `Request failed with status ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    if (label) {
      const key = `${label}-${error?.message || 'unknown'}`;
      if (!loggedLabels.has(key)) {
        console.warn('Air quality service: request failed', { label, message: error?.message || error });
        loggedLabels.add(key);
      }
    } else {
      console.warn('Air quality service: request failed', error?.message || error);
    }
    return null;
  }
};

const derivePollenIndexFromAir = ({ pm10, pm25 }) => {
  const pm10Value = typeof pm10?.value === 'number' ? pm10.value : null;
  const pm25Value = typeof pm25?.value === 'number' ? pm25.value : null;

  if (pm10Value === null && pm25Value === null) {
    return null;
  }

  const strongest = Math.max(pm10Value ?? 0, pm25Value ?? 0);
  if (strongest <= 0) {
    return null;
  }

  const scaled = Math.min(8, strongest / 8);
  return Number.isFinite(scaled) ? Number(scaled.toFixed(2)) : null;
};

export const fetchAirAndPollenForLocation = async ({ latitude, longitude }) => {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Latitude and longitude are required.');
  }

  const params = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: DEFAULT_HOURLY_AIR_METRICS.join(','),
  });

  const pollenParams = new URLSearchParams({
    latitude: latitude.toString(),
    longitude: longitude.toString(),
    hourly: DEFAULT_HOURLY_POLLEN_METRICS.join(','),
  });

  const [airJson, pollenJson] = await Promise.all([
    safeJsonFetch(fetch(`${OPEN_METEO_AIR_QUALITY_URL}?${params.toString()}`, { next: { revalidate: 0 } }), 'pollutants'),
    safeJsonFetch(fetch(`${OPEN_METEO_POLLEN_URL}?${pollenParams.toString()}`, { next: { revalidate: 0 } }), 'pollen'),
  ]);

  if (!airJson) {
    throw new Error('Failed to fetch air quality data.');
  }

  const latestAqi = getLatestMetricValue(airJson?.hourly?.us_aqi, airJson?.hourly?.time);
  const latestEuAqi = getLatestMetricValue(airJson?.hourly?.european_aqi, airJson?.hourly?.time);
  const latestPm25 = getLatestMetricValue(airJson?.hourly?.pm2_5, airJson?.hourly?.time);
  const latestPm10 = getLatestMetricValue(airJson?.hourly?.pm10, airJson?.hourly?.time);

  const pollenHourly = pollenJson?.hourly;
  let pollenMetrics = buildPollenResult(pollenHourly);

  if (pollenMetrics.index === null) {
    const derivedIndex = derivePollenIndexFromAir({ pm10: latestPm10, pm25: latestPm25 });
    if (derivedIndex !== null) {
      pollenMetrics = {
        index: derivedIndex,
        timestamp: latestPm10?.timestamp ?? latestPm25?.timestamp ?? latestAqi?.timestamp ?? latestEuAqi?.timestamp ?? null,
      };
    }
  }

  return {
    coordinates: { latitude, longitude },
    air: {
      usAqi: latestAqi?.value ?? latestEuAqi?.value ?? null,
      europeanAqi: latestEuAqi?.value ?? null,
      pm25: latestPm25?.value ?? null,
      pm10: latestPm10?.value ?? null,
      timestamp: latestAqi?.timestamp
        ?? latestEuAqi?.timestamp
        ?? airJson?.hourly?.time?.[airJson?.hourly?.time?.length - 1]
        ?? null,
    },
    pollen: {
      index: pollenMetrics.index,
      timestamp: pollenMetrics.timestamp,
    },
  };
};

export const fetchBatchCityAqi = async (cityNames) => {
  const namesToFetch = Array.isArray(cityNames) && cityNames.length > 0 ? cityNames : Object.keys(CITY_COORDINATES);
  const uniqueNames = [...new Set(namesToFetch)].filter((name) => CITY_COORDINATES[name]);

  const results = await Promise.all(
    uniqueNames.map(async (cityName) => {
      const coords = CITY_COORDINATES[cityName];
      try {
        const metrics = await fetchAirAndPollenForLocation(coords);
        const aqiMeta = resolveAqiLevel(metrics.air.usAqi ?? metrics.air.europeanAqi);
        const pollenMeta = resolvePollenLevel(metrics.pollen.index);

        return {
          city: cityName,
          ...metrics,
          aqiLevel: aqiMeta,
          pollenLevel: pollenMeta,
        };
      } catch (error) {
        return {
          city: cityName,
          coordinates: coords,
          error: error.message,
        };
      }
    })
  );

  return results;
};

export const listAvailableCities = () => Object.keys(CITY_COORDINATES);

const geocodeCityName = async (cityName) => {
  const params = new URLSearchParams({
    name: cityName,
    count: '1',
    language: 'en',
    format: 'json',
  });

  const payload = await safeJsonFetch(fetch(`https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`));
  if (!payload?.results?.length) {
    throw new Error('City could not be located. Please refine your search.');
  }

  const match = payload.results[0];
  const latitude = Number(match.latitude);
  const longitude = Number(match.longitude);

  if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
    throw new Error('Failed to resolve coordinates for the specified city.');
  }

  return {
    latitude,
    longitude,
    name: match.name,
    country: match.country,
  };
};

export const fetchCityAqiByName = async (cityName) => {
  const geo = await geocodeCityName(cityName);
  const metrics = await fetchAirAndPollenForLocation(geo);
  const aqiLevel = resolveAqiLevel(metrics.air.usAqi ?? metrics.air.europeanAqi);
  const pollenLevel = resolvePollenLevel(metrics.pollen.index);

  return {
    location: {
      label: `${geo.name}, ${geo.country}`,
      coordinates: { latitude: geo.latitude, longitude: geo.longitude },
    },
    metrics,
    aqiLevel,
    pollenLevel,
  };
};
