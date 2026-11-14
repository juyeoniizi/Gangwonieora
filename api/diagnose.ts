import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { buildFallbackDiagnosis, DiagnoseRequestBody } from '../src/lib/aiFallback';

interface VercelRequest {
  method?: string;
  body?: unknown;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
}

async function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rawBody =
    typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  const body = rawBody as DiagnoseRequestBody;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json(buildFallbackDiagnosis(body));
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

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
4. 청년 기획자 유치를 위한 실질적인 공간 세팅 팁 3가지`;

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
    if (!parsed.summaryTitle || !parsed.pricingSimulation) {
      throw new Error('Incomplete AI report');
    }

    return res.status(200).json({ source: 'gemini', ...parsed });
  } catch {
    return res.status(200).json(buildFallbackDiagnosis(body));
  }
}
