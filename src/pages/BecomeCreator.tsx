import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Heart, AtSign, Sparkles, Palette, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCreator, useCreatorCategories } from '@/hooks/useCreator';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import Header from '@/components/Header';
import { getCachedReferralCode } from '@/hooks/useReferralCache';

// Also check URL for ref param
const REFERRAL_STORAGE_KEY = 'tribeyangu_referral_code';
const REFERRAL_EXPIRY_KEY = 'tribeyangu_referral_expiry';
const REFERRAL_TTL_DAYS = 30;

const cacheReferral = (code: string) => {
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + REFERRAL_TTL_DAYS);
  localStorage.setItem(REFERRAL_STORAGE_KEY, code);
  localStorage.setItem(REFERRAL_EXPIRY_KEY, expiryDate.toISOString());
};

const BecomeCreator = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { data: categories, isLoading: loadingCategories } = useCreatorCategories();
  const createCreator = useCreateCreator();
  const [referrerName, setReferrerName] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    tribe_name: '',
    bio: '',
    category_id: '',
    mpesa_phone: ''
  });

  // Cache referral code from URL if present
  useEffect(() => {
    const ref = searchParams.get('ref');
    if (ref) {
      cacheReferral(ref);
    }
  }, [searchParams]);

  // Check for cached referral and get referrer info
  useEffect(() => {
    const fetchReferrer = async () => {
      const referralCode = searchParams.get('ref') || getCachedReferralCode();
      if (referralCode) {
        const { data } = await supabase
          .from('creators')
          .select('display_name')
          .eq('referral_code', referralCode)
          .single();
        
        if (data) {
          setReferrerName(data.display_name);
        }
      }
    };
    fetchReferrer();
  }, [searchParams]);

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.username || !formData.display_name) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate username format
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(formData.username)) {
      toast.error('Username can only contain letters, numbers, and underscores');
      return;
    }

    // Get referral code
    const referralCode = searchParams.get('ref') || getCachedReferralCode();
    let referrerId: string | null = null;

    if (referralCode) {
      const { data: referrer } = await supabase
        .from('creators')
        .select('id')
        .eq('referral_code', referralCode)
        .single();
      
      if (referrer) {
        referrerId = referrer.id;
      }
    }

    try {
      await createCreator.mutateAsync({
        username: formData.username,
        display_name: formData.display_name,
        tribe_name: formData.tribe_name || null,
        bio: formData.bio || null,
        category_id: formData.category_id || null,
        mpesa_phone: formData.mpesa_phone || null,
        referred_by: referrerId
      });

      // Clear cached referral after successful use
      localStorage.removeItem(REFERRAL_STORAGE_KEY);
      localStorage.removeItem(REFERRAL_EXPIRY_KEY);

      toast.success('Creator profile created! Pending admin approval.');
      navigate('/dashboard');
    } catch (error: any) {
      if (error.message?.includes('duplicate')) {
        toast.error('This username is already taken');
      } else {
        toast.error(error.message || 'Failed to create creator profile');
      }
    }
  };

  const referralCode = searchParams.get('ref') || getCachedReferralCode();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Become a Creator</h1>
            <p className="text-muted-foreground">Set up your profile and start receiving support from your tribe</p>
            
            {referrerName && (
              <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary">
                <Sparkles className="w-4 h-4" />
                Referred by <span className="font-semibold">{referrerName}</span>
              </div>
            )}
          </div>

          {/* Form */}
          <div className="bg-card rounded-2xl shadow-xl border border-border p-8">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <Label htmlFor="username" className="flex items-center gap-2">
                  <AtSign className="w-4 h-4" />
                  Username <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="username"
                  placeholder="yourname"
                  value={formData.username}
                  onChange={(e) => handleChange('username', e.target.value.toLowerCase())}
                  className="lowercase"
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Your page will be: {window.location.origin}/@{formData.username || 'yourname'}
                </p>
              </div>

              {/* Display Name */}
              <div className="space-y-2">
                <Label htmlFor="display_name">
                  Display Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="display_name"
                  placeholder="Your Name"
                  value={formData.display_name}
                  onChange={(e) => handleChange('display_name', e.target.value)}
                  required
                />
              </div>

              {/* Tribe Name */}
              <div className="space-y-2">
                <Label htmlFor="tribe_name" className="flex items-center gap-2">
                  <Heart className="w-4 h-4" />
                  Tribe Name
                </Label>
                <Input
                  id="tribe_name"
                  placeholder="e.g., The Warriors, Team Awesome"
                  value={formData.tribe_name}
                  onChange={(e) => handleChange('tribe_name', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">What do you call your supporters?</p>
              </div>

              {/* Category */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Category
                </Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleChange('category_id', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select your category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.icon} {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  placeholder="Tell your story... What do you create? Why should people support you?"
                  value={formData.bio}
                  onChange={(e) => handleChange('bio', e.target.value)}
                  rows={4}
                />
              </div>

              {/* M-PESA Phone */}
              <div className="space-y-2">
                <Label htmlFor="mpesa_phone" className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  M-PESA Phone Number
                </Label>
                <Input
                  id="mpesa_phone"
                  placeholder="254712345678"
                  value={formData.mpesa_phone}
                  onChange={(e) => handleChange('mpesa_phone', e.target.value)}
                />
                <p className="text-xs text-muted-foreground">For receiving payouts</p>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                className="w-full"
                variant="hero"
                disabled={createCreator.isPending}
              >
                {createCreator.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating Profile...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Create Creator Profile
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating a profile, you agree to our Terms of Service and Privacy Policy.
                Your profile will be reviewed before going live.
              </p>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default BecomeCreator;
