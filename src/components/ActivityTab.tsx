import { useState } from 'react';
import { User } from 'firebase/auth';
import {
  CheckCircle2,
  XCircle,
  Trash2,
  MapPin,
  FileText,
  Building2,
  LogIn,
  Clock,
  X,
  Copy,
  Check,
  Eye,
} from 'lucide-react';
import { DiagnosisRecord, ProposalRecord, VacantSpace } from '../types/space';

interface ActivityTabProps {
  user: User | null;
  onSignIn: () => void;
  sentProposals: ProposalRecord[];
  receivedProposals: ProposalRecord[];
  diagnoses: DiagnosisRecord[];
  mySpaces: VacantSpace[];
  onUpdateProposalStatus: (id: string, status: 'accepted' | 'declined') => Promise<void>;
  onDeleteSpace: (id: string) => Promise<void>;
  onDeleteDiagnosis: (id: string) => Promise<void>;
  onViewSpaceOnMap: (space: VacantSpace) => void;
}

const STATUS_LABELS: Record<ProposalRecord['status'], { text: string; cls: string }> = {
  pending: { text: '검토 대기', cls: 'text-amber-700 bg-amber-50' },
  accepted: { text: '수락 완료', cls: 'text-emerald-700 bg-emerald-50' },
  declined: { text: '거절됨', cls: 'text-rose-700 bg-rose-50' },
};

function buildFullProposalDocumentText(item: ProposalRecord): string {
  const isWonju = item.spaceName.includes('원주') || item.spaceName.includes('중앙');
  const commercialArea = isWonju
    ? '원주 중앙동 및 중앙시장·문화의거리'
    : '춘천 명동 및 조양동·육림고개';

  return [
    item.documentTitle || `[공간 단기 대여 요청서] ${item.spaceName} 단기 행사 기획안`,
    `수신: ${item.spaceName} 건물주 귀하`,
    `발신: ${item.applicantName}`,
    '',
    '[1. 행사 개요 및 운영 목적]',
    `- 대상 공간: ${item.spaceName}`,
    `- 희망 기간: ${item.period}`,
    `안녕하십니까, ${item.applicantName}입니다. 귀하께서 소유하신 '${item.spaceName}' 공간을 활용하여 '${item.intent}' 목적의 건전하고 활기찬 단기 문화 행사를 기획하고자 정중히 공간 대여를 요청드립니다.`,
    `이번 행사는 ${commercialArea} 일대를 찾는 대학생 및 주말 방문객들에게 새로운 볼거리와 문화 경험을 제공하는 동시에, 도심 유휴 공간에 일시적이지만 밀도 높은 활력을 불어넣는 것을 목표로 합니다. 단순 유흥이나 과도한 소음을 동반하는 행사가 아닌, 사전 안내 및 질서 있는 동선 관리로 운영되는 건전한 문화 이벤트입니다.`,
    '',
    '[2. 예상 방문객 및 주변 상권 긍정적 파급효과]',
    '- 예상 방문 규모: 운영 기간 내 일 평균 120명 ~ 180명 (사전 안내 기반 분산 방문)',
    `행사 기간 동안 SNS 및 커뮤니티 사전 안내를 통해 20대 대학생과 외지 방문객의 목적성 방문이 이어질 것으로 예상됩니다. 방문객들이 행사장 체류 전후로 ${commercialArea} 내 인근 카페, 음식점, 소품샵을 자연스럽게 함께 이용하게 되어 골목 상권 활성화에 실질적인 보탬이 됩니다.`,
    '외관과 쇼윈도가 정돈된 상태로 운영되므로 공실 상태일 때보다 건물 전체의 인상과 활력이 개선되며, 향후 장기 임차 희망자에게도 해당 상가의 집객 잠재력을 입증하는 긍정적인 사례가 됩니다.',
    '',
    '[3. 공간 원상복구 및 시설 안전 관리 서약]',
    '- 보증금 계획: 이행 보증금 사전 예치 (퇴실 점검 완료 즉시 100% 반환)',
    '1. 무타공·무훼손 설치 원칙: 벽면, 천장, 바닥에 못질, 타카, 강력 양면테이프 사용을 일절 금지하며, 마스킹 테이프 및 자립형 스탠드·이젤만 사용합니다.',
    '2. 화재 및 전기 안전 준수: 화기·가스 버너 사용은 절대 불가하며, 기존 분전반 허용 용량 내에서만 조명 및 소형 가전을 연결하고 퇴실 시 전원을 전면 차단합니다.',
    '3. 소음·대기줄·청결 관리: 인근 점포 영업에 방해되지 않도록 외부 대기 인원은 상시 스태프가 정돈하며, 발생 쓰레기는 종량제 봉투에 분리수거하여 전량 외부 반출합니다.',
    '4. 즉시 배상 및 원상복구 서약: 대여 전후 공간 상태 사진을 상호 촬영·보관하며, 부주의로 인한 시설물 오염 및 파손 발생 시 예치 보증금 및 추가 실비로 100% 원상복구할 것을 서약합니다.',
    '',
    '[4. 희망 대여 조건 및 정산 계획]',
    `- 제안 대여 조건: ${item.budget}`,
    `- 입퇴실 일정: ${item.period} (사전 세팅 입실: 시작일 오전 09:00 / 원상복구 퇴실: 종료일 오후 21:00)`,
    '- 정산 계획: 계약 확정 시 대여료의 50%를 계약금으로 선입금하고, 행사 시작 전일까지 잔금 50% 및 원상복구 이행 보증금을 입금하겠습니다. 퇴실 시 건물주(또는 대리인) 입회하에 시설 점검을 마친 후 보증금을 정산 반환받는 투명한 절차를 따르겠습니다.',
    '',
    '건물주님의 소중한 자산을 내 공간처럼 아끼며 안전하게 운영하겠습니다. 대여 가능 여부나 조율이 필요한 조건이 있다면 언제든 편하게 회신 부탁드립니다. 감사합니다.',
  ].join('\n');
}

