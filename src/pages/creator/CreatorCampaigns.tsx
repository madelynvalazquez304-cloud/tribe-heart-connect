import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Loader2, Target, Plus, Edit, Trash2, Play, Pause, Upload, Camera } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CreatorCampaigns = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    goal_amount: '',
    banner_url: '',
    end_date: ''
  });

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['creator-campaigns', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const createCampaign = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('campaigns').insert({
        ...data,
        creator_id: creator?.id,
        status: 'draft'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
      toast.success('Campaign created! Set it to Active to start receiving contributions.');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateCampaign = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('campaigns').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
      toast.success('Campaign updated!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteCampaign = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('campaigns').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
      toast.success('Campaign deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const toggleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === 'active' ? 'draft' : 'active';
      const updates: any = { status: newStatus };
      if (newStatus === 'active') {
        updates.start_date = new Date().toISOString();
      }
      const { error } = await supabase.from('campaigns').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-campaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setForm({ title: '', description: '', goal_amount: '', banner_url: '', end_date: '' });
    setEditingCampaign(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (campaign: any) => {
    setForm({
      title: campaign.title,
      description: campaign.description || '',
      goal_amount: campaign.goal_amount.toString(),
      banner_url: campaign.banner_url || '',
      end_date: campaign.end_date ? campaign.end_date.split('T')[0] : ''
    });
    setEditingCampaign(campaign);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      description: form.description,
      goal_amount: parseFloat(form.goal_amount),
      banner_url: form.banner_url || null,
      end_date: form.end_date ? new Date(form.end_date).toISOString() : null
    };

    if (editingCampaign) {
      updateCampaign.mutate({ id: editingCampaign.id, ...data });
    } else {
      createCampaign.mutate(data);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${creator.id}/campaigns/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, banner_url: publicUrl }));
      toast.success('Banner uploaded!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getProgressPercent = (current: number, goal: number) => {
    return Math.min((current / goal) * 100, 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline'; className: string }> = {
      draft: { variant: 'secondary', className: '' },
      active: { variant: 'default', className: 'bg-green-600' },
      completed: { variant: 'default', className: 'bg-blue-600' },
      cancelled: { variant: 'outline', className: 'text-muted-foreground' }
    };
    const v = variants[status] || variants.draft;
    return <Badge variant={v.variant} className={v.className}>{status}</Badge>;
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Campaigns</h1>
            <p className="text-muted-foreground mt-1">Create crowdfunding campaigns for your projects</p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={() => resetForm()}>
                <Plus className="w-4 h-4" />
                Create Campaign
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create New Campaign'}</DialogTitle>
                <DialogDescription>
                  Set a funding goal and let your supporters contribute to your projects.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label>Campaign Title</Label>
                  <Input
                    placeholder="e.g., New Camera Equipment"
                    value={form.title}
                    onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Tell your supporters what you're raising funds for..."
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Goal Amount (KSh)</Label>
                    <Input
                      type="number"
                      placeholder="50000"
                      value={form.goal_amount}
                      onChange={(e) => setForm(prev => ({ ...prev, goal_amount: e.target.value }))}
                      required
                      min="100"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date (Optional)</Label>
                    <Input
                      type="date"
                      value={form.end_date}
                      onChange={(e) => setForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Banner Image</Label>
                  <div className="flex items-center gap-4">
                    {form.banner_url ? (
                      <img src={form.banner_url} alt="Banner" className="w-24 h-16 object-cover rounded" />
                    ) : (
                      <div className="w-24 h-16 bg-secondary rounded flex items-center justify-center">
                        <Camera className="w-6 h-6 text-muted-foreground" />
                      </div>
                    )}
                    <label className="cursor-pointer">
                      <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/50 transition-colors">
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        <span className="text-sm">{uploading ? 'Uploading...' : 'Upload'}</span>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBannerUpload}
                        disabled={uploading}
                      />
                    </label>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                  <Button type="submit" disabled={createCampaign.isPending || updateCampaign.isPending}>
                    {(createCampaign.isPending || updateCampaign.isPending) && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    {editingCampaign ? 'Update' : 'Create'}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : campaigns?.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground">
                <Target className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Campaigns Yet</h3>
                <p className="text-sm mb-4">Create your first crowdfunding campaign to raise funds from your supporters</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {campaigns?.map((campaign) => (
              <Card key={campaign.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  {/* Banner */}
                  <div className="md:w-64 h-40 md:h-auto bg-secondary flex-shrink-0">
                    {campaign.banner_url ? (
                      <img 
                        src={campaign.banner_url} 
                        alt={campaign.title} 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Target className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                    )}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{campaign.title}</h3>
                          {getStatusBadge(campaign.status)}
                        </div>
                        {campaign.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => toggleStatus.mutate({ id: campaign.id, status: campaign.status })}
                        >
                          {campaign.status === 'active' ? (
                            <Pause className="w-4 h-4" />
                          ) : (
                            <Play className="w-4 h-4" />
                          )}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleEdit(campaign)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="text-destructive"
                          onClick={() => deleteCampaign.mutate(campaign.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {/* Progress */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">
                          KSh {Number(campaign.current_amount || 0).toLocaleString()} raised
                        </span>
                        <span className="text-muted-foreground">
                          Goal: KSh {Number(campaign.goal_amount).toLocaleString()}
                        </span>
                      </div>
                      <Progress 
                        value={getProgressPercent(campaign.current_amount || 0, campaign.goal_amount)} 
                        className="h-3"
                      />
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>{campaign.supporter_count || 0} supporters</span>
                        <span>
                          {Math.round(getProgressPercent(campaign.current_amount || 0, campaign.goal_amount))}% funded
                        </span>
                        {campaign.end_date && (
                          <span>Ends {format(new Date(campaign.end_date), 'MMM d, yyyy')}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default CreatorCampaigns;
