import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Save, Palette, Upload, Camera, X, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const CreatorCustomize = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    display_name: creator?.display_name || '',
    bio: creator?.bio || '',
    tribe_name: creator?.tribe_name || '',
    theme_primary: creator?.theme_primary || '#E07B4C',
    theme_secondary: creator?.theme_secondary || '#8B9A6B',
    theme_accent: creator?.theme_accent || '#D4A853',
    avatar_url: creator?.avatar_url || '',
    banner_url: creator?.banner_url || ''
  });

  React.useEffect(() => {
    if (creator) {
      setFormData({
        display_name: creator.display_name,
        bio: creator.bio || '',
        tribe_name: creator.tribe_name || '',
        theme_primary: creator.theme_primary || '#E07B4C',
        theme_secondary: creator.theme_secondary || '#8B9A6B',
        theme_accent: creator.theme_accent || '#D4A853',
        avatar_url: creator.avatar_url || '',
        banner_url: creator.banner_url || ''
      });
    }
  }, [creator]);

  const uploadImage = async (file: File, type: 'avatar' | 'banner') => {
    if (!creator) return null;
    
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${creator.id}/${type}-${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be less than 5MB');
      return;
    }

    const url = await uploadImage(file, 'avatar');
    if (url) {
      setFormData({ ...formData, avatar_url: url });
      toast.success('Avatar uploaded!');
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Banner must be less than 10MB');
      return;
    }

    const url = await uploadImage(file, 'banner');
    if (url) {
      setFormData({ ...formData, banner_url: url });
      toast.success('Banner uploaded!');
    }
  };

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
          {/* Avatar & Banner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="w-5 h-5" />
                Profile Images
              </CardTitle>
              <CardDescription>Upload your avatar and banner</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Banner Preview */}
              <div className="space-y-2">
                <Label>Banner Image</Label>
                <div 
                  className="relative w-full h-32 md:h-48 rounded-xl overflow-hidden bg-gradient-to-r from-primary/20 to-primary/5 border-2 border-dashed border-border cursor-pointer group"
                  onClick={() => bannerInputRef.current?.click()}
                >
                  {formData.banner_url ? (
                    <>
                      <img 
                        src={formData.banner_url} 
                        alt="Banner" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                      <button
                        type="button"
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full hover:bg-black/70"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormData({ ...formData, banner_url: '' });
                        }}
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <ImageIcon className="w-12 h-12 mb-2 opacity-50" />
                      <p className="text-sm">Click to upload banner (1200x300 recommended)</p>
                    </div>
                  )}
                </div>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
              </div>

              {/* Avatar */}
              <div className="space-y-2">
                <Label>Profile Avatar</Label>
                <div className="flex items-center gap-4">
                  <div 
                    className="relative cursor-pointer group"
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Avatar className="w-24 h-24 border-4 border-background shadow-lg">
                      <AvatarImage src={formData.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                        {formData.display_name?.charAt(0) || 'C'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                      disabled={uploading}
                    >
                      {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                      Upload Avatar
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG. Max 5MB</p>
                  </div>
                </div>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden"
                />
              </div>
            </CardContent>
          </Card>

          {/* Profile Information */}
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
                <p className="text-xs text-muted-foreground">What do you call your fans/supporters?</p>
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

          {/* Theme Colors */}
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
                      className="w-16 h-10 p-1 cursor-pointer"
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
                      className="w-16 h-10 p-1 cursor-pointer"
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
                      className="w-16 h-10 p-1 cursor-pointer"
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
            <Button type="submit" disabled={updateCreator.isPending || uploading} className="gap-2">
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