function getFullProposalText(item: ProposalRecord): string {
  if (item.proposalText && item.proposalText.trim().length >= 80) {
    return item.proposalText;
  }
  return buildFullProposalDocumentText(item);
}

interface ParsedSection {
  heading: string | null;
  body: string;
}

function parseProposalSections(fullText: string): ParsedSection[] {
  const lines = fullText.split('\n');
  const sections: ParsedSection[] = [];
  let currentHeading: string | null = null;
  let buffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^\[.+\]$/.test(trimmed)) {
      if (currentHeading !== null || buffer.some((l) => l.trim() !== '')) {
        sections.push({
          heading: currentHeading,
          body: buffer.join('\n').trim(),
        });
      }
      currentHeading = trimmed.slice(1, -1);
      buffer = [];
    } else {
      buffer.push(line);
    }
  }

  if (currentHeading !== null || buffer.some((l) => l.trim() !== '')) {
    sections.push({
      heading: currentHeading,
      body: buffer.join('\n').trim(),
    });
  }

  return sections;
}

export function ActivityTab({
  user,
  onSignIn,
  sentProposals,
  receivedProposals,
  diagnoses,
  mySpaces,
  onUpdateProposalStatus,
  onDeleteSpace,
  onDeleteDiagnosis,
  onViewSpaceOnMap,
}: ActivityTabProps) {
  const [selectedProposal, setSelectedProposal] = useState<ProposalRecord | null>(null);
  const [selectedRole, setSelectedRole] = useState<'received' | 'sent'>('received');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [copiedDetail, setCopiedDetail] = useState(false);

  const openProposalDetail = (item: ProposalRecord, role: 'received' | 'sent') => {
    setSelectedProposal(item);
    setSelectedRole(role);
    setCopiedDetail(false);
  };

  const handleStatusChange = async (id: string, status: 'accepted' | 'declined') => {
    setUpdatingId(id);
    try {
      await onUpdateProposalStatus(id, status);
      if (selectedProposal?.id === id) {
        setSelectedProposal((prev) => (prev ? { ...prev, status } : null));
      }
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCopyDetail = async () => {
    if (!selectedProposal) return;
    const text = getFullProposalText(selectedProposal);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopiedDetail(true);
    setTimeout(() => setCopiedDetail(false), 2000);
  };

  if (!user) {
    return (
      <div className="h-full overflow-y-auto bg-slate-50 px-4 py-8 flex items-center justify-center">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 w-full">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#0F3D6E] flex items-center justify-center mx-auto">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Google 로그인으로 실시간 DB 연동하기
            </h2>
            <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">
              로그인하면 건물주가 등록한 공실, AI 진단 리포트, 보낸 제안서·받은 제안서 수락 상태가 실제 Firestore 데이터베이스에 저장됩니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onSignIn}
            className="w-full h-12 rounded-xl bg-[#0F3D6E] hover:bg-[#0B2F55] text-white text-sm font-bold flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Google 계정으로 계속하기</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 px-4 py-4 space-y-5">
      {/* Summary Header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 grid grid-cols-3 gap-2 text-center">
        <div>
          <span className="text-[11px] text-slate-500 block">등록 상가</span>
          <span className="text-lg font-bold text-[#0F3D6E] font-mono tabular-nums">
            {mySpaces.length}
          </span>
        </div>
        <div className="border-x border-slate-100">
          <span className="text-[11px] text-slate-500 block">보낸 제안</span>
          <span className="text-lg font-bold text-[#0D9488] font-mono tabular-nums">
            {sentProposals.length}
          </span>
        </div>
        <div>
          <span className="text-[11px] text-slate-500 block">받은 제안</span>
          <span className="text-lg font-bold text-slate-900 font-mono tabular-nums">
            {receivedProposals.length}
          </span>
        </div>
      </div>

      {/* 1. 받은 제안서 (건물주 자세히 보기 & 수락/거절) */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-[#0F3D6E]" />
          내 상가에 들어온 제안서 ({receivedProposals.length})
        </h2>

        {receivedProposals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 text-center">
            아직 들어온 제안서가 없습니다. 상가를 등록하거나 샘플 상가에 제안서를 보내면 이곳에서 제안서를 자세히 보고 수락·거절할 수 있습니다.
          </div>
        ) : (
          receivedProposals.map((item) => {
            const st = STATUS_LABELS[item.status];
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.spaceName}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      신청: {item.applicantName} · {item.period}
                    </p>
                  </div>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${st.cls}`}
                  >
                    {st.text}
                  </span>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 leading-relaxed line-clamp-2">
                  {item.intent}
                </p>

                <div className="flex items-center gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={() => openProposalDetail(item, 'received')}
                    className="flex-1 min-h-[38px] px-3 rounded-xl border border-[#0F3D6E]/25 bg-blue-50/50 hover:bg-blue-50 text-[#0F3D6E] text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>자세히 보기</span>
                  </button>

                  {item.status === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, 'declined')}
                        className="min-h-[38px] px-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>거절</span>
                      </button>
                      <button
                        type="button"
                        disabled={updatingId === item.id}
                        onClick={() => handleStatusChange(item.id, 'accepted')}
                        className="min-h-[38px] px-3 rounded-xl bg-[#0D9488] text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1 shrink-0"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>수락</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* 2. 내가 보낸 AI 제안서 */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5 text-[#0D9488]" />
          내가 보낸 AI 제안서 ({sentProposals.length})
        </h2>

        {sentProposals.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 text-center">
            작성해 발송한 제안서가 아직 없습니다.
          </div>
        ) : (
          sentProposals.map((item) => {
            const st = STATUS_LABELS[item.status];
            return (
              <div
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="text-xs font-bold text-slate-900 truncate">{item.spaceName}</p>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-md shrink-0 ${st.cls}`}
                  >
                    {st.text}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  {item.period} · {item.budget}
                </p>
                <p className="text-xs text-slate-600 line-clamp-2">{item.intent}</p>
                <button
                  type="button"
                  onClick={() => openProposalDetail(item, 'sent')}
                  className="w-full min-h-[36px] rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-bold text-slate-700 flex items-center justify-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5 text-[#0F3D6E]" />
                  <span>제안서 전문 자세히 보기</span>
                </button>
              </div>
            );
          })
        )}
      </section>

      {/* 3. 내가 등록한 공실 매물 */}
      <section className="space-y-2.5">
        <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-[#0F3D6E]" />
          내가 등록한 공실 ({mySpaces.length})
        </h2>

        {mySpaces.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 text-center">
            AI 공실 진단 탭에서 직접 등록한 상가가 여기에 표시됩니다.
          </div>
        ) : (
          mySpaces.map((space) => (
            <div
              key={space.id}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between gap-2"
            >
              <button
                type="button"
                onClick={() => onViewSpaceOnMap(space)}
                className="text-left min-w-0 flex-1"
              >
                <p className="text-xs font-bold text-slate-900 truncate">{space.name}</p>
                <p className="text-[11px] text-slate-500 truncate mt-0.5">
                  {space.districtName} · {space.pyeong}평 · 일 {space.dailyPrice.toLocaleString()}원
                </p>
              </button>
              <button
                type="button"
                onClick={() => onDeleteSpace(space.id)}
                aria-label="등록 상가 삭제"
                className="p-2 text-slate-400 hover:text-rose-600 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </section>

      {/* 4. 저장된 AI 진단 리포트 */}
      <section className="space-y-2.5 pb-4">
        <h2 className="text-xs font-bold text-slate-700 px-1 flex items-center gap-1.5">
          <Building2 className="w-3.5 h-3.5 text-[#0D9488]" />
          저장된 AI 공실 진단 ({diagnoses.length})
        </h2>

        {diagnoses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 text-xs text-slate-500 text-center">
            아직 저장된 진단 기록이 없습니다.
          </div>
        ) : (
          diagnoses.map((diag) => (
            <div
              key={diag.id}
              className="bg-white border border-slate-200 rounded-2xl p-3.5 flex items-start justify-between gap-2"
            >
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-900 truncate">{diag.summaryTitle}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  추천 일 대여료{' '}
                  <strong className="text-[#0F3D6E] font-mono tabular-nums">
                    {diag.recommendedDailyRate.toLocaleString()}원
                  </strong>{' '}
                  · 월 예상{' '}
                  <strong className="text-emerald-700 font-mono tabular-nums">
                    {diag.monthlyPotentialRevenue.toLocaleString()}원
                  </strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onDeleteDiagnosis(diag.id)}
                aria-label="진단 기록 삭제"
                className="p-2 text-slate-400 hover:text-rose-600 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </section>

      {/* Proposal Full-Document Detail Modal */}
      {selectedProposal && (
        <div
          className="fixed md:absolute inset-0 z-[600] bg-slate-900/60 backdrop-blur-xs flex items-end md:items-center justify-center p-2.5"
          role="dialog"
          aria-modal="true"
          aria-labelledby="proposal-detail-title"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full max-h-[88vh] md:max-h-[86%] flex flex-col overflow-hidden shadow-2xl">
            <div className="px-4 py-3.5 border-b border-slate-200 flex items-start justify-between gap-2 shrink-0 bg-slate-50">
              <div className="min-w-0">
                <span
                  className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md mb-1 ${
                    STATUS_LABELS[selectedProposal.status].cls
                  }`}
                >
                  {STATUS_LABELS[selectedProposal.status].text}
                </span>
                <h3
                  id="proposal-detail-title"
                  className="text-sm font-bold text-slate-900 leading-snug"
                >
                  {selectedProposal.documentTitle || selectedProposal.spaceName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedProposal(null)}
                aria-label="제안서 닫기"
                className="p-1.5 text-slate-400 hover:text-slate-700 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">대상 상가</span>
                  <span className="font-bold text-slate-900 text-right">
                    {selectedProposal.spaceName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">신청 기획팀</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {selectedProposal.applicantName}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">희망 기간</span>
                  <span className="font-semibold text-slate-800 text-right">
                    {selectedProposal.period}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500 shrink-0">제안 예산</span>
                  <span className="font-semibold text-[#0F3D6E] text-right">
                    {selectedProposal.budget}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {parseProposalSections(getFullProposalText(selectedProposal)).map((sec, idx) => (
                  <div
                    key={idx}
                    className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-1.5"
                  >
                    {sec.heading && (
                      <h4 className="text-xs font-bold text-[#0F3D6E]">{sec.heading}</h4>
                    )}
                    <p className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                      {sec.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 border-t border-slate-200 bg-slate-50 shrink-0 space-y-2">
              {selectedRole === 'received' && selectedProposal.status === 'pending' ? (
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDetail}
                    className="h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    {copiedDetail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>복사됨</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>복사</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === selectedProposal.id}
                    onClick={() => handleStatusChange(selectedProposal.id, 'declined')}
                    className="h-11 rounded-xl border border-rose-200 bg-white text-rose-600 text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>거절</span>
                  </button>
                  <button
                    type="button"
                    disabled={updatingId === selectedProposal.id}
                    onClick={() => handleStatusChange(selectedProposal.id, 'accepted')}
                    className="h-11 rounded-xl bg-[#0D9488] text-white text-xs font-bold disabled:opacity-50 flex items-center justify-center gap-1"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>임대 수락</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleCopyDetail}
                    className="h-11 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    {copiedDetail ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                        <span>복사 완료</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>전문 복사하기</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedProposal(null)}
                    className="h-11 rounded-xl bg-[#0F3D6E] text-white text-xs font-bold"
                  >
                    닫기
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
