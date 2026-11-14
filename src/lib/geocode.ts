export interface GeocodeResult {
  lat: number;
  lng: number;
  district: 'chuncheon' | 'wonju';
  districtName: string;
}

export async function geocodeGangwonAddress(address: string): Promise<GeocodeResult> {
  const isWonju =
    address.includes('원주') ||
    address.includes('중앙동') ||
    address.includes('일산동') ||
    address.includes('단계동') ||
    address.includes('평원로');

  const fallback: GeocodeResult = isWonju
    ? {
        lat: 37.3485 + (Math.random() - 0.5) * 0.003,
        lng: 127.9475 + (Math.random() - 0.5) * 0.004,
        district: 'wonju',
        districtName: '원주 중앙동',
      }
    : {
        lat: 37.8798 + (Math.random() - 0.5) * 0.003,
        lng: 127.7276 + (Math.random() - 0.5) * 0.004,
        district: 'chuncheon',
        districtName: '춘천 명동',
      };

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&q=${encodeURIComponent(
      address
    )}`;
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);

    if (!res.ok) return fallback;
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    if (Array.isArray(data) && data[0]?.lat && data[0]?.lon) {
      const lat = Number(data[0].lat);
      const lng = Number(data[0].lon);
      if (lat >= 36.5 && lat <= 38.7 && lng >= 127.0 && lng <= 129.5) {
        return {
          lat,
          lng,
          district: isWonju || lat < 37.6 ? 'wonju' : 'chuncheon',
          districtName: isWonju || lat < 37.6 ? '원주 중앙동' : '춘천 명동',
        };
      }
    }
    return fallback;
  } catch {
    return fallback;
  }
}
