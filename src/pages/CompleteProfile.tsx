import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, User, Phone, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const CompleteProfile: React.FC = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/login'); return; }
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, phone')
        .eq('user_id', user.id)
        .maybeSingle();
      setFullName(data?.full_name || (user.user_metadata as any)?.full_name || (user.user_metadata as any)?.name || '');
      setPhone(data?.phone || '');
      // If already complete, skip straight to account
      if (data?.full_name && data?.phone) navigate('/account', { replace: true });
      setBootstrapping(false);
    })();
  }, [user, authLoading, navigate]);

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!fullName.trim()) return toast.error('Please enter your name');
    if (!/^\+?\d{9,15}$/.test(phone.replace(/\s/g, ''))) return toast.error('Enter a valid phone number');
    setLoading(true);
    const { error } = await supabase
      .from('profiles')
      .upsert({ user_id: user.id, email: user.email, full_name: fullName.trim(), phone: phone.trim() }, { onConflict: 'user_id' });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success('Profile completed!');
    navigate('/account', { replace: true });
  };

  if (authLoading || bootstrapping) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/30 to-background flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-card rounded-2xl shadow-xl border border-border p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 mx-auto rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-3">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold">One last step</h1>
          <p className="text-muted-foreground text-sm mt-2">Tell us a bit more so supporters can reach you and we can process payouts.</p>
        </div>
        <form onSubmit={onSave} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="fullName" className="pl-10" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Jane Doe" required />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input id="phone" type="tel" className="pl-10" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="0712345678" required />
            </div>
            <p className="text-xs text-muted-foreground">Used privately for payouts and account recovery.</p>
          </div>
          <Button type="submit" variant="hero" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</> : 'Continue'}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default CompleteProfile;