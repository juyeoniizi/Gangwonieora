import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

interface DiagnoseRequestBody {
  location?: string;
  floor?: string;
  pyeong?: number | string;
  features?: string;
  hasPhoto?: boolean;
}

interface ProposalRequestBody {
  spaceName?: string;
  spaceAddress?: string;
  spaceFloor?: string;
  spacePyeong?: number;
  spaceDailyPrice?: number;
  period?: string;
  budget?: string;
  intent?: string;
  applicantName?: string;
}

function buildFallbackDiagnosis(input: DiagnoseRequestBody) {
  const location = (input.location || '강원특별자치도 춘천시 조양동 명동길').trim();
  const floor = (input.floor || '1층').trim();
  const pyeong = Number(input.pyeong) || 25;
  const features = (input.features || '전면 통유리, 냉난방기 완비').trim();

  const isWonju = location.includes('원주') || location.includes('중앙동') || location.includes('일산동');
  const isFirstFloor = floor.includes('1층') || floor === '1';

  const districtLabel = isWonju ? '원주 중앙동·문화의거리 권역' : '춘천 명동·조양동 권역';
  const nearbyUniv = isWonju ? '연세대 미래캠퍼스·상지대·강릉원주대 학생층 및 주말 나들이객' : '강원대·한림대 대학생 및 경춘선 ITX 주말 관광객';

  const basePerPyeong = isFirstFloor ? 3300 : 2300;
  const dailyRecommended = Math.round((pyeong * basePerPyeong) / 5000) * 5000;
  const clampedDaily = Math.max(45000, Math.min(180000, dailyRecommended));
  const threeDayPackage = Math.round((clampedDaily * 3 * 0.92) / 5000) * 5000;
  const weeklyPackage = Math.round((clampedDaily * 7 * 0.82) / 5000) * 5000;
  const monthlySimulated = clampedDaily * 14;

  return {
    source: 'simulation' as const,
    summaryTitle: `${districtLabel} ${floor} ${pyeong}평 상가 공실 활용 진단`,
    districtInsight: {
      headline: `${districtLabel} 주말·방과 후 청년 유입 밀집 구역`,
      demographics: `${nearbyUniv} 중심의 1030 방문객 비중이 약 68%를 차지합니다. 특히 금~일요일 오후 13시~19시 사이 SNS 검색 후 목적형 방문(팝업·생일카페·전시) 비율이 높아, 1층뿐 아니라 ${floor} 공간도 온라인 사전 홍보와 결합 시 집객력이 충분합니다.`,
      footTrafficPeak: isWonju
        ? '평일 16:00~20:00 (하교·퇴근 유입) / 주말 12:00~18:00 (중앙시장·문화의거리 연계 방문)'
        : '평일 15:00~19:30 (강원대·한림대 하교 유입) / 주말 11:30~18:30 (춘천역·명동 관광 동선)',
      spaceStrength: `입력하신 '${features}' 조건과 ${pyeong}평 규모는 20~40명 동시 체류 및 포토존·진열대 동선 분리에 유리한 스펙입니다.`,
    },
    topPurposes: [
      {
        rank: 1,
        category: isFirstFloor ? '아이돌·캐릭터 생일카페 및 팬덤 팝업' : '로컬 크리에이터 굿즈·브랜드 팝업스토어',
        fitScore: '적합도 최상',
        reason: isFirstFloor
          ? `${floor} 접근성과 '${features}' 특성이 팬덤 컵홀더 이벤트 및 외부 포토월·입간판 노출에 최적화되어 있습니다.`
          : `${pyeong}평의 넉넉한 공간감을 활용해 상품 진열 존과 체험·포토 존을 분리하기 좋으며, SNS 목적성 방문객 유치에 강점이 있습니다.`,
        expectedVisitors: '주말 기준 일 120~200명 방문 예상',
      },
      {
        rank: 2,
        category: isFirstFloor ? '시즌 테마 로컬 팝업스토어' : '청년·대학생 소규모 전시 및 플리마켓',
        fitScore: '수익 안정형',
        reason: `3~7일 단기 운영 시 초기 인테리어 부담 없이 가벽·행거만으로 연출이 가능해 대학 동아리 및 지역 소상공인 수요가 꾸준합니다.`,
        expectedVisitors: '주말 기준 일 80~140명 방문 예상',
      },
      {
        rank: 3,
        category: '원데이 클래스 공방 (향수·터프팅·베이킹 비조리)',
        fitScore: '평일 가동형',
        reason: `평일 낮·저녁 시간대 소규모 예약제로 운영되어 소음 민원 부담이 적고, 주말 팝업 공백기를 메우는 데 적합합니다.`,
        expectedVisitors: '회차당 8~15명 예약제 운영',
      },
    ],
    pricingSimulation: {
      recommendedDailyRate: clampedDaily,
      threeDayRate: threeDayPackage,
      weeklyRate: weeklyPackage,
      marketComparison: `${districtLabel} 유사 평수(${pyeong}평대) 단기 대관 시세 대비 합리적인 진입가로 설정되어 청년 기획자 매칭 전환율이 높을 것으로 분석됩니다.`,
      monthlyPotentialRevenue: monthlySimulated,
      assumedOperatingDays: 14,
      vacancyLossSaved: `장기 공실 유지 시 월 관리비·기회비용 부담이 지속되나, 월 14일 단기 가동 시 관리비 충당 및 약 ${(monthlySimulated / 10000).toLocaleString()}만 원 수준의 유휴 수익 창출이 가능합니다.`,
    },
    setupTips: [
      {
        title: '벽면 무타공 레일 및 포스터 레지스터 설치',
        detail: '청년 기획자들이 못질 없이 현수막·포스터를 걸 수 있도록 기본 와이어 레일을 구비하면 원상복구 분쟁을 90% 이상 예방할 수 있습니다.',
      },
      {
        title: '대용량 멀티탭 및 포토존용 기본 조명 확보',
        detail: '팝업·생일카페 운영 시 냉장 쇼케이스, 포토부스, 음향기기 전력 수요가 높으므로 콘센트 위치 안내와 기본 주광색/전구색 조명 점등 상태를 점검해 주세요.',
      },
      {
        title: '단기 대여 표준 체크리스트 및 보증금 안내 명시',
        detail: '보증금(일 대여료의 100~150%)과 쓰레기 종량제 분리배출 규칙, 퇴실 전 원상복구 사진 인증 절차를 사전에 안내하면 신뢰도가 크게 올라갑니다.',
      },
    ],
  };
}

