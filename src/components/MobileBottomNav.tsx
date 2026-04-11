import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Search, Trophy, User, Heart } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

const MobileBottomNav: React.FC = () => {
  const location = useLocation();
  const { user, isAdmin, isCreator } = useAuth();

  // Don't show on dashboard/admin pages or creator profile pages
  const isDashboard = location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/admin');
  const isCreatorProfile = !['/', '/explore', '/vote', '/login', '/signup', '/contact', '/become-creator', '/reset-password', '/account'].includes(location.pathname) 
    && !isDashboard 
    && !location.pathname.startsWith('/admin')
    && !location.pathname.startsWith('/dashboard');
  if (isDashboard || isCreatorProfile) return null;

  const getDashboardPath = () => {
    if (isAdmin) return '/admin';
    if (isCreator) return '/dashboard';
    return user ? '/account' : '/login';
  };

  const navItems = [
    { label: 'Home', icon: Home, path: '/' },
    { label: 'Explore', icon: Search, path: '/explore' },
    { label: 'Awards', icon: Trophy, path: '/vote' },
    { label: 'Account', icon: User, path: getDashboardPath() },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const isActive = item.path === '/'
            ? location.pathname === '/'
            : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 w-16 h-14 rounded-xl transition-all duration-200',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <div className={cn(
                'flex items-center justify-center w-10 h-7 rounded-full transition-all duration-200',
                isActive && 'bg-primary/10 scale-110'
              )}>
                <item.icon className={cn('w-5 h-5', isActive && 'stroke-[2.5px]')} />
              </div>
              <span className={cn(
                'text-[10px] font-medium leading-tight',
                isActive && 'font-semibold'
              )}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default MobileBottomNav;
