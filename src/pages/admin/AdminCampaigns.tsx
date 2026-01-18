import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Check, X, Loader2, Target } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminCampaigns = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: campaigns, isLoading } = useQuery({
    queryKey: ['admin-campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast.success('Campaign status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const toggleFeatured = useMutation({
    mutationFn: async ({ id, is_featured }: { id: string; is_featured: boolean }) => {
      const { error } = await supabase
        .from('campaigns')
        .update({ is_featured })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-campaigns'] });
      toast.success('Featured status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredCampaigns = campaigns?.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.creator?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: string) => filteredCampaigns?.filter(c => c.status === status) || [];

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

  const getProgress = (current: number, goal: number) => Math.min((current / goal) * 100, 100);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Campaigns</h1>
          <p className="text-muted-foreground mt-1">Monitor and manage crowdfunding campaigns</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active</p>
                  <p className="text-2xl font-bold text-green-600">{byStatus('active').length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Target className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-blue-600">{byStatus('completed').length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Raised</p>
                  <p className="text-2xl font-bold">
                    KSh {(campaigns?.reduce((sum, c) => sum + Number(c.current_amount || 0), 0) || 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Campaigns</p>
                  <p className="text-2xl font-bold">{campaigns?.length || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                  <Target className="w-5 h-5 text-muted-foreground" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search campaigns..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="active" className="space-y-4">
          <TabsList>
            <TabsTrigger value="active" className="gap-2">
              Active
              {byStatus('active').length > 0 && (
                <Badge variant="secondary">{byStatus('active').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="draft">Draft</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="cancelled">Cancelled</TabsTrigger>
          </TabsList>

          {['active', 'draft', 'completed', 'cancelled'].map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byStatus(status).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Target className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No {status} campaigns</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Campaign</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Progress</TableHead>
                          <TableHead>Supporters</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((campaign) => (
                          <TableRow key={campaign.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {campaign.banner_url ? (
                                  <img src={campaign.banner_url} alt="" className="w-12 h-12 rounded object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                                    <Target className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">{campaign.title}</p>
                                    {campaign.is_featured && (
                                      <Badge variant="outline" className="text-amber-600 border-amber-600 text-xs">Featured</Badge>
                                    )}
                                  </div>
                                  {campaign.end_date && (
                                    <p className="text-xs text-muted-foreground">
                                      Ends {format(new Date(campaign.end_date), 'MMM d, yyyy')}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{campaign.creator?.display_name}</p>
                                <p className="text-xs text-muted-foreground">@{campaign.creator?.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="w-32 space-y-1">
                                <Progress value={getProgress(campaign.current_amount || 0, campaign.goal_amount)} className="h-2" />
                                <div className="flex justify-between text-xs">
                                  <span>KSh {Number(campaign.current_amount || 0).toLocaleString()}</span>
                                  <span className="text-muted-foreground">/ {Number(campaign.goal_amount).toLocaleString()}</span>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{campaign.supporter_count || 0}</TableCell>
                            <TableCell>
                              {getStatusBadge(campaign.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleFeatured.mutate({ id: campaign.id, is_featured: !campaign.is_featured })}
                                >
                                  {campaign.is_featured ? 'Unfeature' : 'Feature'}
                                </Button>
                                {status === 'active' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive"
                                    onClick={() => updateStatus.mutate({ id: campaign.id, status: 'cancelled' })}
                                  >
                                    Cancel
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default AdminCampaigns;
