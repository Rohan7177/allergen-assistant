import { NextResponse } from 'next/server';
import {
  fetchBatchCityAqi,
  fetchAirAndPollenForLocation,
  listAvailableCities,
  resolveAqiLevel,
  resolvePollenLevel,
} from '../../../lib/airQualityService';

const parseCities = (params) => {
  const raw = params.get('cities');
  if (!raw) return undefined;

  return raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
};

const buildJsonError = (message, status = 500) =>
  NextResponse.json({ message }, { status });

const textEncoder = new TextEncoder();

const createEventPayload = (event, data) => {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  return textEncoder.encode(`event: ${event}\ndata: ${payload}\n\n`);
};

const handleStream = (request, searchParams) => {
  const cities = parseCities(searchParams);
  const cityList = Array.isArray(cities) && cities.length > 0 ? cities : undefined;

  const stream = new ReadableStream({
    start(controller) {
      let cancelled = false;

      const sendHeartbeat = () => {
        if (cancelled) return;
        controller.enqueue(createEventPayload('heartbeat', { timestamp: Date.now() }));
      };

      const sendUpdate = async () => {
        if (cancelled) return;
        try {
          const results = await fetchBatchCityAqi(cityList);
          controller.enqueue(createEventPayload('update', { results }));
        } catch (error) {
          controller.enqueue(
            createEventPayload('error', {
              message: error?.message || 'Failed to refresh air quality metrics.',
            })
          );
        }
      };

      const updateInterval = setInterval(sendUpdate, 60_000);
      const heartbeatInterval = setInterval(sendHeartbeat, 15_000);

      sendUpdate();
      sendHeartbeat();

      const cleanup = () => {
        cancelled = true;
        clearInterval(updateInterval);
        clearInterval(heartbeatInterval);
        controller.close();
      };

      if (request.signal) {
        request.signal.addEventListener('abort', cleanup);
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
};

export async function GET(request) {
  const searchParams = request.nextUrl?.searchParams || new URL(request.url).searchParams;
  const mode = searchParams.get('mode');

  if (mode === 'stream') {
    return handleStream(request, searchParams);
  }

  const latParam = searchParams.get('lat');
  const lonParam = searchParams.get('lon');

  if (latParam !== null && lonParam !== null) {
    const latitude = Number.parseFloat(latParam);
    const longitude = Number.parseFloat(lonParam);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return buildJsonError('Latitude and longitude must be numeric values.', 400);
    }

    try {
      const metrics = await fetchAirAndPollenForLocation({ latitude, longitude });
      const fallbackAqi = metrics.air.usAqi ?? metrics.air.europeanAqi;
      const aqiLevel = resolveAqiLevel(fallbackAqi);
      const pollenLevel = resolvePollenLevel(metrics.pollen.index);

      return NextResponse.json({
        location: {
          coordinates: metrics.coordinates,
          label: 'Your Location',
        },
        metrics,
        aqiLevel,
        pollenLevel,
      });
    } catch (error) {
      return buildJsonError(
        error?.message || 'Failed to fetch air quality for the requested coordinates.',
        502
      );
    }
  }

  try {
    const cities = parseCities(searchParams);
    const results = await fetchBatchCityAqi(cities);

    return NextResponse.json({
      results,
      availableCities: listAvailableCities(),
    });
  } catch (error) {
    return buildJsonError(error?.message || 'Failed to fetch air quality data.');
  }
}
