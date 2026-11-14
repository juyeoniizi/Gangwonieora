import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';
import { buildFallbackProposal, ProposalRequestBody } from '../src/lib/aiFallback';

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
  const body = rawBody as ProposalRequestBody;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return res.status(200).json(buildFallbackProposal(body));
  }

  try {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } },
    });

    const spaceName = body.spaceName || '춘천 명동 입구 1층 통유리 상가';
    const spaceAddress = body.spaceAddress || '강원특별자치도 춘천시 조양동 명동길 18';
    const spaceFloor = body.spaceFloor || '1층';
    const spacePyeong = body.spacePyeong || 25;
    const period = body.period || '2026년 12월 4일 ~ 12월 6일 (3일간)';
    const budget = body.budget || '총 24만 원 내외 (보증금 별도)';
    const intent =
      body.intent ||
      '춘천 명동 쪽 20평 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.';
    const applicantName = body.applicantName || '강원 청년문화기획팀 이어';

    const prompt = `당신은 강원 원도심 상가 건물주의 신뢰를 얻는 전문 공간 대관·기획서 작성 AI 어시스턴트입니다.
청년 기획자의 간단한 의도를 바탕으로, 건물주가 '안전하고 믿을 수 있으며 주변 상권에도 도움이 되겠다'고 판단하여 단기 대여를 수락하도록 설득력 있고 격식 있는 '공간 사용 기획서 및 단기 대여 요청서'를 작성해 주세요.

[신청 정보]
- 대상 상가: ${spaceName} (${spaceAddress}, ${spaceFloor}, ${spacePyeong}평)
- 희망 대여 기간: ${period}
- 제안 예산 조건: ${budget}
- 신청자(기획팀): ${applicantName}
- 청년 기획 의도: ${intent}`;

    const response = await withTimeout(
      ai.models.generateContent({
        model: 'gemini-4-hydrogen',
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          systemInstruction:
            '지정된 JSON 스키마를 준수하여 공문서/제안서 어조의 정중하고 신뢰감 있는 한국어로 작성하세요.',
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
      8000
    );

    const parsed = JSON.parse((response.text || '{}').trim());
    if (!parsed.documentTitle || !parsed.sections?.overviewAndPurpose) {
      throw new Error('Incomplete AI proposal');
    }

    return res.status(200).json({ source: 'gemini', ...parsed });
  } catch {
    return res.status(200).json(buildFallbackProposal(body));
  }
}
