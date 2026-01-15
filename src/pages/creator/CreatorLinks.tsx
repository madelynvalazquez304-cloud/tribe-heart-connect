import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit2, Trash2, Loader2, Link as LinkIcon, GripVertical, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

const CreatorLinks = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [isOpen, setIsOpen] = useState(false);
  const [editingLink, setEditingLink] = useState<any>(null);
  const [formData, setFormData] = useState({ title: '', url: '', icon: '', is_active: true });

  const { data: links, isLoading } = useQuery({
    queryKey: ['creator-links', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('creator_links')
        .select('*')
        .eq('creator_id', creator.id)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const createLink = useMutation({
    mutationFn: async (data: typeof formData) => {
      if (!creator) throw new Error('No creator');
      const { error } = await supabase.from('creator_links').insert({
        creator_id: creator.id,
        title: data.title,
        url: data.url,
        icon: data.icon || null,
        is_active: data.is_active,
        display_order: (links?.length || 0) + 1
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-links'] });
      toast.success('Link added');
      resetForm();
    }
  });

  const updateLink = useMutation({
    mutationFn: async ({ id, ...data }: typeof formData & { id: string }) => {
      const { error } = await supabase.from('creator_links').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-links'] });
      toast.success('Link updated');
      resetForm();
    }
  });

  const deleteLink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('creator_links').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-links'] });
      toast.success('Link deleted');
    }
  });

  const resetForm = () => {
    setIsOpen(false);
    setEditingLink(null);
    setFormData({ title: '', url: '', icon: '', is_active: true });
  };

  const handleEdit = (link: any) => {
    setEditingLink(link);
    setFormData({ title: link.title, url: link.url, icon: link.icon || '', is_active: link.is_active });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.title || !formData.url) {
      toast.error('Title and URL are required');
      return;
    }
    if (editingLink) {
      updateLink.mutate({ ...formData, id: editingLink.id });
    } else {
      createLink.mutate(formData);
    }
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Social Links</h1>
            <p className="text-muted-foreground mt-1">Add links to your social profiles and websites</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => { if (!open) resetForm(); else setIsOpen(true); }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Link
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingLink ? 'Edit Link' : 'Add Link'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Title *</Label>
                  <Input value={formData.title} onChange={(e) => setFormData({ ...formData, title: e.target.value })} placeholder="e.g., Instagram" />
                </div>
                <div className="space-y-2">
                  <Label>URL *</Label>
                  <Input value={formData.url} onChange={(e) => setFormData({ ...formData, url: e.target.value })} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Icon (emoji)</Label>
                  <Input value={formData.icon} onChange={(e) => setFormData({ ...formData, icon: e.target.value })} placeholder="📸" />
                </div>
                <div className="flex items-center justify-between">
                  <Label>Active</Label>
                  <Switch checked={formData.is_active} onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createLink.isPending || updateLink.isPending}>
                  {(createLink.isPending || updateLink.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {editingLink ? 'Save' : 'Add'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : links?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <LinkIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No links yet</p>
                <p className="text-sm">Add your social media and website links</p>
              </div>
            ) : (
              <div className="space-y-3">
                {links?.map((link) => (
                  <div key={link.id} className={`flex items-center gap-4 p-4 rounded-lg border ${link.is_active ? 'bg-secondary/30' : 'bg-muted/50 opacity-60'}`}>
                    <GripVertical className="w-4 h-4 text-muted-foreground cursor-move" />
                    <span className="text-xl">{link.icon || '🔗'}</span>
                    <div className="flex-1">
                      <p className="font-medium">{link.title}</p>
                      <p className="text-sm text-muted-foreground truncate max-w-[300px]">{link.url}</p>
                    </div>
                    <span className="text-sm text-muted-foreground">{link.clicks || 0} clicks</span>
                    <div className="flex items-center gap-2">
                      <a href={link.url} target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon"><ExternalLink className="w-4 h-4" /></Button>
                      </a>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(link)}><Edit2 className="w-4 h-4" /></Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => { if (confirm('Delete this link?')) deleteLink.mutate(link.id); }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreatorLinks;
