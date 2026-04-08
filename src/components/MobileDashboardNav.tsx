import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Heart, ShoppingBag, Ticket, Settings, BarChart3, Wallet, Gift, Megaphone, Shield, Users, CreditCard, Trophy, FolderKanban, Handshake, Ban, ShoppingCart, Globe, Palette, LinkIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileDashboardNavProps {
  type: 'admin' | 'creator';
}

const creatorTabs = [
  { label: 'Home', icon: LayoutDashboard, path: '/dashboard' },
  { label: 'Earnings', icon: Heart, path: '/dashboard/donations' },
  { label: 'Store', icon: ShoppingBag, path: '/dashboard/merchandise' },
  { label: 'Events', icon: Ticket, path: '/dashboard/events' },
  { label: 'More', icon: Settings, path: '/dashboard/settings' },
];

const adminTabs = [
  { label: 'Home', icon: LayoutDashboard, path: '/admin' },
  { label: 'Creators', icon: Users, path: '/admin/creators' },
  { label: 'Finance', icon: Wallet, path: '/admin/withdrawals' },
  { label: 'Awards', icon: Trophy, path: '/admin/awards' },
  { label: 'Settings', icon: Settings, path: '/admin/settings' },
];

const MobileDashboardNav: React.FC<MobileDashboardNavProps> = ({ type }) => {
  const location = useLocation();
  const tabs = type === 'admin' ? adminTabs : creatorTabs;

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-1">
        {tabs.map((tab) => {
          const isActive = tab.path === '/dashboard' || tab.path === '/admin'
            ? location.pathname === tab.path
            : location.pathname.startsWith(tab.path);

          return (
            <Link
              key={tab.path}
              to={tab.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 flex-1 h-14 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200',
                isActive && 'bg-primary/10 scale-110'
              )}>
                <tab.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                isActive && 'font-semibold'
              )}>
                {tab.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileDashboardNav;
