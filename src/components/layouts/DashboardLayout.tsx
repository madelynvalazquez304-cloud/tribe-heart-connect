import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Heart,
  LayoutDashboard,
  Users,
  DollarSign,
  Settings,
  LogOut,
  Menu,
  X,
  ShoppingBag,
  Ticket,
  Trophy,
  Link as LinkIcon,
  BarChart3,
  CreditCard,
  Bell,
  ChevronDown,
  UserCircle,
  Shield,
  Palette,
  Wallet,
  FolderKanban,
  Globe,
  Gift,
  Megaphone,
  Handshake,
  Ban
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  type: 'admin' | 'creator';
}

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Creators', href: '/admin/creators', icon: Users },
  { label: 'Categories', href: '/admin/categories', icon: FolderKanban },
  { label: 'Donations', href: '/admin/donations', icon: Heart },
  { label: 'Withdrawals', href: '/admin/withdrawals', icon: Wallet },
  { label: 'Transactions', href: '/admin/transactions', icon: DollarSign },
  { label: 'Campaigns', href: '/admin/campaigns', icon: Megaphone },
  { label: 'Merchandise', href: '/admin/merchandise', icon: ShoppingBag },
  { label: 'Events', href: '/admin/events', icon: Ticket },
  { label: 'Gifts', href: '/admin/gifts', icon: Gift },
  { label: 'Partners', href: '/admin/partners', icon: Handshake },
  { label: 'Awards & Voting', href: '/admin/awards', icon: Trophy },
  { label: 'Disabled Accounts', href: '/admin/disabled-accounts', icon: Ban },
  { label: 'Payment Config', href: '/admin/payments', icon: CreditCard },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

const creatorNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Donations', href: '/dashboard/donations', icon: Heart },
  { label: 'Gifts', href: '/dashboard/gifts', icon: Gift },
  { label: 'Campaigns', href: '/dashboard/campaigns', icon: Megaphone },
  { label: 'Merchandise', href: '/dashboard/merchandise', icon: ShoppingBag },
  { label: 'Events', href: '/dashboard/events', icon: Ticket },
  { label: 'Withdrawals', href: '/dashboard/withdrawals', icon: Wallet },
  { label: 'Partners', href: '/dashboard/partners', icon: Handshake },
  { label: 'Links', href: '/dashboard/links', icon: LinkIcon },
  { label: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
  { label: 'Customize', href: '/dashboard/customize', icon: Palette },
  { label: 'Domain', href: '/dashboard/domain', icon: Globe },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children, type }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, signOut, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = type === 'admin' ? adminNavItems : creatorNavItems;

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 h-16 bg-card border-b border-border flex items-center justify-between px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 rounded-lg hover:bg-secondary"
        >
          <Menu className="w-6 h-6" />
        </button>
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 gradient-warm rounded-lg flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
          </div>
          <span className="font-display font-semibold">TribeYangu</span>
        </Link>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full">
              <Avatar className="w-8 h-8">
                <AvatarImage src="" />
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {user?.email?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-foreground/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 z-50 h-full w-64 bg-card border-r border-border transition-transform duration-300 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-border">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 gradient-warm rounded-lg flex items-center justify-center">
                <Heart className="w-4 h-4 text-primary-foreground" fill="currentColor" />
              </div>
              <span className="font-display font-semibold text-foreground">TribeYangu</span>
            </Link>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden p-1 rounded hover:bg-secondary"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Role Badge */}
          <div className="px-4 py-3">
            <div className={cn(
              "px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2",
              type === 'admin' 
                ? "bg-destructive/10 text-destructive" 
                : "bg-primary/10 text-primary"
            )}>
              {type === 'admin' ? (
                <>
                  <Shield className="w-4 h-4" />
                  Admin Panel
                </>
              ) : (
                <>
                  <UserCircle className="w-4 h-4" />
                  Creator Dashboard
                </>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  onClick={() => setSidebarOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  {item.label}
                  {item.badge && (
                    <span className="ml-auto bg-destructive text-destructive-foreground text-xs px-2 py-0.5 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Menu */}
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-secondary transition-colors">
                  <Avatar className="w-9 h-9">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user?.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user?.email}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{type}</p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {type === 'creator' && isAdmin && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Panel
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                {type === 'admin' && (
                  <>
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Creator Dashboard
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={() => navigate('/')}>
                  <Heart className="w-4 h-4 mr-2" />
                  View Site
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:pl-64 pt-16 lg:pt-0 min-h-screen">
        <div className="p-4 md:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
