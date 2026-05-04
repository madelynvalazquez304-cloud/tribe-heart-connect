import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, Mail, Lock, User, Eye, EyeOff, Loader2, Sparkles, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable';
import { useSocialAuthEnabled } from '@/hooks/useFeatureFlags';

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
  const [phone, setPhone] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatorSignup, setIsCreatorSignup] = useState(false);
  const { signUp, user, isAdmin, isCreator, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: socialFlags } = useSocialAuthEnabled();
  const [googleLoading, setGoogleLoading] = useState(false);

  const signInWithGoogle = async () => {
    setGoogleLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error((result.error as any)?.message || 'Google sign-in failed');
        setGoogleLoading(false);
      }
    } catch (e: any) {
      toast.error(e?.message || 'Google sign-in failed');
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      cacheReferral(ref);
      setIsCreatorSignup(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!authLoading && user) {
      if (isAdmin) navigate('/admin');
      else if (isCreator) navigate('/dashboard');
      else {
        const ref = searchParams.get('ref') || localStorage.getItem(REFERRAL_STORAGE_KEY);
        if (ref && isCreatorSignup) navigate('/become-creator');
        else navigate('/account');
      }
    }
  }, [user, isAdmin, isCreator, authLoading, navigate, searchParams, isCreatorSignup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) { toast.error('Passwords do not match'); return; }
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }

    setIsLoading(true);
    const { error } = await signUp(email, password, fullName);
    if (error) { toast.error(error.message); setIsLoading(false); return; }
    // Optional welcome email — gated by admin platform setting.
    try {
      const { data: row } = await supabase
        .from('platform_settings')
        .select('value')
        .eq('key', 'signup_welcome_email_enabled')
        .maybeSingle();
      const enabled = row?.value === true || row?.value === 'true';
      if (enabled) {
        await supabase.functions.invoke('send-notification', {
          body: {
            event_type: 'welcome_signup',
            channel: 'email',
            recipient: email,
            data: { recipient_name: fullName || email.split('@')[0], action_url: `${window.location.origin}/login` },
          },
        });
      }
    } catch (e) { console.warn('welcome email skipped', e); }
    toast.success('Account created! Check your email to verify, then sign in.');
    setIsLoading(false);
  };

  const hasReferral = searchParams.get('ref') || localStorage.getItem(REFERRAL_STORAGE_KEY);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
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
            {hasReferral ? "You've been invited to join TribeYangu as a creator!" : 'Join TribeYangu and support your favorite creators'}
          </p>
          {hasReferral && (
            <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Partner Referral
            </div>
          )}
        </div>

        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="fullName" type="text" placeholder="John Doe" value={fullName} onChange={(e) => setFullName(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number (optional)</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="phone" type="tel" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} className="pl-10" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="password" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="pl-10 pr-10" required />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="pl-10" required />
              </div>
            </div>

            <Button type="submit" className="w-full" variant="hero" disabled={isLoading}>
              {isLoading ? (<><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>) : hasReferral ? (<><Sparkles className="w-4 h-4 mr-2" />Create Creator Account</>) : 'Create Account'}
            </Button>
          </form>
          {socialFlags?.google && (
            <>
              <div className="my-6 flex items-center gap-3">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <Button type="button" variant="outline" className="w-full" onClick={signInWithGoogle} disabled={googleLoading}>
                {googleLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.7 3.4 14.6 2.4 12 2.4 6.7 2.4 2.4 6.7 2.4 12s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.2-.2-1.8H12z"/>
                  </svg>
                )}
                Continue with Google
              </Button>
            </>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </div>
        </div>

        <div className="text-center mt-6">
          <Link to="/" className="text-muted-foreground hover:text-foreground text-sm">← Back to home</Link>
        </div>
      </div>
    </div>
  );
};

export default Signup;
