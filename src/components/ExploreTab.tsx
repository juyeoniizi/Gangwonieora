import { useEffect, useMemo, useState } from 'react';
import {
  List,
  Map as MapIcon,
  MapPin,
  ArrowRight,
  Check,
  Navigation,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Search,
  X,
} from 'lucide-react';
import { getNaverMapDirectionsUrl, getNaverMapSearchUrl } from '../data/spaces';
import { AreaFilter, DistrictFilter, PurposeFilter, VacantSpace } from '../types/space';
import { NaverRealMap } from './NaverRealMap';
import { SpaceImage } from './SpaceImage';

interface ExploreTabProps {
  spaces: VacantSpace[];
  focusedSpaceId: string | null;
  onStartProposal: (space: VacantSpace) => void;
}

const DISTRICT_OPTIONS: Array<{ value: DistrictFilter; label: string }> = [
  { value: 'all', label: '전체' },
  { value: 'chuncheon', label: '춘천 명동' },
  { value: 'wonju', label: '원주 중앙동' },
];

const PURPOSE_OPTIONS: Array<{ value: PurposeFilter; label: string }> = [
  { value: 'all', label: '전체 목적' },
  { value: '생일카페', label: '생일카페' },
  { value: '팝업스토어', label: '팝업스토어' },
  { value: '전시', label: '전시' },
  { value: '공방', label: '공방' },
];

const AREA_OPTIONS: Array<{ value: AreaFilter; label: string }> = [
  { value: 'all', label: '평수 전체' },
  { value: 'small', label: '15평 이하' },
  { value: 'medium', label: '15~30평' },
  { value: 'large', label: '30평 이상' },
];

