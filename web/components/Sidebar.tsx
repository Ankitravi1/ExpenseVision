import React, { useState, useEffect, useRef, useContext } from 'react';
import { Page } from '../types';
import { Icon, IconName } from './Icon';
import { AppContext } from '../App';

interface SidebarProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
  isCollapsed: boolean;
  setCollapsed: (isCollapsed: boolean) => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
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
        ? 'bg-gray-700 text-white font-semibold'
        : 'text-gray-400 hover:bg-gray-700 hover:text-white'
        } ${isCollapsed ? 'justify-center' : ''}`}
      title={isCollapsed ? label : undefined}
    >
      <Icon name={icon} className={!isCollapsed ? "mr-3" : ""} size={22} />
      {!isCollapsed && <span>{label}</span>}
    </a>
  </li>
);

export const Sidebar: React.FC<SidebarProps> = ({ activePage, setActivePage, isCollapsed, setCollapsed, theme, setTheme, onLogout, isMobileOpen, setMobileOpen }) => {
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
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
    setTheme(theme === 'light' ? 'dark' : 'light');
  }

  return (
    <aside
      className={`flex flex-col fixed left-0 top-0 h-screen z-50 transition-transform duration-300 lg:translate-x-0 ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'} ${isCollapsed ? 'w-20' : 'w-64'}`}
      style={{
        background: 'var(--gradient-sidebar)',
        boxShadow: 'var(--shadow-sidebar)',
      }}
    >
        <div className="px-6 py-6 flex items-center justify-between">
          {!isCollapsed && <h1 className="text-2xl font-bold text-white tracking-tight">ExpenseVision</h1>}
          {isCollapsed &&
            <div className="w-full flex justify-center">
              <Icon name="Wallet" className="text-white" size={24} />
            </div>
          }
          {!isCollapsed &&
            <button onClick={() => setCollapsed(true)} className="text-gray-400 hover:text-white transition-colors" aria-label="Collapse sidebar">
              <Icon name="ChevronLeft" size={20} />
            </button>
          }
        </div>

        {/* flex-1 pushes the profile block below to the bottom of the sidebar
            at every window size and browser zoom level */}
        <nav className="flex-1 overflow-y-auto px-4 py-2">
          {isCollapsed &&
            <div className="mb-4">
              <button onClick={() => setCollapsed(false)} className="w-full flex justify-center text-gray-400 hover:text-white p-3 rounded-xl hover:bg-white/10 transition-colors" aria-label="Expand sidebar">
                <Icon name="ChevronRight" size={20} />
              </button>
            </div>
          }
          <div className="space-y-1">
            {navItems.map(item => (
              <button
                key={item.label}
                onClick={() => setActivePage(item.label as any)}
                className={`flex items-center w-full p-3 rounded-xl transition-colors ${activePage === item.label
                  ? 'bg-white/20 text-white shadow-lg'
                  : 'text-gray-300 hover:bg-white/10 hover:text-white'
                  } ${isCollapsed ? 'justify-center' : ''}`}
              >
                <Icon name={item.icon} size={20} />
                {!isCollapsed && <span className="ml-3 font-medium">{NAV_LABELS[item.label] || item.label}</span>}
              </button>
            ))}
          </div>
        </nav>

        <div className="px-4 pb-4 relative">
          {isUserMenuOpen && (
            <div
              className={`absolute bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-700 z-50 ${isCollapsed
                  ? 'left-full bottom-0 ml-4 w-48'
                  : 'bottom-full left-0 right-0 mb-2'
                }`}
            >
              <ul className="py-1 text-sm text-gray-200">
                <li
                  className="px-4 py-2.5 hover:bg-gray-700/50 flex items-center cursor-pointer transition-colors"
                  onClick={() => {
                    setActivePage('Profile');
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="User" className="mr-3" size={16} /> Profile
                </li>
                <li
                  className="px-4 py-2.5 hover:bg-gray-700/50 flex items-center cursor-pointer transition-colors"
                  onClick={() => {
                    setActivePage('Settings');
                    setIsUserMenuOpen(false);
                  }}
                >
                  <Icon name="Settings" className="mr-3" size={16} /> Settings
                </li>
                <li
                  className="px-4 py-2.5 hover:bg-gray-700/50 flex items-center cursor-pointer transition-colors"
                  onClick={() => {
                    toggleTheme();
                  }}
                >
                  <Icon name={theme === 'light' ? 'Moon' : 'Sun'} className="mr-3" size={16} /> {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </li>
                <li
                  className="px-4 py-2.5 hover:bg-gray-700/50 flex items-center cursor-pointer text-red-400 transition-colors"
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
          <button onClick={() => setIsUserMenuOpen(o => !o)} className={`flex items-center w-full p-3 rounded-xl hover:bg-white/10 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt="User Avatar"
                className="h-9 w-9 rounded-full ring-2 ring-white/20"
              />
            ) : (
              <div className="h-9 w-9 rounded-full ring-2 ring-white/20 bg-primary flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                {(user?.name || 'U').trim().charAt(0).toUpperCase()}
              </div>
            )}
            {!isCollapsed &&
              <div className="ml-3 text-left overflow-hidden">
                <p className="font-semibold text-white text-sm truncate">{user?.name || 'User'}</p>
                <p className="text-xs text-gray-400 truncate">{user?.email || 'user@example.com'}</p>
              </div>
            }
          </button>
        </div>
    </aside>
  );
};