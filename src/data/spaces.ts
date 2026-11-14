import chuncheonGlassImg from '../assets/images/space_chuncheon_glass_1794695799857.jpg';
import vintageWoodImg from '../assets/images/space_vintage_wood_1794695799683.jpg';
import concreteGalleryImg from '../assets/images/space_concrete_gallery_1794695799430.jpg';
import cozyWorkshopImg from '../assets/images/space_cozy_workshop_1794695800064.jpg';
import { SpaceImageKey, VacantSpace } from '../types/space';

export const IMAGE_BY_KEY: Record<SpaceImageKey, string> = {
  glass: chuncheonGlassImg,
  vintage: vintageWoodImg,
  concrete: concreteGalleryImg,
  workshop: cozyWorkshopImg,
};

export const SAMPLE_UPLOAD_IMAGES: Array<{ key: SpaceImageKey; label: string; url: string }> = [
  { key: 'glass', label: '춘천 명동 1층 통유리형', url: chuncheonGlassImg },
  { key: 'concrete', label: '원주 중앙동 2층 노출 콘크리트형', url: concreteGalleryImg },
  { key: 'vintage', label: '양옥 목재 서까래 스튜디오형', url: vintageWoodImg },
  { key: 'workshop', label: '아담한 1층 우드 공방형', url: cozyWorkshopImg },
];

