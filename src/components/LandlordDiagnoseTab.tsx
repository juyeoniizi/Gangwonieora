import { useState, ChangeEvent, FormEvent, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  Building2,
  Upload,
  CheckCircle2,
  TrendingUp,
  Lightbulb,
  Users,
  MapPin,
  Loader2,
  ExternalLink,
  ArrowRight,
} from 'lucide-react';
import { SAMPLE_UPLOAD_IMAGES, getNaverMapSearchUrl } from '../data/spaces';
import { geocodeGangwonAddress } from '../lib/geocode';
import { registerSpaceInDb, saveDiagnosisInDb } from '../lib/firebase';
import { DiagnosisReport, SpaceImageKey, VacantSpace } from '../types/space';
import { SpaceImage } from './SpaceImage';

interface LandlordDiagnoseTabProps {
  user: User | null;
  onRequireSignIn: () => Promise<User | null>;
  onSpaceRegistered: (space: VacantSpace) => void;
}

const QUICK_FEATURES = [
  '전면 통유리',
  '주차 가능',
  '오래된 카페 인테리어 잔존',
  '급배수·싱크대 완비',
  '높은 층고 (3.5m+)',
  '야외 테라스/옥상',
];

export function LandlordDiagnoseTab({
  user,
  onRequireSignIn,
  onSpaceRegistered,
}: LandlordDiagnoseTabProps) {
  const [location, setLocation] = useState('강원특별자치도 춘천시 조양동 명동길 21');
  const [floor, setFloor] = useState('1층');
  const [pyeong, setPyeong] = useState('25');
  const [features, setFeatures] = useState('전면 통유리, 주차 가능, 오래된 카페 인테리어 잔존, 냉난방기 설치');
  const [spaceName, setSpaceName] = useState('');
  const [selectedImageKey, setSelectedImageKey] = useState<SpaceImageKey>('glass');
  const [previewPhoto, setPreviewPhoto] = useState<string>(SAMPLE_UPLOAD_IMAGES[0].url);
  const [photoLabel, setPhotoLabel] = useState<string>('샘플 사진 #1 (춘천 명동 1층 통유리)');

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingSpace, setIsSavingSpace] = useState(false);
  const [report, setReport] = useState<DiagnosisReport | null>(null);
  const [registeredSpace, setRegisteredSpace] = useState<VacantSpace | null>(null);
  const [savedDiagnosisToast, setSavedDiagnosisToast] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const reportAnchorRef = useRef<HTMLDivElement | null>(null);

  const applyPreset = (preset: 'chuncheon' | 'wonju') => {
    setRegisteredSpace(null);
    setErrorMessage(null);
    if (preset === 'chuncheon') {
      setLocation('강원특별자치도 춘천시 효자동 강원대학길 15');
      setFloor('1층');
      setPyeong('22');
      setSpaceName('춘천 강원대 후문 1층 22평 통유리 상가');
      setFeatures('전면 통유리, 주차 가능, 오래된 카페 인테리어 잔존, 220V 콘센트 다수');
      setSelectedImageKey('glass');
      setPreviewPhoto(SAMPLE_UPLOAD_IMAGES[0].url);
      setPhotoLabel('샘플 사진 #1 (통유리 상가형)');
    } else {
      setLocation('강원특별자치도 원주시 중앙동 중앙시장길 48');
      setFloor('2층');
      setPyeong('30');
      setSpaceName('원주 중앙동 문화의거리 2층 30평 스튜디오');
      setFeatures('노출 콘크리트 벽면, 높은 층고 (3.5m+), 화물 엘리베이터, 공영주차장 인접');
      setSelectedImageKey('concrete');
      setPreviewPhoto(SAMPLE_UPLOAD_IMAGES[1].url);
      setPhotoLabel('샘플 사진 #2 (노출 콘크리트형)');
    }
  };

  const toggleFeatureChip = (chip: string) => {
    setFeatures((prev) => {
      if (prev.includes(chip)) return prev;
      return prev.trim() ? `${prev.trim()}, ${chip}` : chip;
    });
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPreviewPhoto(reader.result);
        setPhotoLabel(`업로드: ${file.name}`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setRegisteredSpace(null);
    setSavedDiagnosisToast(false);
    setErrorMessage(null);

    setTimeout(() => {
      reportAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    try {
      const response = await fetch('/api/diagnose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          location,
          floor,
          pyeong: Number(pyeong) || 25,
          features,
          hasPhoto: Boolean(previewPhoto),
        }),
      });
      const data: DiagnosisReport = await response.json();
      setReport(data);

      // Automatically persist diagnosis to Firestore if user is signed in
      if (user) {
        try {
          await saveDiagnosisInDb(
            { location, floor, pyeong: Number(pyeong) || 25, features },
            data,
            user.uid
          );
          setSavedDiagnosisToast(true);
        } catch (dbErr) {
          console.warn('Diagnosis DB save skipped:', dbErr);
        }
      }
    } catch {
      setErrorMessage('AI 진단 요청 중 네트워크 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterToLiveMap = async () => {
    if (!report) return;
    setErrorMessage(null);
    setIsSavingSpace(true);

    try {
      let activeUser = user;
      if (!activeUser) {
        activeUser = await onRequireSignIn();
        if (!activeUser) {
          setIsSavingSpace(false);
          return;
        }
      }

      if (!savedDiagnosisToast) {
        await saveDiagnosisInDb(
          { location, floor, pyeong: Number(pyeong) || 25, features },
          report,
          activeUser.uid
        );
        setSavedDiagnosisToast(true);
      }

      const geo = await geocodeGangwonAddress(location);
      const areaNum = Number(pyeong) || 25;
      const derivedName =
        spaceName.trim() ||
        `${geo.districtName} ${floor} ${areaNum}평 유휴 상가`;

      const topPurposes: Array<'생일카페' | '팝업스토어' | '전시' | '공방'> = [];
      const joinedCategories = report.topPurposes.map((p) => p.category).join(' ');
      if (joinedCategories.includes('생일')) topPurposes.push('생일카페');
      if (joinedCategories.includes('팝업')) topPurposes.push('팝업스토어');
      if (joinedCategories.includes('전시')) topPurposes.push('전시');
      if (joinedCategories.includes('공방')) topPurposes.push('공방');
      if (topPurposes.length === 0) topPurposes.push('팝업스토어', '생일카페');

      const facilityList = features
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 6);

      const created = await registerSpaceInDb(
        {
          name: derivedName,
          district: geo.district,
          districtName: geo.districtName,
          address: location,
          floor,
          pyeong: areaNum,
          dailyPrice: report.pricingSimulation.recommendedDailyRate,
          purposes: topPurposes,
          facilities: facilityList.length > 0 ? facilityList : ['냉난방기 완비'],
          highlight: report.districtInsight.headline,
          landlordNote: `AI 공실 진단 리포트 기반 등록 상가입니다. ${report.setupTips[0]?.title || '원상복구 준수 시 단기 대여 환영합니다.'}`,
          footTraffic: report.districtInsight.footTrafficPeak,
          imageKey: selectedImageKey,
          lat: geo.lat,
          lng: geo.lng,
        },
        activeUser.uid
      );

      setRegisteredSpace(created);
    } catch (err) {
      console.error(err);
      setErrorMessage('상가 등록 중 오류가 발생했습니다. 로그인 상태를 확인해 주세요.');
    } finally {
      setIsSavingSpace(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50 px-4 py-4 space-y-4">
      {/* Intro Banner */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
        <div>
          <p className="text-[11px] font-bold text-[#0D9488]">건물주 맞춤 분석 · 실시간 DB 등록</p>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5 leading-snug">
            내 빈 상가 진단하고 지도에 바로 올리기
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            AI가 주변 상권과 적정 대여료를 분석한 뒤, 원하시면 실제 공실 지도에 즉시 매물을 등록합니다.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => applyPreset('chuncheon')}
            className="min-h-[38px] px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-xl"
          >
            춘천 강원대 앞 샘플
          </button>
          <button
            type="button"
            onClick={() => applyPreset('wonju')}
            className="min-h-[38px] px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-xl"
          >
            원주 중앙동 2층 샘플
          </button>
        </div>
      </div>

      {/* Input Form */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#0F3D6E]" />
            상가 정보 입력
          </h2>
          <a
            href={getNaverMapSearchUrl(location)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] font-bold text-[#03C75A] inline-flex items-center gap-1"
          >
            <span>N 네이버 지도 확인</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        <div>
          <label htmlFor="m-store-location" className="block text-xs font-semibold text-slate-700 mb-1">
            상가 위치 (도로명 주소)
          </label>
          <input
            id="m-store-location"
            type="text"
            required
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
          />
        </div>

        <div>
          <label htmlFor="m-store-name" className="block text-xs font-semibold text-slate-700 mb-1">
            지도에 표시할 상가 이름 (선택)
          </label>
          <input
            id="m-store-name"
            type="text"
            value={spaceName}
            onChange={(e) => setSpaceName(e.target.value)}
            placeholder="예: 춘천 명동길 1층 25평 통유리 상가"
            className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="m-store-floor" className="block text-xs font-semibold text-slate-700 mb-1">
              층수
            </label>
            <select
              id="m-store-floor"
              value={floor}
              onChange={(e) => setFloor(e.target.value)}
              className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
            >
              <option value="지하 1층">지하 1층</option>
              <option value="1층">1층</option>
              <option value="2층">2층</option>
              <option value="3층 이상">3층 이상</option>
            </select>
          </div>

          <div>
            <label htmlFor="m-store-pyeong" className="block text-xs font-semibold text-slate-700 mb-1">
              면적 (평)
            </label>
            <div className="relative">
              <input
                id="m-store-pyeong"
                type="number"
                min={5}
                max={200}
                required
                value={pyeong}
                onChange={(e) => setPyeong(e.target.value)}
                className="w-full min-h-[44px] px-3 pr-8 text-sm font-mono tabular-nums border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">평</span>
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="m-store-features" className="block text-xs font-semibold text-slate-700 mb-1">
            현재 상태 및 공간 특징
          </label>
          <textarea
            id="m-store-features"
            rows={2}
            required
            value={features}
            onChange={(e) => setFeatures(e.target.value)}
            className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E] resize-none"
          />
          <div className="mt-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
            {QUICK_FEATURES.map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => toggleFeatureChip(chip)}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 bg-slate-100 active:bg-slate-200 rounded-lg whitespace-nowrap shrink-0"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        {/* Photo Upload Simulation */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-700">현장 사진 첨부</span>
            <label className="inline-flex items-center gap-1 text-xs font-bold text-[#0D9488] cursor-pointer py-1">
              <Upload className="w-3.5 h-3.5" />
              <span>사진 업로드</span>
              <input type="file" accept="image/*" onChange={handleFileUpload} className="sr-only" />
            </label>
          </div>
          <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
            <div className="h-28 w-full overflow-hidden">
              <SpaceImage src={previewPhoto} alt={photoLabel} className="w-full h-full object-cover" />
            </div>
            <div className="px-3 py-2 bg-white border-t border-slate-100 flex items-center justify-between gap-2">
              <span className="text-[11px] text-slate-500 truncate">{photoLabel}</span>
              <div className="flex items-center gap-1 shrink-0">
                {SAMPLE_UPLOAD_IMAGES.map((s, idx) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => {
                      setSelectedImageKey(s.key);
                      setPreviewPhoto(s.url);
                      setPhotoLabel(`샘플 #${idx + 1} (${s.label})`);
                    }}
                    className={`px-2 py-1 text-[10px] font-semibold rounded-md ${
                      selectedImageKey === s.key
                        ? 'bg-[#0F3D6E] text-white'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    #{idx + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-[#0F3D6E] hover:bg-[#0B2F55] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 상권·공실 분석 중...</span>
            </>
          ) : (
            <span>AI 상권 및 공실 진단하기</span>
          )}
        </button>
      </form>

      <div ref={reportAnchorRef} />

      {errorMessage && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs font-semibold text-rose-700">
          {errorMessage}
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse">
          <div className="h-5 w-2/3 bg-slate-200 rounded" />
          <div className="h-20 bg-slate-100 rounded-xl" />
          <div className="h-24 bg-slate-100 rounded-xl" />
        </div>
      )}

      {report && !isLoading && (
        <div className="space-y-3 pb-4">
          <div className="bg-[#0F3D6E] text-white rounded-2xl p-4">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-semibold text-emerald-300">
                AI 공실 진단 리포트 완료
              </span>
              {savedDiagnosisToast && (
                <span className="text-[10px] font-semibold text-emerald-200">
                  DB 저장 완료
                </span>
              )}
            </div>
            <h3 className="text-base font-bold leading-snug">{report.summaryTitle}</h3>
          </div>

          {/* 1. 주변 상권 분석 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <MapPin className="w-4 h-4 text-[#0D9488]" />
              01. 주변 상권 및 유동인구 특성
            </h4>
            <p className="text-xs font-bold text-[#0F3D6E]">{report.districtInsight.headline}</p>
            <p className="text-xs text-slate-700 leading-relaxed">{report.districtInsight.demographics}</p>
            <div className="bg-slate-50 rounded-xl p-2.5 text-[11px] space-y-1 text-slate-600">
              <p>
                <strong className="text-slate-800">피크 시간대:</strong> {report.districtInsight.footTrafficPeak}
              </p>
              <p>
                <strong className="text-slate-800">공간 강점:</strong> {report.districtInsight.spaceStrength}
              </p>
            </div>
          </div>

          {/* 2. 추천 단기 업종 TOP 3 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Users className="w-4 h-4 text-[#0D9488]" />
              02. 추천 단기 활용 업종 TOP 3
            </h4>
            <div className="divide-y divide-slate-100">
              {report.topPurposes.map((item) => (
                <div key={item.rank} className="py-2.5 first:pt-0 last:pb-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      <span className="font-mono text-[#0D9488] mr-1">0{item.rank}</span>
                      {item.category}
                    </span>
                    <span className="text-[11px] font-semibold text-[#0F3D6E] shrink-0">
                      {item.fitScore}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{item.reason}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">{item.expectedVisitors}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. 적정 임대료 & 수익 시뮬레이션 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-[#0D9488]" />
              03. 적정 임대료 및 예상 수익 시뮬레이션
            </h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block">추천 일일 대여료</span>
                <span className="text-base font-bold text-[#0F3D6E] font-mono tabular-nums">
                  {report.pricingSimulation.recommendedDailyRate.toLocaleString()}원
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block">주말 3일 패키지</span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {report.pricingSimulation.threeDayRate.toLocaleString()}원
                </span>
              </div>
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                <span className="text-[11px] text-slate-500 block">7일 주간 패키지</span>
                <span className="text-base font-bold text-slate-900 font-mono tabular-nums">
                  {report.pricingSimulation.weeklyRate.toLocaleString()}원
                </span>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                <span className="text-[11px] text-emerald-800 block">
                  월 {report.pricingSimulation.assumedOperatingDays}일 가동 수익
                </span>
                <span className="text-base font-bold text-emerald-700 font-mono tabular-nums">
                  {report.pricingSimulation.monthlyPotentialRevenue.toLocaleString()}원
                </span>
              </div>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {report.pricingSimulation.vacancyLossSaved}
            </p>
          </div>

          {/* 4. 공간 세팅 팁 */}
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Lightbulb className="w-4 h-4 text-[#0D9488]" />
              04. 청년 기획자 유치를 위한 세팅 팁
            </h4>
            <div className="space-y-2">
              {report.setupTips.map((tip, idx) => (
                <div key={tip.title} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs font-bold text-slate-900">
                    {idx + 1}. {tip.title}
                  </p>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{tip.detail}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Real Firestore Space Registration CTA */}
          {registeredSpace ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>실제 DB 및 지도에 상가가 등록되었습니다!</span>
              </div>
              <button
                type="button"
                onClick={() => onSpaceRegistered(registeredSpace)}
                className="w-full h-11 rounded-xl bg-[#0F3D6E] text-white text-xs font-bold flex items-center justify-center gap-1.5"
              >
                <span>지도에서 방금 등록한 상가 보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              disabled={isSavingSpace}
              onClick={handleRegisterToLiveMap}
              className="w-full h-12 rounded-xl bg-[#03C75A] hover:bg-[#02b350] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 transition-colors"
            >
              {isSavingSpace ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>주소 좌표 변환 및 DB 저장 중...</span>
                </>
              ) : (
                <span>
                  {user ? '실제 DB·지도에 공실 바로 등록하기' : 'Google 로그인 후 지도에 등록하기'}
                </span>
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
