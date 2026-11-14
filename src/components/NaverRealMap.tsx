import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { ExternalLink, LocateFixed, Minus, Plus } from 'lucide-react';
import { DistrictFilter, VacantSpace } from '../types/space';
import { getNaverMapSearchUrl } from '../data/spaces';

interface NaverRealMapProps {
  spaces: VacantSpace[];
  selectedSpaceId: string | null;
  onSelectSpace: (space: VacantSpace) => void;
  districtFilter: DistrictFilter;
}

declare global {
  interface Window {
    naver?: {
      maps: {
        Map: new (el: HTMLElement, opts: Record<string, unknown>) => NaverMapInstance;
        LatLng: new (lat: number, lng: number) => unknown;
        Point: new (x: number, y: number) => unknown;
        Marker: new (opts: Record<string, unknown>) => NaverMarkerInstance;
        Event: {
          addListener: (target: unknown, event: string, handler: () => void) => void;
        };
      };
    };
    navermap_authFailure?: () => void;
  }
}

interface NaverMapInstance {
  setCenter: (latlng: unknown) => void;
  setZoom: (zoom: number, effect?: boolean) => void;
  getZoom: () => number;
  panTo: (latlng: unknown) => void;
  destroy?: () => void;
}

interface NaverMarkerInstance {
  setMap: (map: NaverMapInstance | null) => void;
}

const DISTRICT_CENTERS: Record<DistrictFilter, { lat: number; lng: number; zoom: number }> = {
  all: { lat: 37.615, lng: 127.84, zoom: 9 },
  chuncheon: { lat: 37.8797, lng: 127.7276, zoom: 16 },
  wonju: { lat: 37.3484, lng: 127.9475, zoom: 16 },
};

function createNaverStyleMarkerHtml(space: VacantSpace, isSelected: boolean): string {
  const manWon = (space.dailyPrice / 10000).toFixed(space.dailyPrice % 10000 === 0 ? 0 : 1);
  const bg = isSelected ? '#03C75A' : '#FFFFFF';
  const text = isSelected ? '#FFFFFF' : '#0F172A';
  const border = isSelected ? '#029E48' : '#03C75A';
  const badgeBg = isSelected ? '#FFFFFF' : '#03C75A';
  const badgeText = isSelected ? '#03C75A' : '#FFFFFF';
  const shadow = isSelected
    ? '0 8px 22px rgba(3,199,90,0.38)'
    : '0 3px 10px rgba(15,23,42,0.18)';

  return `
    <div style="display:flex;flex-direction:column;align-items:center;transform:translate(-50%,-100%);cursor:pointer;">
      <div style="display:flex;align-items:center;gap:5px;background:${bg};color:${text};border:1.5px solid ${border};border-radius:9999px;padding:3px 9px 3px 4px;font-size:11px;font-weight:700;white-space:nowrap;box-shadow:${shadow};line-height:1.2;">
        <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:9999px;background:${badgeBg};color:${badgeText};font-size:9px;font-weight:800;">
          ${space.isSeeded ? 'N' : '신'}
        </span>
        <span>일 ${manWon}만 · ${space.pyeong}평</span>
      </div>
      <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:6px solid ${border};margin-top:-1px;"></div>
    </div>
  `;
}

