import { User } from 'firebase/auth';
import { LogIn, LogOut } from 'lucide-react';
import { TabId } from '../types/space';

interface MobileTopBarProps {
  activeTab: TabId;
  user: User | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

const TAB_TITLES: Record<TabId, string> = {
  explore: '강원이어라',
  diagnose: '건물주 AI 진단',
  proposal: '청년 AI 제안서',
  activity: '내 DB 매칭함',
};

export function MobileTopBar({ activeTab, user, onSignIn, onSignOut }: MobileTopBarProps) {
  return (
    <header className="h-[52px] shrink-0 bg-white border-b border-slate-200 px-3.5 flex items-center justify-between gap-2 z-30">
      <div className="flex items-center gap-2 min-w-0">
        <span className="w-7 h-7 rounded-lg bg-[#0F3D6E] flex items-center justify-center text-white font-bold text-xs tracking-tight shrink-0">
          이어
        </span>
        <span className="text-[15px] font-bold text-slate-900 truncate">
          {TAB_TITLES[activeTab]}
        </span>
      </div>

      {user ? (
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-700 max-w-[90px] truncate">
            {user.displayName || '사용자'}
          </span>
          <button
            type="button"
            onClick={onSignOut}
            aria-label="로그아웃"
            className="w-8 h-8 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onSignIn}
          className="px-2.5 py-1.5 min-h-[34px] text-xs font-bold text-[#0F3D6E] bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors inline-flex items-center gap-1 whitespace-nowrap shrink-0"
        >
          <LogIn className="w-3.5 h-3.5" />
          <span>Google 로그인</span>
        </button>
      )}
    </header>
  );
}
