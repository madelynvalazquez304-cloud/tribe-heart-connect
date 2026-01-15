import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Palette } from 'lucide-react';
import { toast } from 'sonner';

const CreatorCustomize = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [formData, setFormData] = useState({
    display_name: creator?.display_name || '',
    bio: creator?.bio || '',
    tribe_name: creator?.tribe_name || '',
    theme_primary: creator?.theme_primary || '#E07B4C',
    theme_secondary: creator?.theme_secondary || '#8B9A6B',
    theme_accent: creator?.theme_accent || '#D4A853'
  });

  React.useEffect(() => {
    if (creator) {
      setFormData({
        display_name: creator.display_name,
        bio: creator.bio || '',
        tribe_name: creator.tribe_name || '',
        theme_primary: creator.theme_primary || '#E07B4C',
        theme_secondary: creator.theme_secondary || '#8B9A6B',
        theme_accent: creator.theme_accent || '#D4A853'
      });
    }
  }, [creator]);

  const updateCreator = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!creator) throw new Error('No creator');
      const { error } = await supabase.from('creators').update(data).eq('id', creator.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-creator'] });
      toast.success('Profile updated!');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCreator.mutate(formData);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Customize Your Page</h1>
          <p className="text-muted-foreground mt-1">Personalize how your page looks to fans</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your public profile details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="display_name">Display Name</Label>
                <Input
                  id="display_name"
                  value={formData.display_name}
                  onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tribe_name">Tribe Name</Label>
                <Input
                  id="tribe_name"
                  value={formData.tribe_name}
                  onChange={(e) => setFormData({ ...formData, tribe_name: e.target.value })}
                  placeholder="e.g., The Music Collective"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bio">Bio</Label>
                <Textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={4}
                  placeholder="Tell your fans about yourself..."
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Theme Colors
              </CardTitle>
              <CardDescription>Customize your page colors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="theme_primary">Primary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="theme_primary"
                      type="color"
                      value={formData.theme_primary}
                      onChange={(e) => setFormData({ ...formData, theme_primary: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.theme_primary}
                      onChange={(e) => setFormData({ ...formData, theme_primary: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme_secondary">Secondary Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="theme_secondary"
                      type="color"
                      value={formData.theme_secondary}
                      onChange={(e) => setFormData({ ...formData, theme_secondary: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.theme_secondary}
                      onChange={(e) => setFormData({ ...formData, theme_secondary: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="theme_accent">Accent Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="theme_accent"
                      type="color"
                      value={formData.theme_accent}
                      onChange={(e) => setFormData({ ...formData, theme_accent: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.theme_accent}
                      onChange={(e) => setFormData({ ...formData, theme_accent: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={updateCreator.isPending} className="gap-2">
              {updateCreator.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
};

export default CreatorCustomize;
