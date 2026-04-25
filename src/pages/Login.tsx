import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Heart, Mail, Lock, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // 2FA challenge state
  const [twoFa, setTwoFa] = useState<{ required: boolean; userId: string; email: string; sending: boolean; verifying: boolean; code: string } | null>(null);
  const [resendIn, setResendIn] = useState(0); // seconds until 2FA resend allowed
  const [forgotIn, setForgotIn] = useState(0); // seconds until next forgot-password send
  const RESEND_COOLDOWN = 45;
  const FORGOT_COOLDOWN = 60;
  const { signIn, user, isAdmin, isCreator, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in (and 2FA not pending)
  useEffect(() => {
    if (!authLoading && user && !twoFa?.required) {
      if (isAdmin) {
        navigate('/admin');
      } else if (isCreator) {
        navigate('/dashboard');
      } else {
        navigate('/account');
      }
    }
  }, [user, isAdmin, isCreator, authLoading, navigate, twoFa]);

  // Cooldown ticker for both resend buttons.
  useEffect(() => {
    if (resendIn <= 0 && forgotIn <= 0) return;
    const t = setInterval(() => {
      setResendIn((s) => (s > 0 ? s - 1 : 0));
      setForgotIn((s) => (s > 0 ? s - 1 : 0));
    }, 1000);
    return () => clearInterval(t);
  }, [resendIn, forgotIn]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);
    
    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Check whether this account has email 2FA enabled — if so, sign back out
    // and require a one-time code before proceeding.
    try {
      const { data: { user: signedIn } } = await supabase.auth.getUser();
      if (signedIn) {
        const { data: tfa } = await supabase
          .from('user_2fa_settings')
          .select('is_enabled, method, email')
          .eq('user_id', signedIn.id)
          .maybeSingle();
        if (tfa?.is_enabled && tfa?.method === 'email') {
          const target = tfa.email || signedIn.email!;
          setTwoFa({ required: true, userId: signedIn.id, email: target, sending: true, verifying: false, code: '' });
          // Sign out so the session isn't usable until code is verified
          await supabase.auth.signOut();
          await supabase.functions.invoke('send-2fa-code', {
            body: { user_id: signedIn.id, email: target },
          });
          setTwoFa((s) => s ? { ...s, sending: false } : s);
          setResendIn(RESEND_COOLDOWN);
          toast.success(`Code sent to ${target}. Expires in 10 minutes.`);
          setIsLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn('2FA pre-check failed', e);
    }

    toast.success('Welcome back!');
    // Navigation will happen via useEffect when auth state updates
  };

  const verify2fa = async () => {
    if (!twoFa) return;
    setTwoFa({ ...twoFa, verifying: true });
    try {
      const { data, error } = await supabase.functions.invoke('verify-2fa-code', {
        body: { user_id: twoFa.userId, code: twoFa.code },
      });
      if (error) throw error;
      if (!(data as any)?.ok) throw new Error((data as any)?.error || 'Invalid code');
      // Re-authenticate now that the code is verified
      const { error: signErr } = await signIn(email, password);
      if (signErr) throw signErr;
      toast.success('Verified! Welcome back.');
      setTwoFa(null);
    } catch (e: any) {
      toast.error(e.message || 'Verification failed');
      setTwoFa((s) => s ? { ...s, verifying: false } : s);
    }
  };

  const resend2fa = async () => {
    if (!twoFa || resendIn > 0) return;
    setTwoFa({ ...twoFa, sending: true });
    await supabase.functions.invoke('send-2fa-code', { body: { user_id: twoFa.userId, email: twoFa.email } });
    setTwoFa((s) => s ? { ...s, sending: false } : s);
    setResendIn(RESEND_COOLDOWN);
    toast.success('New code sent. Expires in 10 minutes.');
  };

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
          <h1 className="text-2xl font-bold mt-6 text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to continue to your account</p>
        </div>

        {/* Form */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
          {twoFa?.required ? (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <ShieldCheck className="w-7 h-7 text-primary" />
                </div>
                <h2 className="text-xl font-bold">Verify it's you</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  We emailed a 6-digit code to <strong>{twoFa.email}</strong>.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Verification code</Label>
                <Input
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFa.code}
                  onChange={(e) => setTwoFa({ ...twoFa, code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  placeholder="123456"
                  className="text-center tracking-[10px] text-2xl font-bold"
                  autoFocus
                />
              </div>
              <Button onClick={verify2fa} disabled={twoFa.verifying || twoFa.code.length !== 6} className="w-full" variant="hero">
                {twoFa.verifying ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying…</> : 'Verify & sign in'}
              </Button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={resend2fa}
                  disabled={twoFa.sending || resendIn > 0}
                  className="text-primary hover:underline disabled:opacity-50 disabled:no-underline"
                >
                  {twoFa.sending ? 'Sending…' : resendIn > 0 ? `Resend in ${resendIn}s` : 'Resend code'}
                </button>
                <button type="button" onClick={() => setTwoFa(null)} className="text-muted-foreground hover:text-foreground">
                  Use another account
                </button>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Code expires in 10 minutes. Check your spam folder if it doesn't arrive.
              </p>
            </div>
          ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
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

            <div className="flex justify-end">
              <button
                type="button"
                onClick={async () => {
                  if (!email) {
                    toast.error('Enter your email first');
                    return;
                  }
                  if (forgotIn > 0) {
                    toast.message(`Please wait ${forgotIn}s before requesting another link.`);
                    return;
                  }
                  const { data, error } = await supabase.functions.invoke('send-password-reset', {
                    body: { email, origin: window.location.origin },
                  });
                  if (error || (data as any)?.error) {
                    toast.error((error as any)?.message || (data as any)?.error || 'Could not send reset email');
                  } else {
                    setForgotIn(FORGOT_COOLDOWN);
                    toast.success('If an account exists, a reset link is on its way. The link expires in 30 minutes.');
                  }
                }}
                disabled={forgotIn > 0}
                className="text-sm text-primary hover:underline disabled:opacity-50 disabled:no-underline"
              >
                {forgotIn > 0 ? `Resend in ${forgotIn}s` : 'Forgot password?'}
              </button>
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
                  Signing in...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                Sign up
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

export default Login;
