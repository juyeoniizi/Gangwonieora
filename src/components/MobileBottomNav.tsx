import { MapPin, Building2, FileText, Inbox } from 'lucide-react';
import { TabId } from '../types/space';

interface MobileBottomNavProps {
  activeTab: TabId;
  onSelectTab: (tab: TabId) => void;
  activityCount?: number;
}

const TABS: Array<{ id: TabId; label: string; icon: typeof MapPin }> = [
  { id: 'explore', label: '공실 지도', icon: MapPin },
  { id: 'diagnose', label: 'AI 진단', icon: Building2 },
  { id: 'proposal', label: 'AI 제안서', icon: FileText },
  { id: 'activity', label: '매칭함', icon: Inbox },
];

export function MobileBottomNav({
  activeTab,
  onSelectTab,
  activityCount = 0,
}: MobileBottomNavProps) {
  return (
    <nav
      aria-label="하단 앱 메뉴"
      className="h-16 shrink-0 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-4 items-center z-30"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onSelectTab(tab.id)}
            className={`relative h-full min-h-[44px] flex flex-col items-center justify-center gap-1 transition-colors ${
              isActive ? 'text-[#0F3D6E]' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <div className="relative">
              <Icon
                className={`w-[20px] h-[20px] ${
                  isActive ? 'text-[#0F3D6E]' : 'text-slate-400'
                }`}
                strokeWidth={isActive ? 2.4 : 1.8}
              />
              {tab.id === 'activity' && activityCount > 0 && (
                <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full bg-[#0D9488] text-white text-[9px] font-bold flex items-center justify-center tabular-nums">
                  {activityCount}
                </span>
              )}
            </div>
            <span
              className={`text-[10.5px] leading-none tracking-tight whitespace-nowrap ${
                isActive ? 'font-bold text-[#0F3D6E]' : 'font-medium text-slate-500'
              }`}
            >
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
