import { DiagnosisReport, ProposalDocument } from '../types/space';

export interface DiagnoseRequestBody {
  location?: string;
  floor?: string;
  pyeong?: number | string;
  features?: string;
  hasPhoto?: boolean;
}

export interface ProposalRequestBody {
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

export function buildFallbackDiagnosis(input: DiagnoseRequestBody): DiagnosisReport {
  const location = (input.location || '강원특별자치도 춘천시 조양동 명동길').trim();
  const floor = (input.floor || '1층').trim();
  const pyeong = Number(input.pyeong) || 25;
  const features = (input.features || '전면 통유리, 냉난방기 완비').trim();

  const isWonju =
    location.includes('원주') || location.includes('중앙동') || location.includes('일산동');
  const isFirstFloor = floor.includes('1층') || floor === '1';

  const districtLabel = isWonju ? '원주 중앙동·문화의거리 권역' : '춘천 명동·조양동 권역';
  const nearbyUniv = isWonju
    ? '연세대 미래캠퍼스·상지대·강릉원주대 학생층 및 주말 나들이객'
    : '강원대·한림대 대학생 및 경춘선 ITX 주말 관광객';

  const basePerPyeong = isFirstFloor ? 3300 : 2300;
  const dailyRecommended = Math.round((pyeong * basePerPyeong) / 5000) * 5000;
  const clampedDaily = Math.max(45000, Math.min(180000, dailyRecommended));
  const threeDayPackage = Math.round((clampedDaily * 3 * 0.92) / 5000) * 5000;
  const weeklyPackage = Math.round((clampedDaily * 7 * 0.82) / 5000) * 5000;
  const monthlySimulated = clampedDaily * 14;

  return {
    source: 'simulation',
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
        category: isFirstFloor
          ? '아이돌·캐릭터 생일카페 및 팬덤 팝업'
          : '로컬 크리에이터 굿즈·브랜드 팝업스토어',
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
        reason:
          '3~7일 단기 운영 시 초기 인테리어 부담 없이 가벽·행거만으로 연출이 가능해 대학 동아리 및 지역 소상공인 수요가 꾸준합니다.',
        expectedVisitors: '주말 기준 일 80~140명 방문 예상',
      },
      {
        rank: 3,
        category: '원데이 클래스 공방 (향수·터프팅·베이킹 비조리)',
        fitScore: '평일 가동형',
        reason:
          '평일 낮·저녁 시간대 소규모 예약제로 운영되어 소음 민원 부담이 적고, 주말 팝업 공백기를 메우는 데 적합합니다.',
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
      vacancyLossSaved: `장기 공실 유지 시 월 관리비·기회비용 부담이 지속되나, 월 14일 단기 가동 시 관리비 충당 및 약 ${(
        monthlySimulated / 10000
      ).toLocaleString()}만 원 수준의 유휴 수익 창출이 가능합니다.`,
    },
    setupTips: [
      {
        title: '벽면 무타공 레일 및 포스터 레지스터 설치',
        detail:
          '청년 기획자들이 못질 없이 현수막·포스터를 걸 수 있도록 기본 와이어 레일을 구비하면 원상복구 분쟁을 90% 이상 예방할 수 있습니다.',
      },
      {
        title: '대용량 멀티탭 및 포토존용 기본 조명 확보',
        detail:
          '팝업·생일카페 운영 시 냉장 쇼케이스, 포토부스, 음향기기 전력 수요가 높으므로 콘센트 위치 안내와 기본 주광색/전구색 조명 점등 상태를 점검해 주세요.',
      },
      {
        title: '단기 대여 표준 체크리스트 및 보증금 안내 명시',
        detail:
          '보증금(일 대여료의 100~150%)과 쓰레기 종량제 분리배출 규칙, 퇴실 전 원상복구 사진 인증 절차를 사전에 안내하면 신뢰도가 크게 올라갑니다.',
      },
    ],
  };
}

export function buildFallbackProposal(input: ProposalRequestBody): ProposalDocument {
  const spaceName = (input.spaceName || '춘천 명동 입구 1층 통유리 상가').trim();
  const spaceAddress = (input.spaceAddress || '강원특별자치도 춘천시 조양동 명동길 18').trim();
  const spaceFloor = (input.spaceFloor || '1층').trim();
  const spacePyeong = Number(input.spacePyeong) || 25;
  const dailyPrice = Number(input.spaceDailyPrice) || 80000;
  const period = (input.period || '2026년 12월 4일 ~ 12월 6일 (3일간)').trim();
  const budget = (
    input.budget || `총 ${((dailyPrice * 3) / 10000).toLocaleString()}만 원 내외 (보증금 별도 예치)`
  ).trim();
  const intent = (
    input.intent ||
    '춘천 명동 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.'
  ).trim();
  const applicantName = (input.applicantName || '강원 청년문화기획팀 이어').trim();

  const isWonju = spaceAddress.includes('원주') || spaceName.includes('원주');
  const commercialArea = isWonju
    ? '원주 중앙동 및 중앙시장·문화의거리'
    : '춘천 명동 및 조양동·육림고개';
  const depositAmount = Math.max(150000, dailyPrice * 2);
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return {
    source: 'simulation',
    documentTitle: `[공간 단기 대여 요청서] ${spaceName} 단기 문화·팝업 행사 기획안`,
    recipient: `${spaceName} 건물주 귀하`,
    sender: applicantName,
    createdDate: today,
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
        closingNote:
          '건물주님의 소중한 자산을 내 공간처럼 아끼며 안전하게 운영하겠습니다. 대여 가능 여부나 조율이 필요한 조건이 있다면 언제든 편하게 회신 부탁드립니다. 감사합니다.',
      },
    },
  };
}
