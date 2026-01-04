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
  'birch_pollen',
  'olive_pollen',
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
  return {
    value: series[series.length - 1],
    timestamp: timeArray[timeArray.length - 1],
  };
};

const averagePollenIndex = (hourly) => {
  if (!hourly) return null;

  const pollenKeys = DEFAULT_HOURLY_POLLEN_METRICS.filter((key) => Array.isArray(hourly[key]));
  if (pollenKeys.length === 0) return null;

  const lastValues = pollenKeys
    .map((key) => hourly[key]?.[hourly[key].length - 1])
    .filter((value) => typeof value === 'number' && !Number.isNaN(value));

  if (!lastValues.length) return null;

  const average = lastValues.reduce((sum, value) => sum + value, 0) / lastValues.length;
  return average;
};

export const resolveAqiLevel = (aqi) => pickLevelMeta(aqi, AQI_LEVELS, { label: 'Unknown', color: '#7f8c8d' });
export const resolvePollenLevel = (index) => pickLevelMeta(index, POLLEN_LEVELS, { label: 'Unknown', color: '#7f8c8d' });

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

  const [airResponse, pollenResponse] = await Promise.all([
    fetch(`${OPEN_METEO_AIR_QUALITY_URL}?${params.toString()}`, { next: { revalidate: 0 } }),
    fetch(`${OPEN_METEO_POLLEN_URL}?${pollenParams.toString()}`, { next: { revalidate: 0 } }),
  ]);

  if (!airResponse.ok) {
    const message = await airResponse.text();
    throw new Error(`Failed to fetch air quality data: ${message || airResponse.status}`);
  }

  if (!pollenResponse.ok) {
    const message = await pollenResponse.text();
    throw new Error(`Failed to fetch pollen data: ${message || pollenResponse.status}`);
  }

  const airJson = await airResponse.json();
  const pollenJson = await pollenResponse.json();

  const latestAqi = getLatestMetricValue(airJson?.hourly?.us_aqi, airJson?.hourly?.time);
  const latestPm25 = getLatestMetricValue(airJson?.hourly?.pm2_5, airJson?.hourly?.time);
  const latestPm10 = getLatestMetricValue(airJson?.hourly?.pm10, airJson?.hourly?.time);

  const pollenIndex = averagePollenIndex(pollenJson?.hourly);
  const pollenTimestamp = Array.isArray(pollenJson?.hourly?.time)
    ? pollenJson.hourly.time[pollenJson.hourly.time.length - 1]
    : null;

  return {
    coordinates: { latitude, longitude },
    air: {
      usAqi: latestAqi?.value ?? null,
      europeanAqi: getLatestMetricValue(airJson?.hourly?.european_aqi, airJson?.hourly?.time)?.value ?? null,
      pm25: latestPm25?.value ?? null,
      pm10: latestPm10?.value ?? null,
      timestamp: latestAqi?.timestamp ?? airJson?.hourly?.time?.[airJson?.hourly?.time?.length - 1] ?? null,
    },
    pollen: {
      index: pollenIndex,
      timestamp: pollenTimestamp,
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
