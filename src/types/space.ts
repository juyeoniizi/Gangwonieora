export type TabId = 'explore' | 'diagnose' | 'proposal' | 'activity';

export type DistrictFilter = 'all' | 'chuncheon' | 'wonju';
export type PurposeFilter = 'all' | '생일카페' | '팝업스토어' | '전시' | '공방';
export type AreaFilter = 'all' | 'small' | 'medium' | 'large';
export type SpaceImageKey = 'glass' | 'vintage' | 'concrete' | 'workshop';

export interface VacantSpace {
  id: string;
  ownerUid: string;
  name: string;
  shortLabel: string;
  district: 'chuncheon' | 'wonju';
  districtName: string;
  address: string;
  floor: string;
  pyeong: number;
  sqm: number;
  dailyPrice: number;
  purposes: Array<'생일카페' | '팝업스토어' | '전시' | '공방'>;
  facilities: string[];
  highlight: string;
  landlordNote: string;
  footTraffic: string;
  imageKey: SpaceImageKey;
  imageUrl: string;
  coords: {
    lat: number;
    lng: number;
  };
  isSeeded: boolean;
}

export interface DiagnosisRecord {
  id: string;
  ownerUid: string;
  location: string;
  floor: string;
  pyeong: number;
  features: string;
  summaryTitle: string;
  headline: string;
  recommendedDailyRate: number;
  monthlyPotentialRevenue: number;
  createdAt?: unknown;
}

export interface ProposalRecord {
  id: string;
  spaceId: string;
  spaceName: string;
  spaceOwnerUid: string;
  applicantUid: string;
  applicantName: string;
  period: string;
  budget: string;
  intent: string;
  documentTitle: string;
  proposalText?: string;
  status: 'pending' | 'accepted' | 'declined';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface DiagnosisReport {
  source: 'gemini' | 'simulation';
  summaryTitle: string;
  districtInsight: {
    headline: string;
    demographics: string;
    footTrafficPeak: string;
    spaceStrength: string;
  };
  topPurposes: Array<{
    rank: number;
    category: string;
    fitScore: string;
    reason: string;
    expectedVisitors: string;
  }>;
  pricingSimulation: {
    recommendedDailyRate: number;
    threeDayRate: number;
    weeklyRate: number;
    marketComparison: string;
    monthlyPotentialRevenue: number;
    assumedOperatingDays: number;
    vacancyLossSaved: string;
  };
  setupTips: Array<{
    title: string;
    detail: string;
  }>;
}

export interface ProposalDocument {
  source: 'gemini' | 'simulation';
  documentTitle: string;
  recipient: string;
  sender: string;
  createdDate: string;
  sections: {
    overviewAndPurpose: {
      title: string;
      eventName: string;
      period: string;
      locationSummary: string;
      content: string;
    };
    expectedImpact: {
      title: string;
      estimatedVisitors: string;
      content: string;
    };
    safetyAndRestoration: {
      title: string;
      depositPlan: string;
      pledges: string[];
    };
    termsAndSettlement: {
      title: string;
      proposedFee: string;
      scheduleDetail: string;
      settlementPlan: string;
      closingNote: string;
    };
  };
}
