import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, AtSign, Sparkles, Palette, Phone, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateCreator, useCreatorCategories } from '@/hooks/useCreator';
import { toast } from 'sonner';
import Header from '@/components/Header';

const BecomeCreator = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: categories, isLoading: loadingCategories } = useCreatorCategories();
  const createCreator = useCreateCreator();

  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    tribe_name: '',
    bio: '',
    category_id: '',
    mpesa_phone: ''
  });

  const [isChecking, setIsChecking] = useState(false);

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

    try {
      await createCreator.mutateAsync({
        username: formData.username,
        display_name: formData.display_name,
        tribe_name: formData.tribe_name || null,
        bio: formData.bio || null,
        category_id: formData.category_id || null,
        mpesa_phone: formData.mpesa_phone || null
      });

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
                  Your page will be: tribeyangu.com/@{formData.username || 'yourname'}
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