export const VACANT_SPACES: VacantSpace[] = [
  {
    id: 'cc-myeongdong-01',
    ownerUid: 'seed_landlord',
    name: '춘천 명동 입구 1층 통유리 상가',
    shortLabel: '명동 입구 1F',
    district: 'chuncheon',
    districtName: '춘천 명동',
    address: '강원특별자치도 춘천시 조양동 명동길 18',
    floor: '1층',
    pyeong: 25,
    sqm: 82.6,
    dailyPrice: 80000,
    purposes: ['생일카페', '팝업스토어'],
    facilities: ['전면 6m 통유리', '픽업 바 데스크 잔존', '천장형 냉난방기', '220V 콘센트 12구', '무료 Wi-Fi'],
    highlight: '명동 입구 메인 보행로 정면 노출 · 컵홀더·포토존 최적화',
    landlordNote: '벽면 무타공 테이핑 및 원상복구 준수 시 대학생·팬덤 단기 행사 적극 환영합니다.',
    footTraffic: '강원대·한림대 학생 및 주말 명동 방문객 일 평균 4,200명 통과 구간',
    imageKey: 'glass',
    imageUrl: chuncheonGlassImg,
    coords: {
      lat: 37.88048,
      lng: 127.72785,
    },
    isSeeded: true,
  },
  {
    id: 'cc-yukrim-02',
    ownerUid: 'seed_landlord',
    name: '춘천 육림고개 초입 빈티지 양옥 2층',
    shortLabel: '육림고개 2F',
    district: 'chuncheon',
    districtName: '춘천 명동',
    address: '강원특별자치도 춘천시 중앙로 77번길 12',
    floor: '2층',
    pyeong: 18,
    sqm: 59.5,
    dailyPrice: 55000,
    purposes: ['전시', '공방'],
    facilities: ['목재 서까래 노출', '남향 대형 창문', '소형 씽크대·급수', '스탠드 조명 4기', '야외 발코니'],
    highlight: '레트로 감성 원목 천장 · 사진전·일러스트·원데이 클래스 추천',
    landlordNote: '조용한 문화 전시나 소규모 클래스에 적합합니다. 상하차 시 건물 뒤편 정차 가능합니다.',
    footTraffic: '육림고개 청년몰·로컬 카페 투어 방문객 도보 1분 거리',
    imageKey: 'vintage',
    imageUrl: vintageWoodImg,
    coords: {
      lat: 37.87895,
      lng: 127.72445,
    },
    isSeeded: true,
  },
  {
    id: 'cc-brown5-03',
    ownerUid: 'seed_landlord',
    name: '춘천 브라운5번가 인근 모던 스튜디오',
    shortLabel: '브라운5번가 1F',
    district: 'chuncheon',
    districtName: '춘천 명동',
    address: '강원특별자치도 춘천시 중앙로 67번길 24',
    floor: '1층',
    pyeong: 32,
    sqm: 105.8,
    dailyPrice: 95000,
    purposes: ['팝업스토어', '생일카페', '전시'],
    facilities: ['레일 조명 완비', '재고 보관용 백룸', '대형 빔프로젝터', '냉난방기 2대', '인근 공영주차장'],
    highlight: '32평 대형 직사각 구조 · 브랜드 팝업·대규모 팬덤 이벤트 수용',
    landlordNote: '보증금 예치 및 사전 일정 협의 시 3일 이상 연속 대여 10% 할인해 드립니다.',
    footTraffic: '춘천 시청·명동·중앙로 환승 버스정류장 도보 3분 입지',
    imageKey: 'concrete',
    imageUrl: concreteGalleryImg,
    coords: {
      lat: 37.87942,
      lng: 127.73025,
    },
    isSeeded: true,
  },
  {
    id: 'wj-jungang-04',
    ownerUid: 'seed_landlord',
    name: '원주 중앙시장 인근 노출 콘크리트 공간',
    shortLabel: '중앙시장 2F',
    district: 'wonju',
    districtName: '원주 중앙동',
    address: '강원특별자치도 원주시 중앙동 중앙시장길 42',
    floor: '2층',
    pyeong: 30,
    sqm: 99.2,
    dailyPrice: 60000,
    purposes: ['전시', '팝업스토어'],
    facilities: ['노출 콘크리트 마감', '층고 3.8m', '화물 겸용 엘리베이터', '갤러리 픽처레일', '독립 화장실'],
    highlight: '압도적 층고와 갤러리 레일 · 졸업전시·의류/굿즈 팝업 최적',
    landlordNote: '못질 없이 픽처레일 와이어를 자유롭게 활용할 수 있어 전시 팀 만족도가 높습니다.',
    footTraffic: '원주 미로예술시장 및 중앙시장 청년 방문객 유입 핵심 동선',
    imageKey: 'concrete',
    imageUrl: concreteGalleryImg,
    coords: {
      lat: 37.34962,
      lng: 127.95024,
    },
    isSeeded: true,
  },
  {
    id: 'wj-ilsan-05',
    ownerUid: 'seed_landlord',
    name: '원주 일산동 대학로 인근 공방형 상가',
    shortLabel: '일산동 1F',
    district: 'wonju',
    districtName: '원주 중앙동',
    address: '강원특별자치도 원주시 일산동 원일로 115',
    floor: '1층',
    pyeong: 14,
    sqm: 46.3,
    dailyPrice: 45000,
    purposes: ['공방', '생일카페'],
    facilities: ['우드 바 테이블', '급배수·싱크대 완비', '전면 유리 출입문', '어닝 설치', '앞마당 임시 정차'],
    highlight: '가성비 최고 일 4.5만 원 · 소규모 컵홀더 카페·원데이 공방 맞춤',
    landlordNote: '이전 카페 바 테이블과 싱크대가 그대로 있어 가벼운 음료 나눔이나 공방에 바로 쓰기 좋습니다.',
    footTraffic: '연세대·상지대 학생 버스 노선 정류장 바로 앞 위치',
    imageKey: 'workshop',
    imageUrl: cozyWorkshopImg,
    coords: {
      lat: 37.34715,
      lng: 127.94385,
    },
    isSeeded: true,
  },
  {
    id: 'wj-munhwa-06',
    ownerUid: 'seed_landlord',
    name: '원주 문화의거리 코너 2층 루프탑 연계 상가',
    shortLabel: '문화의거리 2F',
    district: 'wonju',
    districtName: '원주 중앙동',
    address: '강원특별자치도 원주시 중앙동 평원로 58',
    floor: '2층',
    pyeong: 35,
    sqm: 115.7,
    dailyPrice: 85000,
    purposes: ['팝업스토어', '전시', '공방'],
    facilities: ['양면 코너 통창', '전용 옥상 15평 연계', '블루투스 음향 스피커', '시스템 냉난방', '접이식 테이블 6개'],
    highlight: '양면 채광 코너뷰 + 루프탑 야외 포토존 동시 활용 가능',
    landlordNote: '주말 플리마켓이나 로컬 브랜드 연합 팝업 시 옥상 공간도 추가 비용 없이 개방합니다.',
    footTraffic: '원주 문화의거리 상설 무대 및 주말 청년 버스킹 구역 인접',
    imageKey: 'glass',
    imageUrl: chuncheonGlassImg,
    coords: {
      lat: 37.34842,
      lng: 127.94805,
    },
    isSeeded: true,
  },
];

export function getNaverMapSearchUrl(address: string): string {
  return `https://map.naver.com/p/search/${encodeURIComponent(address)}`;
}

export function getNaverMapDirectionsUrl(space: VacantSpace): string {
  return `https://map.naver.com/p/directions/-/${space.coords.lng},${space.coords.lat},${encodeURIComponent(
    space.address
  )}/-/transit`;
}