export function ExploreTab({ spaces, focusedSpaceId, onStartProposal }: ExploreTabProps) {
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [districtFilter, setDistrictFilter] = useState<DistrictFilter>('chuncheon');
  const [purposeFilter, setPurposeFilter] = useState<PurposeFilter>('all');
  const [areaFilter, setAreaFilter] = useState<AreaFilter>('all');
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(spaces[0]?.id || '');
  const [isSheetExpanded, setIsSheetExpanded] = useState<boolean>(false);

  useEffect(() => {
    if (focusedSpaceId) {
      const target = spaces.find((s) => s.id === focusedSpaceId);
      if (target) {
        setDistrictFilter(target.district);
        setPurposeFilter('all');
        setAreaFilter('all');
        setSearchQuery('');
        setSelectedSpaceId(target.id);
        setViewMode('map');
        setIsSheetExpanded(true);
      }
    }
  }, [focusedSpaceId, spaces]);

  const filteredSpaces = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return spaces.filter((space) => {
      if (districtFilter !== 'all' && space.district !== districtFilter) return false;
      if (purposeFilter !== 'all' && !space.purposes.includes(purposeFilter)) return false;
      if (areaFilter === 'small' && space.pyeong > 15) return false;
      if (areaFilter === 'medium' && (space.pyeong < 15 || space.pyeong > 30)) return false;
      if (areaFilter === 'large' && space.pyeong < 30) return false;
      if (q) {
        const haystack = `${space.name} ${space.address} ${space.districtName} ${space.highlight}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [spaces, districtFilter, purposeFilter, areaFilter, searchQuery]);

  const selectedSpace = useMemo(() => {
    return (
      filteredSpaces.find((s) => s.id === selectedSpaceId) ||
      filteredSpaces[0] ||
      null
    );
  }, [filteredSpaces, selectedSpaceId]);

  const handleSelectSpaceFromMap = (space: VacantSpace) => {
    setSelectedSpaceId(space.id);
    setIsSheetExpanded(false);
  };

  const handleSelectSpaceFromList = (space: VacantSpace) => {
    setSelectedSpaceId(space.id);
    setViewMode('map');
    setIsSheetExpanded(true);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setDistrictFilter('all');
    setPurposeFilter('all');
    setAreaFilter('all');
    if (spaces[0]) setSelectedSpaceId(spaces[0].id);
  };

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden bg-slate-50">
      {/* Compact 2-Row Naver-Style Top Search & Filter Dock */}
      <div className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 space-y-1.5 z-20">
        {/* Row 1: Search Input + District Select */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center flex-1 min-w-0">
            <Search className="w-3.5 h-3.5 text-[#03C75A] absolute left-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (e.target.value.trim() && districtFilter !== 'all') {
                  setDistrictFilter('all');
                }
              }}
              placeholder="춘천 명동·원주 중앙 상가 검색"
              className="w-full h-9 pl-8 pr-7 text-xs bg-slate-100 rounded-xl text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#03C75A]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="검색어 지우기"
                className="absolute right-2 text-slate-400 hover:text-slate-700"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <select
            aria-label="지역 선택"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value as DistrictFilter)}
            className="h-9 bg-[#0F3D6E] text-white rounded-xl px-2.5 text-[11px] font-bold focus:outline-none shrink-0"
          >
            {DISTRICT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* Row 2: Purpose Chips + Area Select */}
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1 min-w-0">
            {PURPOSE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPurposeFilter(opt.value)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                  purposeFilter === opt.value
                    ? 'bg-[#03C75A] text-white border-[#03C75A]'
                    : 'bg-white text-slate-600 border-slate-200'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <select
            aria-label="희망 평수"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value as AreaFilter)}
            className="h-7 bg-slate-100 rounded-lg px-2 text-[11px] font-semibold text-slate-700 focus:outline-none shrink-0"
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Content Area: Unobstructed Map OR Spacious List */}
      {viewMode === 'map' ? (
        <div className="relative flex-1 min-h-0 w-full">
          <NaverRealMap
            spaces={filteredSpaces}
            selectedSpaceId={selectedSpace?.id || null}
            onSelectSpace={handleSelectSpaceFromMap}
            districtFilter={districtFilter}
          />

          {/* Floating List Toggle Button */}
          <div
            className={`absolute left-1/2 -translate-x-1/2 z-[450] transition-all duration-200 ${
              isSheetExpanded ? 'hidden' : selectedSpace ? 'bottom-[122px]' : 'bottom-4'
            }`}
          >
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 min-h-[36px] bg-slate-900/90 backdrop-blur-md text-white text-xs font-bold rounded-full shadow-lg active:scale-95 transition-transform whitespace-nowrap"
            >
              <List className="w-3.5 h-3.5" />
              <span>상가 목록 ({filteredSpaces.length})</span>
            </button>
          </div>

          {filteredSpaces.length === 0 && (
            <div className="absolute bottom-4 left-3 right-3 z-[460] bg-white border border-slate-200 rounded-2xl p-4 shadow-xl text-center">
              <p className="text-sm font-bold text-slate-900">조건에 맞는 상가가 없습니다</p>
              <p className="text-xs text-slate-500 mt-1">검색어나 필터를 초기화해 보세요.</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F3D6E] rounded-xl"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>필터 초기화</span>
              </button>
            </div>
          )}

          {/* Slide-Up Bottom Sheet */}
          {selectedSpace && (
            <div
              className={`absolute left-0 right-0 bottom-0 z-[480] bg-white rounded-t-3xl border-t border-slate-200 shadow-[0_-8px_28px_rgba(15,23,42,0.14)] flex flex-col transition-all duration-200 ${
                isSheetExpanded ? 'max-h-[82%]' : 'h-[112px]'
              }`}
            >
              <button
                type="button"
                onClick={() => setIsSheetExpanded((v) => !v)}
                aria-label={isSheetExpanded ? '상세 정보 접기' : '상세 정보 펼치기'}
                className="w-full pt-1.5 pb-1 flex items-center justify-center shrink-0"
              >
                <span className="w-9 h-1 bg-slate-300 rounded-full" />
              </button>

              <div
                onClick={() => !isSheetExpanded && setIsSheetExpanded(true)}
                className="px-3.5 pb-2.5 flex gap-3 items-center shrink-0 cursor-pointer"
              >
                <div className="w-16 h-16 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                  <SpaceImage
                    src={selectedSpace.imageUrl}
                    alt={selectedSpace.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-semibold text-[#0D9488] truncate">
                      {!selectedSpace.isSeeded && '직접 등록 · '}
                      {selectedSpace.districtName} · {selectedSpace.floor} · {selectedSpace.pyeong}평
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsSheetExpanded((v) => !v);
                      }}
                      className="text-[11px] font-semibold text-slate-500 inline-flex items-center gap-0.5 shrink-0 py-0.5"
                    >
                      <span>{isSheetExpanded ? '접기' : '상세'}</span>
                      {isSheetExpanded ? (
                        <ChevronDown className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <h2 className="text-[14px] font-bold text-slate-900 leading-snug truncate mt-0.5">
                    {selectedSpace.name}
                  </h2>

                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className="text-[15px] font-bold text-[#0F3D6E] font-mono tabular-nums">
                      {selectedSpace.dailyPrice.toLocaleString()}원
                      <span className="text-[11px] font-normal text-slate-500"> / 일</span>
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onStartProposal(selectedSpace);
                      }}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#0F3D6E] hover:bg-[#0B2F55] rounded-xl inline-flex items-center gap-1 shrink-0"
                    >
                      <span>제안서 쓰기</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {isSheetExpanded && (
                <div className="px-4 pb-4 overflow-y-auto space-y-3.5 border-t border-slate-100 pt-3">
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href={getNaverMapSearchUrl(selectedSpace.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-[#03C75A] text-white text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <span>N 네이버 지도 위치</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={getNaverMapDirectionsUrl(selectedSpace)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5"
                    >
                      <Navigation className="w-3.5 h-3.5 text-[#0F3D6E]" />
                      <span>네이버 길찾기</span>
                    </a>
                  </div>

                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-xs">
                    <div className="flex items-start gap-1.5 text-slate-700 font-medium">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{selectedSpace.address}</span>
                    </div>
                    <p className="text-slate-600 pl-5 leading-relaxed">
                      전용 {selectedSpace.pyeong}평 ({selectedSpace.sqm}㎡) · 추천: {selectedSpace.purposes.join(', ')}
                    </p>
                    <p className="text-slate-500 pl-5 leading-relaxed">
                      {selectedSpace.footTraffic}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-xs font-bold text-slate-900 mb-2">기본 시설 옵션</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {selectedSpace.facilities.map((fac) => (
                        <div key={fac} className="flex items-center gap-1.5 text-xs text-slate-700">
                          <Check className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                          <span className="truncate">{fac}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-3 text-xs text-slate-700 leading-relaxed">
                    <span className="font-bold text-[#0F3D6E] block mb-0.5">건물주 안내</span>
                    {selectedSpace.landlordNote}
                  </div>

                  <p className="text-[11px] text-slate-400 text-center">
                    {selectedSpace.isSeeded
                      ? '시연용 기본 매물 · 실제 강원 원도심 상권 좌표 연동'
                      : 'Firestore DB에 실시간 등록된 건물주 매물입니다'}
                  </p>

                  <button
                    type="button"
                    onClick={() => onStartProposal(selectedSpace)}
                    className="w-full h-12 rounded-xl bg-[#0F3D6E] text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
                  >
                    <span>이 공간으로 AI 제안서 쓰기</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="relative flex-1 overflow-y-auto pt-3 pb-20 px-3 space-y-3">
          {filteredSpaces.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center mt-4">
              <p className="text-sm font-bold text-slate-900">조건에 맞는 상가가 없습니다</p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-3 px-4 py-2 text-xs font-semibold text-white bg-[#0F3D6E] rounded-xl"
              >
                전체 상가 보기
              </button>
            </div>
          ) : (
            filteredSpaces.map((space) => (
              <article
                key={space.id}
                className="bg-white border border-slate-200 rounded-2xl overflow-hidden"
              >
                <div
                  onClick={() => handleSelectSpaceFromList(space)}
                  className="p-3.5 flex gap-3.5 cursor-pointer active:bg-slate-50"
                >
                  <div className="w-24 h-24 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    <SpaceImage
                      src={space.imageUrl}
                      alt={space.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <p className="text-[11px] font-semibold text-[#0D9488]">
                        {!space.isSeeded && '신규 등록 · '}
                        {space.districtName} · {space.floor} · {space.pyeong}평
                      </p>
                      <h2 className="text-sm font-bold text-slate-900 leading-snug mt-0.5 line-clamp-1">
                        {space.name}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {space.highlight}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <span className="text-sm font-bold text-[#0F3D6E] font-mono tabular-nums">
                        {space.dailyPrice.toLocaleString()}원
                        <span className="text-[11px] font-normal text-slate-500"> / 일</span>
                      </span>
                      <span className="text-xs font-semibold text-slate-500">
                        지도 보기 →
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-3.5 py-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <a
                    href={getNaverMapSearchUrl(space.address)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-[#03C75A] inline-flex items-center gap-1 py-1"
                  >
                    <span>N 네이버 지도 확인</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    type="button"
                    onClick={() => onStartProposal(space)}
                    className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#0F3D6E] rounded-lg"
                  >
                    AI 제안서 쓰기
                  </button>
                </div>
              </article>
            ))
          )}
        </div>
      )}

      {viewMode === 'list' && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[450]">
          <button
            type="button"
            onClick={() => setViewMode('map')}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[40px] bg-[#0F3D6E] text-white text-xs font-bold rounded-full shadow-lg active:scale-95 transition-transform whitespace-nowrap"
          >
            <MapIcon className="w-3.5 h-3.5" />
            <span>지도 보기로 전환</span>
          </button>
        </div>
      )}
    </div>
  );
}
