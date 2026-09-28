import React from 'react';
import {
  Home,
  Sprout,
  Anchor,
  BarChart2,
  MapPin,
  Bookmark,
  Settings,
  HelpCircle,
  Zap,
} from 'lucide-react';

export type NavTab = 'home' | 'farming' | 'marine' | 'climate' | 'map' | 'saved' | 'settings' | 'help';

interface SidebarNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  dataSaver: boolean;
  onToggleDataSaver: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  onSelectTab,
  dataSaver,
  onToggleDataSaver,
  isMobileOpen = false,
  onCloseMobile,
}) => {
  const mainNavItems = [
    { id: 'home' as NavTab, label: 'Home', icon: Home },
    { id: 'farming' as NavTab, label: 'Farming', icon: Sprout },
    { id: 'marine' as NavTab, label: 'Marine', icon: Anchor },
    { id: 'climate' as NavTab, label: 'Climate', icon: BarChart2 },
    { id: 'map' as NavTab, label: 'Map', icon: MapPin },
    { id: 'saved' as NavTab, label: 'Saved', icon: Bookmark },
  ];

  const bottomNavItems = [
    { id: 'settings' as NavTab, label: 'Settings', icon: Settings },
    { id: 'help' as NavTab, label: 'Help', icon: HelpCircle },
  ];

  const handleNavClick = (id: NavTab) => {
    onSelectTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed lg:static top-0 left-0 bottom-0 z-50 w-64 bg-white dark:bg-slate-900 border-r border-slate-200/90 dark:border-slate-800 flex flex-col justify-between p-5 transition-transform duration-200 ${
          isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="space-y-6">
          {/* Logo & Branding Header matching Reference Image */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => handleNavClick('home')}>
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
              <img
                src="/assets/weathergpt-logo.svg"
                alt="WeatherGPT Logo"
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = '/assets/weathergpt-logo.png';
                }}
              />
            </div>
            <div>
              <h1 className="font-stardom text-xl font-bold text-slate-900 dark:text-white leading-tight">
                WeatherGPT
              </h1>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium leading-tight">
                Your Weather Intelligence Assistant
              </p>
            </div>
          </div>

          {/* Main Navigation Links */}
          <nav className="space-y-1">
            {mainNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-3 rounded-xl text-sm font-semibold transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#1D89F5] text-white shadow-md shadow-blue-500/20'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className={`w-5 h-5 shrink-0 ${isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Section: Settings, Help & Data Saver Widget */}
        <div className="space-y-4 pt-4 border-t border-slate-200/80 dark:border-slate-800">
          <nav className="space-y-1">
            {bottomNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Data Saver Toggle Switch Card */}
          <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Zap className={`w-3.5 h-3.5 ${dataSaver ? 'text-emerald-500' : 'text-slate-400'}`} />
                <span>Data Saver</span>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={dataSaver}
                onClick={onToggleDataSaver}
                className={`w-10 h-5.5 rounded-full transition-colors p-0.5 cursor-pointer relative ${
                  dataSaver ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'
                }`}
              >
                <div
                  className={`w-4 h-4 rounded-full bg-white shadow-xs transition-transform ${
                    dataSaver ? 'translate-x-4.5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1.5 leading-snug">
              Reduce data usage for low network areas
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