function buildFallbackProposal(input: ProposalRequestBody) {
  const spaceName = (input.spaceName || '춘천 명동 입구 1층 통유리 상가').trim();
  const spaceAddress = (input.spaceAddress || '강원특별자치도 춘천시 조양동 명동길 18').trim();
  const spaceFloor = (input.spaceFloor || '1층').trim();
  const spacePyeong = Number(input.spacePyeong) || 25;
  const dailyPrice = Number(input.spaceDailyPrice) || 80000;
  const period = (input.period || '2026년 12월 4일 ~ 12월 6일 (3일간)').trim();
  const budget = (input.budget || `총 ${((dailyPrice * 3) / 10000).toLocaleString()}만 원 내외 (보증금 별도 예치)`).trim();
  const intent = (
    input.intent ||
    '춘천 명동 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.'
  ).trim();
  const applicantName = (input.applicantName || '강원 청년문화기획팀 이어').trim();

  const isWonju = spaceAddress.includes('원주') || spaceName.includes('원주');
  const commercialArea = isWonju ? '원주 중앙동 및 중앙시장·문화의거리' : '춘천 명동 및 조양동·육림고개';
  const depositAmount = Math.max(150000, dailyPrice * 2);

  return {
    source: 'simulation' as const,
    documentTitle: `[공간 단기 대여 요청서] ${spaceName} 단기 문화·팝업 행사 기획안`,
    recipient: `${spaceName} 건물주 귀하`,
    sender: applicantName,
    createdDate: '2026년 11월 14일',
    sections: {
      overviewAndPurpose: {
        title: '1. 행사 개요 및 운영 목적',
        eventName: `${spaceName} 청년 문화·팝업 이벤트`,
        period,
        locationSummary: `${spaceAddress} (${spaceFloor}, 약 ${spacePyeong}평)`,
        content: `안녕하십니까, ${applicantName}입니다. 귀하께서 소유하신 '${spaceName}' 공간을 활용하여 '${intent}' 목적의 건전하고 활기찬 단기 문화 행사를 기획하고자 정중히 공간 대여를 요청드립니다.\n\n이번 행사는 ${commercialArea} 일대를 찾는 대학생 및 주말 방문객들에게 새로운 볼거리와 문화 경험을 제공하는 동시에, 도심 유휴 공간에 일시적이지만 밀도 높은 활력을 불어넣는 것을 목표로 합니다. 단순 유흥이나 과도한 소음을 동반하는 행사가 아닌, 사전 예약 및 질서 있는 동선 관리로 운영되는 소규모 문화 이벤트입니다.`,
      },
      expectedImpact: {
        title: '2. 예상 방문객 및 주변 상권 긍정적 파급효과',
        estimatedVisitors: '운영 기간 내 일 평균 120명 ~ 180명 (사전 안내 기반 분산 방문)',
        content: `행사 기간 동안 SNS 및 팬·청년 커뮤니티 사전 안내를 통해 20대 대학생과 외지 방문객의 목적성 방문이 이어질 것으로 예상됩니다. 방문객들이 행사장 체류 전후로 ${commercialArea} 내 인근 카페, 음식점, 소품샵을 자연스럽게 함께 이용하게 되어 골목 상권 활성화에 실질적인 보탬이 됩니다.\n\n특히 외관과 쇼윈도가 정돈된 상태로 운영되므로 공실 상태일 때보다 건물 전체의 인상과 상권 활력이 크게 개선되며, 향후 장기 임차 희망자에게도 해당 상가의 집객 잠재력을 입증하는 긍정적인 레퍼런스가 됩니다.`,
      },
      safetyAndRestoration: {
        title: '3. 공간 원상복구 및 시설 안전 관리 서약',
        depositPlan: `이행 보증금 ${depositAmount.toLocaleString()}원 사전 예치 (퇴실 점검 완료 즉시 100% 반환)`,
        pledges: [
          '무타공·무훼손 설치 원칙: 벽면, 천장, 바닥에 못질, 타카, 강력 양면테이프 사용을 일절 금지하며, 마스킹 테이프 및 자립형 스탠드/이젤만 사용합니다.',
          '화재 및 전기 안전 준수: 화기·가스 버너 사용은 절대 불가하며, 기존 분전반 허용 용량 내에서만 조명 및 소형 가전을 연결하고 퇴실 시 전원을 전면 차단합니다.',
          '소음·대기줄·청결 관리: 인근 점포 영업에 방해되지 않도록 외부 대기 인원은 상시 스태프가 정돈하며, 발생 쓰레기는 종량제 봉투에 분리수거하여 전량 외부 반출합니다.',
          '즉시 배상 및 원상복구 서약: 대여 전후 공간 상태 사진을 상호 촬영·보관하며, 부주의로 인한 시설물 오염 및 파손 발생 시 예치 보증금 및 추가 실비로 100% 원상복구할 것을 서약합니다.',
        ],
      },
      termsAndSettlement: {
        title: '4. 희망 대여 조건 및 정산 계획',
        proposedFee: budget,
        scheduleDetail: `${period} (사전 세팅 입실: 시작일 오전 09:00 / 원상복구 퇴실: 종료일 오후 21:00)`,
        settlementPlan: `계약 확정 시 대여료의 50%를 계약금으로 선입금하고, 행사 시작 전일까지 잔금 50% 및 원상복구 이행 보증금(${depositAmount.toLocaleString()}원)을 입금하겠습니다. 퇴실 시 건물주(또는 대리인) 입회하에 시설 점검을 마친 후 보증금을 정산 반환받는 투명한 절차를 따르겠습니다.`,
        closingNote: `건물주님의 소중한 자산을 내 공간처럼 아끼며 안전하게 운영하겠습니다. 대여 가능 여부나 조율이 필요한 조건이 있다면 언제든 편하게 회신 부탁드립니다. 감사합니다.`,
      },
    },
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '5mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/tiles/:z/:x/:y', async (req, res) => {
    const z = Number(req.params.z);
    const x = Number(req.params.x);
    const y = Number(req.params.y);
    if (!Number.isInteger(z) || !Number.isInteger(x) || !Number.isInteger(y) || z < 0 || z > 19) {
      return res.status(400).send('Invalid tile coordinates');
    }

    const sub = ['a', 'b', 'c', 'd'][(x + y) % 4];
    const urls = [
      `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/${z}/${x}/${y}.png`,
      `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
    ];

    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 5000);
        const upstream = await fetch(url, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'GangwonIeoraMapProxy/1.0',
          },
        });
        clearTimeout(timer);

        if (upstream.ok) {
          const buf = Buffer.from(await upstream.arrayBuffer());
          res.setHeader('Content-Type', 'image/png');
          res.setHeader('Cache-Control', 'public, max-age=86400');
          return res.send(buf);
        }
      } catch {
        // try next upstream
      }
    }
    return res.status(502).send('Tile unavailable');
  });

  app.post('/api/diagnose', async (req, res) => {
    const body = (req.body || {}) as DiagnoseRequestBody;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json(buildFallbackDiagnosis(body));
    }

    try {
      const location = body.location || '강원특별자치도 춘천시 조양동 명동길';
      const floor = body.floor || '1층';
      const pyeong = Number(body.pyeong) || 25;
      const features = body.features || '전면 통유리, 냉난방기 완비';

      const prompt = `당신은 강원특별자치도(춘천 명동, 원주 중앙동 등) 원도심 상권 및 단기 팝업 공간 전문 AI 컨설턴트입니다.
아래 건물주의 유휴 상가 정보를 바탕으로, 현실적이고 구체적이며 전문적인 'AI 공실 진단 리포트'를 한국어로 작성해 주세요.

[입력 상가 정보]
- 위치: ${location}
- 층수: ${floor}
- 면적: ${pyeong}평
- 현재 상태 및 특징: ${features}
- 현장 사진 첨부 여부: ${body.hasPhoto ? '사진 업로드됨' : '텍스트 정보 기반'}

요구사항:
1. 주변 상권 및 유동인구 특성 분석 (강원대/한림대 또는 연세대/상지대 등 실제 지역 대학생·관광객·원도심 동선 반영)
2. 해당 공간에 가장 적합한 추천 단기 활용 업종 TOP 3 (아이돌 생일카페, 로컬 굿즈 팝업, 전시, 공방 등 구체적으로)
3. 주변 시세 대비 적정 일일/3일/주간 단기 임대료 추천(숫자 원 단위) 및 월 14일 가동 기준 예상 수익 시뮬레이션
4. 청년 기획자 유치를 위한 실질적인 공간 세팅 팁 3가지 (큰 공사비 없이 원상복구 분쟁을 막고 매력을 높이는 방법)`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              '반드시 지정된 JSON 스키마에 맞춰 정확한 한국어로 응답하세요. 금액 필드(recommendedDailyRate, threeDayRate, weeklyRate, monthlyPotentialRevenue)는 반드시 원 단위의 정수로 출력하세요.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summaryTitle: { type: Type.STRING },
                districtInsight: {
                  type: Type.OBJECT,
                  properties: {
                    headline: { type: Type.STRING },
                    demographics: { type: Type.STRING },
                    footTrafficPeak: { type: Type.STRING },
                    spaceStrength: { type: Type.STRING },
                  },
                  required: ['headline', 'demographics', 'footTrafficPeak', 'spaceStrength'],
                },
                topPurposes: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      rank: { type: Type.INTEGER },
                      category: { type: Type.STRING },
                      fitScore: { type: Type.STRING },
                      reason: { type: Type.STRING },
                      expectedVisitors: { type: Type.STRING },
                    },
                    required: ['rank', 'category', 'fitScore', 'reason', 'expectedVisitors'],
                  },
                },
                pricingSimulation: {
                  type: Type.OBJECT,
                  properties: {
                    recommendedDailyRate: { type: Type.INTEGER },
                    threeDayRate: { type: Type.INTEGER },
                    weeklyRate: { type: Type.INTEGER },
                    marketComparison: { type: Type.STRING },
                    monthlyPotentialRevenue: { type: Type.INTEGER },
                    assumedOperatingDays: { type: Type.INTEGER },
                    vacancyLossSaved: { type: Type.STRING },
                  },
                  required: [
                    'recommendedDailyRate',
                    'threeDayRate',
                    'weeklyRate',
                    'marketComparison',
                    'monthlyPotentialRevenue',
                    'assumedOperatingDays',
                    'vacancyLossSaved',
                  ],
                },
                setupTips: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      title: { type: Type.STRING },
                      detail: { type: Type.STRING },
                    },
                    required: ['title', 'detail'],
                  },
                },
              },
              required: ['summaryTitle', 'districtInsight', 'topPurposes', 'pricingSimulation', 'setupTips'],
            },
          },
        }),
        8000
      );

      const parsed = JSON.parse((response.text || '{}').trim());
      if (!parsed.summaryTitle || !parsed.topPurposes?.length) {
        throw new Error('Incomplete AI response');
      }

      return res.json({
        source: 'gemini',
        ...parsed,
      });
    } catch (error) {
      console.warn('Gemini diagnose fallback triggered:', error instanceof Error ? error.message : error);
      return res.json(buildFallbackDiagnosis(body));
    }
  });

  app.post('/api/proposal', async (req, res) => {
    const body = (req.body || {}) as ProposalRequestBody;
    const ai = getGeminiClient();

    if (!ai) {
      return res.json(buildFallbackProposal(body));
    }

    try {
      const spaceName = body.spaceName || '춘천 명동 입구 1층 통유리 상가';
      const spaceAddress = body.spaceAddress || '강원특별자치도 춘천시 조양동 명동길 18';
      const spaceFloor = body.spaceFloor || '1층';
      const spacePyeong = Number(body.spacePyeong) || 25;
      const spaceDailyPrice = Number(body.spaceDailyPrice) || 80000;
      const period = body.period || '2026년 12월 4일 ~ 12월 6일 (3일간)';
      const budget = body.budget || `일 ${spaceDailyPrice.toLocaleString()}원 기준 총 ${(spaceDailyPrice * 3).toLocaleString()}원`;
      const intent =
        body.intent ||
        '춘천 명동 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.';
      const applicantName = body.applicantName || '강원 청년문화기획팀 이어';

      const prompt = `당신은 청년 기획자(대학생·로컬 크리에이터)를 대신해 건물주를 설득하는 전문 공간 임대차 기획 에이전트입니다.
보수적이거나 단기 임대에 걱정이 많은 원도심 건물주가 안심하고 흔쾌히 단기 대여를 수락할 수 있도록, 예의 바르고 격식 있으며 구체적인 안전·원상복구 대책이 담긴 '공간 사용 기획서 및 단기 대여 요청서'를 한국어로 작성해 주세요.

[신청 정보]
- 대상 상가: ${spaceName} (${spaceAddress}, ${spaceFloor}, ${spacePyeong}평, 기준 일 대여료 ${spaceDailyPrice.toLocaleString()}원)
- 대여 희망 기간: ${period}
- 예산 범위: ${budget}
- 기획 의도: ${intent}
- 신청자(팀): ${applicantName}

필수 포함 4개 항목:
1. 행사 개요 및 운영 목적
2. 예상 방문객 및 주변 상권 긍정적 파급효과
3. 공간 원상복구 및 시설 안전 관리 서약 (보증금 예치 및 파손 방지·무타공·화기금지·쓰레기 반출 계획 구체화)
4. 희망 대여 조건 및 정산 계획`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-4-hydrogen',
          contents: prompt,
          config: {
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            systemInstruction:
              '반드시 지정된 JSON 스키마에 맞춰 격식 있고 신뢰감 있는 한국어 문서 형식으로 응답하세요.',
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                documentTitle: { type: Type.STRING },
                recipient: { type: Type.STRING },
                sender: { type: Type.STRING },
                createdDate: { type: Type.STRING },
                sections: {
                  type: Type.OBJECT,
                  properties: {
                    overviewAndPurpose: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        eventName: { type: Type.STRING },
                        period: { type: Type.STRING },
                        locationSummary: { type: Type.STRING },
                        content: { type: Type.STRING },
                      },
                      required: ['title', 'eventName', 'period', 'locationSummary', 'content'],
                    },
                    expectedImpact: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        estimatedVisitors: { type: Type.STRING },
                        content: { type: Type.STRING },
                      },
                      required: ['title', 'estimatedVisitors', 'content'],
                    },
                    safetyAndRestoration: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        depositPlan: { type: Type.STRING },
                        pledges: {
                          type: Type.ARRAY,
                          items: { type: Type.STRING },
                        },
                      },
                      required: ['title', 'depositPlan', 'pledges'],
                    },
                    termsAndSettlement: {
                      type: Type.OBJECT,
                      properties: {
                        title: { type: Type.STRING },
                        proposedFee: { type: Type.STRING },
                        scheduleDetail: { type: Type.STRING },
                        settlementPlan: { type: Type.STRING },
                        closingNote: { type: Type.STRING },
                      },
                      required: [
                        'title',
                        'proposedFee',
                        'scheduleDetail',
                        'settlementPlan',
                        'closingNote',
                      ],
                    },
                  },
                  required: [
                    'overviewAndPurpose',
                    'expectedImpact',
                    'safetyAndRestoration',
                    'termsAndSettlement',
                  ],
                },
              },
              required: ['documentTitle', 'recipient', 'sender', 'createdDate', 'sections'],
            },
          },
        }),
        14000
      );

      const parsed = JSON.parse((response.text || '{}').trim());
      if (!parsed.documentTitle || !parsed.sections?.overviewAndPurpose) {
        throw new Error('Incomplete AI proposal');
      }

      return res.json({
        source: 'gemini',
        ...parsed,
      });
    } catch (error) {
      console.warn('Gemini proposal fallback triggered:', error instanceof Error ? error.message : error);
      return res.json(buildFallbackProposal(body));
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`강원이어라 server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
