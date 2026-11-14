import { useEffect, useMemo, useRef, useState, FormEvent } from 'react';
import { User } from 'firebase/auth';
import {
  FileText,
  Copy,
  Check,
  Send,
  ShieldCheck,
  Calendar,
  Loader2,
  X,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { getNaverMapSearchUrl } from '../data/spaces';
import { buildFallbackProposal } from '../lib/aiFallback';
import { submitProposalInDb } from '../lib/firebase';
import { ProposalDocument, VacantSpace } from '../types/space';

interface YouthProposalTabProps {
  spaces: VacantSpace[];
  preselectedSpace: VacantSpace | null;
  user: User | null;
  onRequireSignIn: () => Promise<User | null>;
  onOpenActivity: () => void;
}

const INTENT_PRESETS = [
  {
    label: '아이돌 생일카페',
    period: '2026년 12월 4일 ~ 12월 6일 (3일간)',
    intent:
      '춘천 명동 쪽 20평대 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.',
  },
  {
    label: '로컬 굿즈 팝업',
    period: '2026년 11월 27일 ~ 11월 29일 (3일간)',
    intent:
      '강원 로컬 캐릭터 엽서와 패브릭 굿즈 팝업스토어를 주말 3일간 운영하려 합니다. 대학생·관광객 대상 체험 이벤트도 진행합니다.',
  },
  {
    label: '대학생 졸업전시',
    period: '2026년 12월 11일 ~ 12월 14일 (4일간)',
    intent:
      '지역 대학 디자인학과 학생 6명의 소규모 일러스트 졸업전시를 4일간 열고 싶습니다. 벽면 무타공 와이어와 이젤만 활용합니다.',
  },
];

function formatProposalPlainText(doc: ProposalDocument): string {
  const s = doc.sections;
  return [
    doc.documentTitle,
    `수신: ${doc.recipient}`,
    `발신: ${doc.sender}`,
    `작성일: ${doc.createdDate}`,
    '',
    `[${s.overviewAndPurpose.title}]`,
    `- 행사명: ${s.overviewAndPurpose.eventName}`,
    `- 희망 기간: ${s.overviewAndPurpose.period}`,
    `- 대상 공간: ${s.overviewAndPurpose.locationSummary}`,
    s.overviewAndPurpose.content,
    '',
    `[${s.expectedImpact.title}]`,
    `- 예상 방문 규모: ${s.expectedImpact.estimatedVisitors}`,
    s.expectedImpact.content,
    '',
    `[${s.safetyAndRestoration.title}]`,
    `- 보증금 계획: ${s.safetyAndRestoration.depositPlan}`,
    ...s.safetyAndRestoration.pledges.map((p, i) => `${i + 1}. ${p}`),
    '',
    `[${s.termsAndSettlement.title}]`,
    `- 제안 대여 조건: ${s.termsAndSettlement.proposedFee}`,
    `- 입퇴실 일정: ${s.termsAndSettlement.scheduleDetail}`,
    `- 정산 계획: ${s.termsAndSettlement.settlementPlan}`,
    '',
    s.termsAndSettlement.closingNote,
  ].join('\n');
}

export function YouthProposalTab({
  spaces,
  preselectedSpace,
  user,
  onRequireSignIn,
  onOpenActivity,
}: YouthProposalTabProps) {
  const [selectedSpaceId, setSelectedSpaceId] = useState<string>(
    preselectedSpace?.id || spaces[0]?.id || ''
  );
  const [period, setPeriod] = useState('2026년 12월 4일 ~ 12월 6일 (3일간)');
  const [budget, setBudget] = useState('총 24만 원 (일 8만 원 기준, 보증금 별도)');
  const [applicantName, setApplicantName] = useState('강원 청년문화기획팀 이어');
  const [intent, setIntent] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmittingDb, setIsSubmittingDb] = useState(false);
  const [proposal, setProposal] = useState<ProposalDocument | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const resultAnchorRef = useRef<HTMLDivElement | null>(null);

  const selectedSpace = useMemo(() => {
    return spaces.find((s) => s.id === selectedSpaceId) || spaces[0];
  }, [spaces, selectedSpaceId]);

  useEffect(() => {
    if (preselectedSpace) {
      setSelectedSpaceId(preselectedSpace.id);
      const threeDayTotal = preselectedSpace.dailyPrice * 3;
      setBudget(
        `총 ${(threeDayTotal / 10000).toLocaleString()}만 원 내외 (일 ${(
          preselectedSpace.dailyPrice / 10000
        ).toLocaleString()}만 원 기준)`
      );
    }
  }, [preselectedSpace]);

  useEffect(() => {
    if (user?.displayName && applicantName === '강원 청년문화기획팀 이어') {
      setApplicantName(`${user.displayName} 기획팀`);
    }
  }, [user]);

  const handleSpaceChange = (id: string) => {
    setSelectedSpaceId(id);
    const found = spaces.find((s) => s.id === id);
    if (found) {
      const threeDayTotal = found.dailyPrice * 3;
      setBudget(
        `총 ${(threeDayTotal / 10000).toLocaleString()}만 원 내외 (일 ${(
          found.dailyPrice / 10000
        ).toLocaleString()}만 원 기준)`
      );
    }
  };

  const getEffectiveIntent = () =>
    intent.trim() ||
    '춘천 명동 쪽 20평 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다.';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSpace) return;
    setIsLoading(true);
    setCopied(false);
    setSubmitError(null);

    setTimeout(() => {
      resultAnchorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);

    const payload = {
      spaceName: selectedSpace.name,
      spaceAddress: selectedSpace.address,
      spaceFloor: selectedSpace.floor,
      spacePyeong: selectedSpace.pyeong,
      spaceDailyPrice: selectedSpace.dailyPrice,
      period,
      budget,
      intent: getEffectiveIntent(),
      applicantName,
    };

    try {
      const response = await fetch('/api/proposal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const contentType = response.headers.get('content-type') || '';
      if (!response.ok || !contentType.includes('application/json')) {
        setProposal(buildFallbackProposal(payload));
        return;
      }
      const data: ProposalDocument = await response.json();
      if (!data?.documentTitle || !data?.sections?.overviewAndPurpose) {
        setProposal(buildFallbackProposal(payload));
        return;
      }
      setProposal(data);
    } catch {
      setProposal(buildFallbackProposal(payload));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendToLandlordDb = async () => {
    if (!proposal || !selectedSpace) return;
    setSubmitError(null);
    setIsSubmittingDb(true);

    try {
      let activeUser = user;
      if (!activeUser) {
        activeUser = await onRequireSignIn();
        if (!activeUser) {
          setIsSubmittingDb(false);
          return;
        }
      }

      await submitProposalInDb(
        {
          period,
          budget,
          intent: getEffectiveIntent(),
          applicantName,
          proposalText: formatProposalPlainText(proposal),
        },
        proposal,
        selectedSpace,
        activeUser.uid
      );

      setIsSendModalOpen(true);
    } catch (err) {
      console.error(err);
      setSubmitError('DB 저장 중 오류가 발생했습니다. 로그인 후 다시 시도해 주세요.');
    } finally {
      setIsSubmittingDb(false);
    }
  };

  const handleCopyProposal = async () => {
    if (!proposal) return;
    const text = formatProposalPlainText(proposal);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="relative h-full overflow-y-auto bg-slate-50 px-4 py-4 space-y-4">
      {/* Intro & Quick Presets */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-2.5">
        <div>
          <p className="text-[11px] font-bold text-[#0D9488]">청년 기획자 대여 요청 · DB 발송</p>
          <h1 className="text-lg font-bold text-slate-900 mt-0.5 leading-snug">
            건물주가 안심하는 AI 제안서 만들기
          </h1>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed">
            기획 의도만 적으면 원상복구 서약·보증금·상권 파급효과가 포함된 제안서를 작성하고 건물주에게 바로 전송합니다.
          </p>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
          {INTENT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setPeriod(preset.period);
                setIntent(preset.intent);
              }}
              className="min-h-[34px] px-3 py-1.5 text-[11px] font-semibold text-slate-700 bg-slate-100 active:bg-slate-200 rounded-xl whitespace-nowrap shrink-0"
            >
              예시: {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Form Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3.5"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-[#0F3D6E]" />
            신청 정보 입력
          </h2>
          {preselectedSpace && preselectedSpace.id === selectedSpaceId && (
            <span className="text-[11px] font-bold text-[#0D9488]">지도 공간 연동됨</span>
          )}
        </div>

        {selectedSpace && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="m-target-space" className="text-xs font-semibold text-slate-700">
                대상 상가
              </label>
              <a
                href={getNaverMapSearchUrl(selectedSpace.address)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-bold text-[#03C75A] inline-flex items-center gap-1"
              >
                <span>N 네이버 지도</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <select
              id="m-target-space"
              value={selectedSpaceId}
              onChange={(e) => handleSpaceChange(e.target.value)}
              className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
            >
              {spaces.map((space) => (
                <option key={space.id} value={space.id}>
                  [{space.districtName}] {space.name} (일 {space.dailyPrice.toLocaleString()}원)
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label htmlFor="m-rental-period" className="block text-xs font-semibold text-slate-700 mb-1">
            대여 희망 기간
          </label>
          <input
            id="m-rental-period"
            type="text"
            required
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
          />
        </div>

        <div>
          <label htmlFor="m-budget" className="block text-xs font-semibold text-slate-700 mb-1">
            예산 범위
          </label>
          <input
            id="m-budget"
            type="text"
            required
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
          />
        </div>

        <div>
          <label htmlFor="m-applicant" className="block text-xs font-semibold text-slate-700 mb-1">
            신청자 / 기획팀명
          </label>
          <input
            id="m-applicant"
            type="text"
            required
            value={applicantName}
            onChange={(e) => setApplicantName(e.target.value)}
            className="w-full min-h-[44px] px-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E]"
          />
        </div>

        <div>
          <label htmlFor="m-intent" className="block text-xs font-semibold text-slate-700 mb-1">
            간단한 기획 의도
          </label>
          <textarea
            id="m-intent"
            rows={3}
            value={intent}
            onChange={(e) => setIntent(e.target.value)}
            placeholder="춘천 명동 쪽 20평 공간에서 3일간 아이돌 생일카페를 열고 싶어요. 컵홀더 이벤트와 포토존을 운영할 예정입니다."
            className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F3D6E] resize-none leading-relaxed"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 rounded-xl bg-[#0F3D6E] hover:bg-[#0B2F55] disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.99] transition-transform"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>AI 제안서 작성 중...</span>
            </>
          ) : (
            <span>AI 건물주 설득 제안서 생성</span>
          )}
        </button>
      </form>

      <div ref={resultAnchorRef} />

      {submitError && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5 text-xs font-semibold text-rose-700">
          {submitError}
        </div>
      )}

      {isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3 animate-pulse">
          <div className="h-5 w-3/4 bg-slate-200 rounded" />
          <div className="h-24 bg-slate-100 rounded-xl" />
          <div className="h-28 bg-slate-100 rounded-xl" />
        </div>
      )}

      {proposal && !isLoading && (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-4">
          <div className="p-4 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
              <span className="font-bold text-[#0F3D6E]">공간 사용 기획서 및 단기 대여 요청서</span>
              <span className="font-mono tabular-nums">{proposal.createdDate}</span>
            </div>
            <h3 className="text-sm font-bold text-slate-900 leading-snug">
              {proposal.documentTitle}
            </h3>
            <div className="mt-2 pt-2 border-t border-slate-200/80 text-[11px] text-slate-600 space-y-0.5">
              <p>
                <span className="text-slate-400 mr-1.5">수신:</span>
                <strong className="text-slate-800">{proposal.recipient}</strong>
              </p>
              <p>
                <span className="text-slate-400 mr-1.5">발신:</span>
                <strong className="text-slate-800">{proposal.sender}</strong>
              </p>
            </div>
          </div>

          <div className="p-4 space-y-5 text-xs leading-relaxed">
            <section className="space-y-2">
              <h4 className="text-sm font-bold text-[#0F3D6E]">
                {proposal.sections.overviewAndPurpose.title}
              </h4>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1 text-[11px]">
                <p>
                  <strong className="text-slate-700">기간:</strong>{' '}
                  {proposal.sections.overviewAndPurpose.period}
                </p>
                <p>
                  <strong className="text-slate-700">공간:</strong>{' '}
                  {proposal.sections.overviewAndPurpose.locationSummary}
                </p>
              </div>
              <p className="text-slate-700 whitespace-pre-line">
                {proposal.sections.overviewAndPurpose.content}
              </p>
            </section>

            <hr className="border-slate-100" />

            <section className="space-y-1.5">
              <h4 className="text-sm font-bold text-[#0F3D6E]">
                {proposal.sections.expectedImpact.title}
              </h4>
              <p className="text-[11px] font-bold text-[#0D9488]">
                {proposal.sections.expectedImpact.estimatedVisitors}
              </p>
              <p className="text-slate-700 whitespace-pre-line">
                {proposal.sections.expectedImpact.content}
              </p>
            </section>

            <hr className="border-slate-100" />

            <section className="space-y-2">
              <h4 className="text-sm font-bold text-[#0F3D6E]">
                {proposal.sections.safetyAndRestoration.title}
              </h4>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-2.5 text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0D9488] shrink-0" />
                <span>{proposal.sections.safetyAndRestoration.depositPlan}</span>
              </div>
              <ul className="space-y-1.5">
                {proposal.sections.safetyAndRestoration.pledges.map((pledge, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-slate-700">
                    <span className="font-mono font-bold text-[#0F3D6E] shrink-0">
                      {idx + 1}.
                    </span>
                    <span>{pledge}</span>
                  </li>
                ))}
              </ul>
            </section>

            <hr className="border-slate-100" />

            <section className="space-y-2">
              <h4 className="text-sm font-bold text-[#0F3D6E]">
                {proposal.sections.termsAndSettlement.title}
              </h4>
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-700">
                <p>
                  <strong className="text-slate-900">대여 조건:</strong>{' '}
                  {proposal.sections.termsAndSettlement.proposedFee}
                </p>
                <p>
                  <strong className="text-slate-900">일정:</strong>{' '}
                  {proposal.sections.termsAndSettlement.scheduleDetail}
                </p>
                <p>{proposal.sections.termsAndSettlement.settlementPlan}</p>
              </div>
              <p className="text-slate-700">{proposal.sections.termsAndSettlement.closingNote}</p>
            </section>
          </div>

          <div className="p-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleCopyProposal}
              className="min-h-[44px] px-3 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-xl flex items-center justify-center gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-[#0D9488]" />
                  <span className="text-[#0D9488]">복사 완료</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>내용 복사하기</span>
                </>
              )}
            </button>

            <button
              type="button"
              disabled={isSubmittingDb}
              onClick={handleSendToLandlordDb}
              className="min-h-[44px] px-3 py-2 text-xs font-bold text-white bg-[#0D9488] hover:bg-[#0F766E] disabled:opacity-60 rounded-xl flex items-center justify-center gap-1.5"
            >
              {isSubmittingDb ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>DB 전송 중...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>건물주에게 제안 보내기</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {isSendModalOpen && proposal && selectedSpace && (
        <div
          className="fixed md:absolute inset-0 z-[600] bg-slate-900/55 backdrop-blur-xs flex items-end md:items-center justify-center p-3"
          role="dialog"
          aria-modal="true"
          aria-labelledby="m-proposal-modal-title"
        >
          <div className="bg-white border border-slate-200 rounded-3xl w-full p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-[#0D9488]" />
              </div>
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                aria-label="닫기"
                className="p-1.5 text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <h3 id="m-proposal-modal-title" className="text-base font-bold text-slate-900">
              제안서가 실제 DB에 저장·발송되었습니다
            </h3>
            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
              작성하신 기획서와 원상복구 서약이 Firestore에 등록되었습니다. 매칭함에서 수락 상태와 내역을 확인할 수 있습니다.
            </p>

            <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">대상 상가</span>
                <span className="font-bold text-slate-900 text-right truncate">{selectedSpace.name}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-slate-500 shrink-0">희망 기간</span>
                <span className="font-semibold text-slate-900 text-right inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  {period}
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsSendModalOpen(false)}
                className="h-11 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold"
              >
                닫기
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSendModalOpen(false);
                  onOpenActivity();
                }}
                className="h-11 rounded-xl bg-[#0F3D6E] text-white text-xs font-bold"
              >
                매칭함에서 보기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