export function NaverRealMap({
  spaces,
  selectedSpaceId,
  onSelectSpace,
  districtFilter,
}: NaverRealMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<L.Marker[]>([]);
  const naverMapRef = useRef<NaverMapInstance | null>(null);
  const naverMarkersRef = useRef<NaverMarkerInstance[]>([]);

  const naverClientId = import.meta.env.VITE_NAVER_MAP_CLIENT_ID as string | undefined;
  const [mapEngine, setMapEngine] = useState<'naver' | 'leaflet'>(
    naverClientId && naverClientId.trim() !== '' ? 'naver' : 'leaflet'
  );

  // Official Naver Maps JS API v3 when VITE_NAVER_MAP_CLIENT_ID is configured
  useEffect(() => {
    if (mapEngine !== 'naver' || !naverClientId) return;

    let cancelled = false;

    window.navermap_authFailure = () => {
      if (!cancelled) {
        setMapEngine('leaflet');
      }
    };

    const mountNaverMap = () => {
      if (cancelled || !mapContainerRef.current || !window.naver?.maps) return;
      const center = DISTRICT_CENTERS[districtFilter];
      const map = new window.naver.maps.Map(mapContainerRef.current, {
        center: new window.naver.maps.LatLng(center.lat, center.lng),
        zoom: center.zoom,
        zoomControl: false,
        mapDataControl: false,
      });
      naverMapRef.current = map;
    };

    if (window.naver?.maps) {
      mountNaverMap();
    } else {
      const script = document.createElement('script');
      script.src = `https://oapi.map.naver.com/openapi/v3/maps.js?ncpKeyId=${encodeURIComponent(
        naverClientId.trim()
      )}`;
      script.async = true;
      script.onload = () => mountNaverMap();
      script.onerror = () => {
        if (!cancelled) setMapEngine('leaflet');
      };
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      naverMarkersRef.current.forEach((m) => m.setMap(null));
      naverMarkersRef.current = [];
      naverMapRef.current?.destroy?.();
      naverMapRef.current = null;
    };
  }, [mapEngine, naverClientId]);

  useEffect(() => {
    if (mapEngine !== 'naver' || !naverMapRef.current || !window.naver?.maps) return;

    naverMarkersRef.current.forEach((m) => m.setMap(null));
    naverMarkersRef.current = [];

    spaces.forEach((space) => {
      const isSelected = space.id === selectedSpaceId;
      const marker = new window.naver!.maps.Marker({
        position: new window.naver!.maps.LatLng(space.coords.lat, space.coords.lng),
        map: naverMapRef.current,
        icon: {
          content: createNaverStyleMarkerHtml(space, isSelected),
          anchor: new window.naver!.maps.Point(0, 0),
        },
        zIndex: isSelected ? 100 : 10,
      });
      window.naver!.maps.Event.addListener(marker, 'click', () => {
        onSelectSpace(space);
      });
      naverMarkersRef.current.push(marker);
    });
  }, [mapEngine, spaces, selectedSpaceId, onSelectSpace]);

  // Naver-style clean bright map tiles via same-origin server proxy (/api/tiles -> Carto Voyager / OSM)
  useEffect(() => {
    if (mapEngine !== 'leaflet' || !mapContainerRef.current) return;

    const container = mapContainerRef.current;
    const initial = DISTRICT_CENTERS[districtFilter];
    const map = L.map(container, {
      center: [initial.lat, initial.lng],
      zoom: initial.zoom,
      zoomControl: false,
      attributionControl: true,
    });

    const tileLayer = L.tileLayer('/api/tiles/{z}/{x}/{y}', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      maxZoom: 19,
      maxNativeZoom: 19,
      crossOrigin: false,
    });

    tileLayer.addTo(map);
    leafletMapRef.current = map;

    const resizeObserver = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    resizeObserver.observe(container);

    const rafId = requestAnimationFrame(() => map.invalidateSize({ animate: false }));
    const timerId = window.setTimeout(() => map.invalidateSize({ animate: false }), 180);

    return () => {
      cancelAnimationFrame(rafId);
      clearTimeout(timerId);
      resizeObserver.disconnect();
      leafletMarkersRef.current.forEach((m) => m.remove());
      leafletMarkersRef.current = [];
      map.remove();
      leafletMapRef.current = null;
    };
  }, [mapEngine]);

  useEffect(() => {
    if (mapEngine !== 'leaflet' || !leafletMapRef.current) return;
    const map = leafletMapRef.current;

    leafletMarkersRef.current.forEach((m) => m.remove());
    leafletMarkersRef.current = [];

    spaces.forEach((space) => {
      const isSelected = space.id === selectedSpaceId;
      const icon = L.divIcon({
        className: 'gangwon-map-marker',
        html: createNaverStyleMarkerHtml(space, isSelected),
        iconSize: [0, 0],
        iconAnchor: [0, 0],
      });

      const marker = L.marker([space.coords.lat, space.coords.lng], {
        icon,
        zIndexOffset: isSelected ? 500 : 0,
      })
        .addTo(map)
        .on('click', () => onSelectSpace(space));

      leafletMarkersRef.current.push(marker);
    });
  }, [mapEngine, spaces, selectedSpaceId, onSelectSpace]);

  useEffect(() => {
    const target = DISTRICT_CENTERS[districtFilter];
    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      if (districtFilter === 'all' && spaces.length > 1) {
        const bounds = L.latLngBounds(spaces.map((s) => [s.coords.lat, s.coords.lng]));
        leafletMapRef.current.fitBounds(bounds, { padding: [44, 44], maxZoom: 14 });
      } else {
        leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 0.45 });
      }
    } else if (mapEngine === 'naver' && naverMapRef.current && window.naver?.maps) {
      naverMapRef.current.setCenter(new window.naver.maps.LatLng(target.lat, target.lng));
      naverMapRef.current.setZoom(target.zoom, true);
    }
  }, [districtFilter, mapEngine]);

  useEffect(() => {
    if (!selectedSpaceId) return;
    const space = spaces.find((s) => s.id === selectedSpaceId);
    if (!space) return;

    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      const currentZoom = leafletMapRef.current.getZoom();
      leafletMapRef.current.flyTo(
        [space.coords.lat, space.coords.lng],
        Math.max(currentZoom, 15),
        { duration: 0.35 }
      );
    } else if (mapEngine === 'naver' && naverMapRef.current && window.naver?.maps) {
      naverMapRef.current.panTo(new window.naver.maps.LatLng(space.coords.lat, space.coords.lng));
    }
  }, [selectedSpaceId, mapEngine]);

  const handleZoomIn = () => {
    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomIn();
    } else if (mapEngine === 'naver' && naverMapRef.current) {
      naverMapRef.current.setZoom(naverMapRef.current.getZoom() + 1, true);
    }
  };

  const handleZoomOut = () => {
    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      leafletMapRef.current.zoomOut();
    } else if (mapEngine === 'naver' && naverMapRef.current) {
      naverMapRef.current.setZoom(naverMapRef.current.getZoom() - 1, true);
    }
  };

  const handleRecenter = () => {
    const target = DISTRICT_CENTERS[districtFilter];
    if (mapEngine === 'leaflet' && leafletMapRef.current) {
      if (districtFilter === 'all' && spaces.length > 0) {
        const bounds = L.latLngBounds(spaces.map((s) => [s.coords.lat, s.coords.lng]));
        leafletMapRef.current.fitBounds(bounds, { padding: [44, 44], maxZoom: 14 });
      } else {
        leafletMapRef.current.flyTo([target.lat, target.lng], target.zoom, { duration: 0.4 });
      }
    } else if (mapEngine === 'naver' && naverMapRef.current && window.naver?.maps) {
      naverMapRef.current.setCenter(new window.naver.maps.LatLng(target.lat, target.lng));
      naverMapRef.current.setZoom(target.zoom, true);
    }
  };

  const selectedSpace = spaces.find((s) => s.id === selectedSpaceId) || spaces[0];
  const naverLinkUrl = selectedSpace
    ? getNaverMapSearchUrl(selectedSpace.address)
    : getNaverMapSearchUrl(
        districtFilter === 'wonju' ? '원주시 중앙동 문화의거리' : '춘천시 조양동 명동길'
      );

  return (
    <div className="relative w-full h-full">
      <div
        ref={mapContainerRef}
        className={`w-full h-full z-0 ${
          mapEngine === 'leaflet' ? 'saturate-[1.06] brightness-[1.02]' : ''
        }`}
      />

      {/* Naver-Style Stacked Right Controls */}
      <div className="absolute right-2.5 top-2.5 z-[400] bg-white/95 backdrop-blur-md border border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col divide-y divide-slate-200">
        <button
          type="button"
          onClick={handleZoomIn}
          aria-label="지도 확대"
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleZoomOut}
          aria-label="지도 축소"
          className="w-8 h-8 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:bg-slate-100"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={handleRecenter}
          aria-label="상권 중심으로 이동"
          className="w-8 h-8 flex items-center justify-center text-[#03C75A] hover:bg-slate-50 active:bg-slate-100"
        >
          <LocateFixed className="w-4 h-4" />
        </button>
      </div>

      {/* Direct Naver Map Link in Top-Left */}
      <a
        href={naverLinkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute left-2.5 top-2.5 z-[400] inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-[#03C75A] hover:bg-[#02b350] text-white text-[11px] font-bold rounded-xl shadow-sm transition-colors whitespace-nowrap"
      >
        <span className="font-extrabold">N</span>
        <span>네이버 지도 앱에서 열기</span>
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
