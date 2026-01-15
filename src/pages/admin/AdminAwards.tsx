import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Edit2, Trash2, Loader2, Trophy, Users, Calendar, DollarSign, UserPlus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminAwards = () => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [isNomineeOpen, setIsNomineeOpen] = useState(false);
  const [selectedAward, setSelectedAward] = useState<any>(null);
  const [editingAward, setEditingAward] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '🏆',
    vote_fee: 10,
    voting_starts_at: '',
    voting_ends_at: '',
    is_active: true
  });
  const [selectedCreator, setSelectedCreator] = useState('');

  const { data: awards, isLoading } = useQuery({
    queryKey: ['admin-awards'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('award_categories')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const { data: nominees } = useQuery({
    queryKey: ['award-nominees', selectedAward?.id],
    queryFn: async () => {
      if (!selectedAward) return [];
      
      const { data, error } = await supabase
        .from('award_nominees')
        .select(`
          *,
          creator:creators(id, display_name, username, avatar_url, total_votes)
        `)
        .eq('award_id', selectedAward.id)
        .order('total_votes', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!selectedAward
  });

  const { data: creators } = useQuery({
    queryKey: ['approved-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, display_name, username')
        .eq('status', 'approved')
        .order('display_name');
      
      if (error) throw error;
      return data;
    }
  });

  const createAward = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('award_categories')
        .insert({
          ...data,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          voting_starts_at: data.voting_starts_at || null,
          voting_ends_at: data.voting_ends_at || null
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-awards'] });
      toast.success('Award category created');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateAward = useMutation({
    mutationFn: async ({ id, ...data }: typeof formData & { id: string }) => {
      const { error } = await supabase
        .from('award_categories')
        .update({
          ...data,
          voting_starts_at: data.voting_starts_at || null,
          voting_ends_at: data.voting_ends_at || null
        })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-awards'] });
      toast.success('Award category updated');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteAward = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('award_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-awards'] });
      toast.success('Award category deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const addNominee = useMutation({
    mutationFn: async ({ awardId, creatorId }: { awardId: string; creatorId: string }) => {
      const { error } = await supabase
        .from('award_nominees')
        .insert({
          award_id: awardId,
          creator_id: creatorId
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['award-nominees'] });
      toast.success('Nominee added');
      setIsNomineeOpen(false);
      setSelectedCreator('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const removeNominee = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('award_nominees')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['award-nominees'] });
      toast.success('Nominee removed');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setIsOpen(false);
    setEditingAward(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      icon: '🏆',
      vote_fee: 10,
      voting_starts_at: '',
      voting_ends_at: '',
      is_active: true
    });
  };

  const handleEdit = (award: any) => {
    setEditingAward(award);
    setFormData({
      name: award.name,
      slug: award.slug,
      description: award.description || '',
      icon: award.icon || '🏆',
      vote_fee: award.vote_fee || 10,
      voting_starts_at: award.voting_starts_at ? award.voting_starts_at.split('T')[0] : '',
      voting_ends_at: award.voting_ends_at ? award.voting_ends_at.split('T')[0] : '',
      is_active: award.is_active
    });
    setIsOpen(true);
  };

  const handleSubmit = () => {
    if (!formData.name) {
      toast.error('Name is required');
      return;
    }

    if (editingAward) {
      updateAward.mutate({ ...formData, id: editingAward.id });
    } else {
      createAward.mutate(formData);
    }
  };

  const getAwardStatus = (award: any) => {
    const now = new Date();
    const start = award.voting_starts_at ? new Date(award.voting_starts_at) : null;
    const end = award.voting_ends_at ? new Date(award.voting_ends_at) : null;

    if (!award.is_active) return { label: 'Inactive', variant: 'secondary' as const };
    if (!start || !end) return { label: 'Draft', variant: 'outline' as const };
    if (now < start) return { label: 'Upcoming', variant: 'outline' as const };
    if (now > end) return { label: 'Ended', variant: 'secondary' as const };
    return { label: 'Live', variant: 'default' as const };
  };

  const availableCreators = creators?.filter(
    c => !nominees?.some(n => n.creator_id === c.id)
  );

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Awards & Voting</h1>
            <p className="text-muted-foreground mt-1">Create and manage award categories for fan voting</p>
          </div>
          <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) resetForm();
            else setIsOpen(true);
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Create Award
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingAward ? 'Edit Award' : 'Create Award Category'}</DialogTitle>
                <DialogDescription>
                  Set up voting for fans to support their favorite creators
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div className="grid grid-cols-[auto,1fr] gap-4">
                  <div className="space-y-2">
                    <Label>Icon</Label>
                    <Input
                      value={formData.icon}
                      onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                      className="w-16 text-center text-2xl"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g., Best Musician 2024"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Describe this award category"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="vote_fee">Vote Fee (KSh per vote)</Label>
                  <Input
                    id="vote_fee"
                    type="number"
                    value={formData.vote_fee}
                    onChange={(e) => setFormData({ ...formData, vote_fee: parseInt(e.target.value) || 10 })}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start">Voting Starts</Label>
                    <Input
                      id="start"
                      type="date"
                      value={formData.voting_starts_at}
                      onChange={(e) => setFormData({ ...formData, voting_starts_at: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="end">Voting Ends</Label>
                    <Input
                      id="end"
                      type="date"
                      value={formData.voting_ends_at}
                      onChange={(e) => setFormData({ ...formData, voting_ends_at: e.target.value })}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <Label htmlFor="active">Active</Label>
                  <Switch
                    id="active"
                    checked={formData.is_active}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={resetForm}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createAward.isPending || updateAward.isPending}>
                  {(createAward.isPending || updateAward.isPending) && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {editingAward ? 'Save Changes' : 'Create'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : awards?.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <Trophy className="w-16 h-16 mx-auto mb-4 text-muted-foreground/30" />
              <h3 className="text-lg font-semibold mb-2">No Awards Yet</h3>
              <p className="text-muted-foreground mb-4">Create your first award category to start fan voting</p>
              <Button onClick={() => setIsOpen(true)} className="gap-2">
                <Plus className="w-4 h-4" />
                Create Award
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {awards?.map((award) => {
              const status = getAwardStatus(award);
              return (
                <Card key={award.id} className="overflow-hidden">
                  <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-primary/5 to-transparent">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-3xl">
                        {award.icon || '🏆'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle>{award.name}</CardTitle>
                          <Badge variant={status.variant}>{status.label}</Badge>
                        </div>
                        <CardDescription>{award.description || 'No description'}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedAward(selectedAward?.id === award.id ? null : award)}
                      >
                        <Users className="w-4 h-4 mr-2" />
                        Nominees
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(award)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive"
                        onClick={() => {
                          if (confirm('Delete this award category?')) {
                            deleteAward.mutate(award.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        <span>KSh {award.vote_fee}/vote</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {award.voting_starts_at 
                            ? format(new Date(award.voting_starts_at), 'MMM d, yyyy')
                            : 'Not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span>
                          {award.voting_ends_at 
                            ? format(new Date(award.voting_ends_at), 'MMM d, yyyy')
                            : 'Not set'
                          }
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span>Nominees</span>
                      </div>
                    </div>
                  </CardContent>

                  {/* Nominees Section */}
                  {selectedAward?.id === award.id && (
                    <div className="border-t border-border">
                      <div className="p-4 bg-secondary/30">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold">Nominees</h4>
                          <Dialog open={isNomineeOpen} onOpenChange={setIsNomineeOpen}>
                            <DialogTrigger asChild>
                              <Button size="sm" className="gap-2">
                                <UserPlus className="w-4 h-4" />
                                Add Nominee
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Add Nominee</DialogTitle>
                                <DialogDescription>
                                  Select a creator to nominate for {award.name}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <Select value={selectedCreator} onValueChange={setSelectedCreator}>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a creator" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {availableCreators?.map((creator) => (
                                      <SelectItem key={creator.id} value={creator.id}>
                                        {creator.display_name} (@{creator.username})
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <DialogFooter>
                                <Button variant="outline" onClick={() => setIsNomineeOpen(false)}>
                                  Cancel
                                </Button>
                                <Button
                                  onClick={() => addNominee.mutate({ awardId: award.id, creatorId: selectedCreator })}
                                  disabled={!selectedCreator || addNominee.isPending}
                                >
                                  {addNominee.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                  Add Nominee
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>

                        {nominees?.length === 0 ? (
                          <p className="text-muted-foreground text-center py-4">
                            No nominees yet. Add creators to this award.
                          </p>
                        ) : (
                          <div className="grid gap-2">
                            {nominees?.map((nominee, index) => (
                              <div
                                key={nominee.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-background"
                              >
                                <div className="flex items-center gap-3">
                                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                    index === 0 ? 'bg-yellow-400 text-yellow-900' :
                                    index === 1 ? 'bg-gray-300 text-gray-700' :
                                    index === 2 ? 'bg-amber-600 text-amber-100' :
                                    'bg-muted text-muted-foreground'
                                  }`}>
                                    {index + 1}
                                  </span>
                                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    {nominee.creator?.avatar_url ? (
                                      <img
                                        src={nominee.creator.avatar_url}
                                        alt=""
                                        className="w-8 h-8 rounded-full object-cover"
                                      />
                                    ) : (
                                      <span className="text-sm font-medium text-primary">
                                        {nominee.creator?.display_name.charAt(0)}
                                      </span>
                                    )}
                                  </div>
                                  <div>
                                    <p className="font-medium">{nominee.creator?.display_name}</p>
                                    <p className="text-xs text-muted-foreground">@{nominee.creator?.username}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="font-bold text-primary">{nominee.total_votes}</p>
                                    <p className="text-xs text-muted-foreground">votes</p>
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive"
                                    onClick={() => {
                                      if (confirm('Remove this nominee?')) {
                                        removeNominee.mutate(nominee.id);
                                      }
                                    }}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default AdminAwards;
