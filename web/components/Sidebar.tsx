import React, { useState, useEffect, useRef, useContext } from 'react';
import { Page } from '../types';
import { Icon, IconName } from './Icon';
import { AppContext } from '../App';
import { useTour } from '../context/TourContext';

export type AppTheme = 'light' | 'dark' | 'paper';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  theme: AppTheme;
  setTheme: (theme: AppTheme) => void;
  onLogout?: () => void;
  /** Mobile drawer open state (below the `lg` breakpoint). */
  isMobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

interface NavItemProps {
  icon: IconName;
  label: Page;
  isActive: boolean;
  onClick: () => void;
  isCollapsed: boolean;
}

// A few Page values need friendlier, spaced-out sidebar text.
const NAV_LABELS: Partial<Record<Page, string>> = {
  ImportExport: 'Import / Export',
};

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isCollapsed }) => (
  <li>
    <a
      href="#"
      onClick={(e) => {
        e.preventDefault();
        onClick();
      }}
      className={`flex items-center p-3 rounded-lg transition-colors duration-200 ${isActive
        ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-semibold'
        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon name={icon} className={!isCollapsed ? "mr-3" : ""} size={20} />
      {!isCollapsed && <span>{label}</span>}
    </a>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isCollapsed, setCollapsed, theme, setTheme, onLogout, isMobileOpen, setMobileOpen }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { startTour } = useTour();
  const context = useContext(AppContext);
  // Read the user from context so name/avatar/timezone changes made on the
  // Profile page reflect live instead of only after a full reload.
  const user = context?.user ?? null;
  const userMenuRef = useRef<HTMLDivElement>(null);

  const navItems = React.useMemo((): { icon: IconName; label: Page }[] => {
    const items: { icon: IconName; label: Page }[] = [
      { icon: 'LayoutDashboard', label: 'Dashboard' },
      { icon: 'ArrowLeftRight', label: 'Transactions' },
      { icon: 'Wallet', label: 'Accounts' },
      { icon: 'Target', label: 'Budgets' },
      { icon: 'Tags', label: 'Categories' },
      { icon: 'RefreshCw', label: 'Recurring' },
      { icon: 'PieChart', label: 'Reports' },
      { icon: 'Upload', label: 'ImportExport' },
    ];
    if (user?.role === 'superadmin') {
      items.push({ icon: 'UserCheck', label: 'Admin' });
    }
    return items;
  }, [user]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [userMenuRef]);

  const toggleTheme = () => {
    if (theme === 'light') setTheme('dark');
    else if (theme === 'dark') setTheme('paper');
    else setTheme('light');
  };

  const getThemeIcon = () => {
    if (theme === 'light') return 'Sun';
    if (theme === 'dark') return 'Moon';
    return 'BookOpen'; // paper
  };

  const getThemeLabel = () => {
    if (theme === 'light') return 'Light Mode';
    if (theme === 'dark') return 'Dark Mode';
    return 'Paper Mode';
  };

  return (
    <aside
      className={`flex flex-col fixed left-0 top-0 h-screen z-50 transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'} bg-gray-50 dark:bg-black border-r border-gray-200 dark:border-gray-800 paper:bg-[#f4f0e6] paper:border-[#d6cfbf]`}
    >
        <div className="px-5 py-5 flex items-center justify-between">
          {!isCollapsed && <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">ExpenseVision</h1>}
          {isCollapsed &&
            <div className="w-full flex justify-center">
              <Icon name="Wallet" className="text-gray-900 dark:text-white" size={24} />
            </div>
          }
          {!isCollapsed &&
            <button onClick={() => setCollapsed(true)} className="text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors" aria-label="Collapse sidebar">
              <Icon name="ChevronLeft" size={20} />
            </button>
          }
        </div>

        {/* flex-1 pushes the profile block below to the bottom of the sidebar
            at every window size and browser zoom level */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {isCollapsed &&
            <div className="mb-4">
              <button onClick={() => setCollapsed(false)} className="w-full flex justify-center text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white p-3 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors" aria-label="Expand sidebar">
                <Icon name="ChevronRight" size={20} />
              </button>
            </div>
          }
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.label}
                data-tour={`nav-${item.label}`}
                onClick={() => setActivePage(item.label as any)}
                className={`flex items-center w-full p-2.5 rounded-lg transition-colors ${activePage === item.label
                  ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white font-medium'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon name={item.icon} size={18} />
                {!isCollapsed && <span className="ml-3 font-medium text-[13px]">{NAV_LABELS[item.label] || item.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-3 pb-3 relative" ref={userMenuRef}>
          {isUserMenuOpen && (
            <div
              className={`absolute bg-white dark:bg-gray-900 rounded-lg shadow-xl overflow-hidden border border-gray-200 dark:border-gray-700 z-50 ${isCollapsed
                  ? 'left-full bottom-0 ml-4 w-48'
                  : 'bottom-full left-0 right-0 mb-2'
                }`}
            >
              <ul className="py-1 text-sm text-gray-700 dark:text-gray-200">
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center cursor-pointer transition-colors"
                  onClick={() => {
                    setActivePage('Profile');
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="User" className="mr-3 text-gray-400" size={16} /> Profile
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center cursor-pointer transition-colors"
                  onClick={() => {
                    setActivePage('Settings');
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="Settings" className="mr-3 text-gray-400" size={16} /> Settings
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800"
                  onClick={() => {
                    startTour();
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="GraduationCap" className="mr-3 text-gray-400" size={16} /> Take a Tour
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center cursor-pointer transition-colors border-t border-gray-100 dark:border-gray-800"
                  onClick={() => {
                    toggleTheme();
                  }}
                >
                  <Icon name={getThemeIcon()} className="mr-3 text-gray-400" size={16} /> {getThemeLabel()}
                </li>
                <li
                  className="px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center cursor-pointer text-red-500 transition-colors border-t border-gray-100 dark:border-gray-800"
                  onClick={() => {
                    if (onLogout) {
                      onLogout();
                    }
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="LogOut" className="mr-3" size={16} /> Log out
                </li>
              </ul>
            </div>
          )}
          <button onClick={() => setIsUserMenuOpen(o => !o)} className={`flex items-center w-full p-2.5 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="User Avatar"
                className="h-8 w-8 rounded-full ring-2 ring-gray-200 dark:ring-gray-700"
              />
            ) : (
              <div className="h-8 w-8 rounded-full ring-1 ring-gray-200 dark:ring-gray-700 bg-primary/10 flex items-center justify-center text-primary font-semibold text-xs flex-shrink-0">
                {(user?.name || 'U').trim().charAt(0).toUpperCase()}
              </div>
            )}
            {!isCollapsed &&
              <div className="ml-3 text-left overflow-hidden">
                <p className="font-semibold text-gray-900 dark:text-white text-sm truncate">{user?.name || 'User'}</p>
              </div>
            }
          </button>
        </div>
    </aside>
  );
};