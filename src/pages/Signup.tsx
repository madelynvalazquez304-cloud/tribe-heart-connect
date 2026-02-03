import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Referral cache utility
const REFERRAL_STORAGE_KEY = 'tribeyangu_referral_code';
const REFERRAL_EXPIRY_KEY = 'tribeyangu_referral_expiry';
const REFERRAL_TTL_DAYS = 30;

const cacheReferral = (code: string) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + REFERRAL_TTL_DAYS);
  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
};

const Signup = () => {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatorSignup, setIsCreatorSignup] = useState(false);
  const { signUp, user, isAdmin, isCreator, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Check for referral code and cache it
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      cacheReferral(ref);
      setIsCreatorSignup(true);
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isCreator) {
        navigate('/dashboard');
      } else {
        // If they came from a referral link, send them to become a creator
        const ref = searchParams.get('ref') || localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (ref && isCreatorSignup) {
          navigate('/become-creator');
        } else {
          navigate('/account');
        }
      }
    }
  }, [user, isAdmin, isCreator, authLoading, navigate, searchParams, isCreatorSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const { error } = await signUp(email, password, fullName);
    
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    toast.success('Account created successfully! Welcome to TribeYangu.');
    // Auto-redirect will happen when auth state updates
  };

  const hasReferral = searchParams.get('ref') || localStorage.getItem(REFERRAL_STORAGE_KEY);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2">
            <div className="w-12 h-12 bg-gradient-to-br from-primary to-primary/80 rounded-xl flex items-center justify-center shadow-lg">
              <Heart className="w-6 h-6 text-primary-foreground" fill="currentColor" />
            </div>
            <span className="text-2xl font-bold text-foreground">TribeYangu</span>
          </Link>
          <h1 className="text-2xl font-bold mt-6 text-foreground">
            {hasReferral ? 'Join as a Creator' : 'Create Account'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {hasReferral 
              ? 'You\'ve been invited to join TribeYangu as a creator!'
              : 'Join TribeYangu and support your favorite creators'
            }
          </p>
          
          {hasReferral && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" />
              Partner Referral
            </div>
          )}
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="John Doe"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full"
              variant="hero"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : hasReferral ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Create Creator Account
                </>
              ) : (
                'Create Account'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        {/* Back to home */}
        <div className="text-center mt-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
