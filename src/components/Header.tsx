import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, User, LogOut, LayoutDashboard, Shield } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Header = () => {
  const { user, isAdmin, isCreator, signOut, isLoading } = useAuth();
  const { data: site } = useSiteSettings();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };


  const siteName = site?.site_name || 'TribeYangu';
  // Highlight the trailing word/segment of whatever name the admin has configured.
  const trimmedName = siteName.trim();
  const splitAt = trimmedName.lastIndexOf(' ');
  const nameParts = splitAt > 0
    ? [trimmedName.slice(0, splitAt + 1), trimmedName.slice(splitAt + 1)]
    : [trimmedName, ''];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-14 md:h-20">
          <Link to="/" className="flex items-center gap-2 group">
            {site?.site_logo_url ? (
              <img src={site.site_logo_url} alt={siteName} className="w-10 h-10 rounded-xl object-contain" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center group-hover:bg-accent transition-colors duration-300">
                <Heart className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
            )}
            <span className="font-display text-xl md:text-2xl font-semibold text-foreground tracking-tight">
              {nameParts[0]}<span className="text-accent">{nameParts[1]}</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/advertise" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              For Brands
            </Link>
            <Link to="/explore" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Roster
            </Link>
            <Link to="/vote" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Awards
            </Link>
            <Link to="/contact" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Contact
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[120px] truncate">{user.email}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin Dashboard
                    </DropdownMenuItem>
                  )}
                  {isCreator && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Creator Dashboard
                    </DropdownMenuItem>
                  )}
                  {!isAdmin && !isCreator && (
                    <DropdownMenuItem onClick={() => navigate('/account')}>
                      <User className="w-4 h-4 mr-2" />
                      My Account
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Button variant="ghost" asChild>
                  <Link to="/login">Log In</Link>
                </Button>
                <Button variant="hero" asChild>
                  <Link to="/signup">Join the Roster</Link>
                </Button>
              </>
            )}
          </div>

          {/* Mobile: just show user avatar or login, no hamburger (bottom nav handles navigation) */}
          <div className="md:hidden flex items-center gap-2">
            {!isLoading && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="p-1 rounded-full">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src="" />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                        {user.email?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Shield className="w-4 h-4 mr-2" />
                      Admin
                    </DropdownMenuItem>
                  )}
                  {isCreator && (
                    <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="hero" size="sm" asChild>
                <Link to="/signup">Join</Link>
              </Button>
            )}
          </div>
        </div>

        {/* Removed mobile menu - bottom nav handles navigation */}
      </div>
    </header>
  );
};

export default Header;
