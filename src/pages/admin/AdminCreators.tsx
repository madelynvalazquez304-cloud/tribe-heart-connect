import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Search, Check, X, Eye, Ban, RefreshCw, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type CreatorStatus = 'pending' | 'approved' | 'suspended' | 'rejected';

const AdminCreators = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCreator, setSelectedCreator] = useState<any>(null);
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject' | 'suspend' | 'unsuspend' | null; creator: any }>({ type: null, creator: null });
  const [reason, setReason] = useState('');

  const { data: creators, isLoading } = useQuery({
    queryKey: ['admin-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`
          *,
          category:creator_categories(name)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status, reason }: { id: string; status: CreatorStatus; reason?: string }) => {
      const updates: any = { status };
      if (status === 'approved' && reason !== 'unsuspend') {
        updates.approved_at = new Date().toISOString();
        updates.suspension_reason = null;
      } else if (status === 'approved' && reason === 'unsuspend') {
        updates.suspension_reason = null;
      } else if (status === 'rejected') {
        updates.rejection_reason = reason;
      } else if (status === 'suspended') {
        updates.suspension_reason = reason;
      } else if (status === 'approved' && reason === 'unsuspend') {
        updates.suspension_reason = null;
      }

      const { error } = await supabase
        .from('creators')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-creators'] });
      toast.success('Creator status updated');
      setActionDialog({ type: null, creator: null });
      setReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredCreators = creators?.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: CreatorStatus) => {
    const variants: Record<CreatorStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      approved: { variant: 'default', className: 'bg-green-600' },
      suspended: { variant: 'destructive', className: '' },
      rejected: { variant: 'secondary', className: 'bg-muted' }
    };
    return <Badge variant={variants[status].variant} className={variants[status].className}>{status}</Badge>;
  };

  const handleAction = async () => {
    if (!actionDialog.creator) return;
    
    let newStatus: CreatorStatus;
    switch (actionDialog.type) {
      case 'approve':
      case 'unsuspend':
        newStatus = 'approved';
        break;
      case 'reject':
        newStatus = 'rejected';
        break;
      case 'suspend':
        newStatus = 'suspended';
        break;
      default:
        return;
    }

    await updateStatus.mutateAsync({
      id: actionDialog.creator.id,
      status: newStatus,
      reason: actionDialog.type === 'unsuspend' ? 'unsuspend' : reason
    });
  };

  const byStatus = (status: CreatorStatus) => filteredCreators?.filter(c => c.status === status) || [];

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Manage Creators</h1>
          <p className="text-muted-foreground mt-1">Review and manage creator accounts</p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search creators..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="gap-2">
              Pending
              {byStatus('pending').length > 0 && (
                <Badge variant="secondary" className="ml-1">{byStatus('pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="suspended">Suspended</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {(['pending', 'approved', 'suspended', 'rejected'] as CreatorStatus[]).map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byStatus(status).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No {status} creators
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Creator</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Stats</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((creator) => (
                          <TableRow key={creator.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                  {creator.avatar_url ? (
                                    <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                                  ) : (
                                    <span className="text-sm font-medium text-primary">
                                      {creator.display_name.charAt(0)}
                                    </span>
                                  )}
                                </div>
                                <div>
                                  <p className="font-medium">{creator.display_name}</p>
                                  <p className="text-sm text-muted-foreground">@{creator.username}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {creator.category?.name || '-'}
                            </TableCell>
                            <TableCell>
                              {format(new Date(creator.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              <div className="text-sm">
                                <p>{creator.total_supporters} supporters</p>
                                <p className="text-muted-foreground">KSh {Number(creator.total_raised).toLocaleString()} raised</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(creator.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setSelectedCreator(creator)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                
                                {status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => setActionDialog({ type: 'approve', creator })}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                      onClick={() => setActionDialog({ type: 'reject', creator })}
                                    >
                                      <X className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                                
                                {status === 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                    onClick={() => setActionDialog({ type: 'suspend', creator })}
                                  >
                                    <Ban className="w-4 h-4" />
                                  </Button>
                                )}
                                
                                {status === 'suspended' && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => setActionDialog({ type: 'unsuspend', creator })}
                                  >
                                    <RefreshCw className="w-4 h-4" />
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

        {/* Action Dialog */}
        <Dialog open={!!actionDialog.type} onOpenChange={() => setActionDialog({ type: null, creator: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'approve' && 'Approve Creator'}
                {actionDialog.type === 'reject' && 'Reject Creator'}
                {actionDialog.type === 'suspend' && 'Suspend Creator'}
                {actionDialog.type === 'unsuspend' && 'Unsuspend Creator'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'approve' && `Approve ${actionDialog.creator?.display_name} as a creator?`}
                {actionDialog.type === 'reject' && `Reject ${actionDialog.creator?.display_name}'s creator application?`}
                {actionDialog.type === 'suspend' && `Suspend ${actionDialog.creator?.display_name}'s account?`}
                {actionDialog.type === 'unsuspend' && `Restore ${actionDialog.creator?.display_name}'s account?`}
              </DialogDescription>
            </DialogHeader>
            
            {(actionDialog.type === 'reject' || actionDialog.type === 'suspend') && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason</label>
                <Textarea
                  placeholder="Provide a reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog({ type: null, creator: null })}>
                Cancel
              </Button>
              <Button
                variant={actionDialog.type === 'approve' || actionDialog.type === 'unsuspend' ? 'default' : 'destructive'}
                onClick={handleAction}
                disabled={updateStatus.isPending || ((actionDialog.type === 'reject' || actionDialog.type === 'suspend') && !reason)}
              >
                {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* View Creator Dialog */}
        <Dialog open={!!selectedCreator} onOpenChange={() => setSelectedCreator(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Creator Details</DialogTitle>
            </DialogHeader>
            
            {selectedCreator && (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
                    {selectedCreator.avatar_url ? (
                      <img src={selectedCreator.avatar_url} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    ) : (
                      <span className="text-xl font-medium text-primary">
                        {selectedCreator.display_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{selectedCreator.display_name}</h3>
                    <p className="text-muted-foreground">@{selectedCreator.username}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {getStatusBadge(selectedCreator.status)}
                      {selectedCreator.is_verified && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-700">Verified</Badge>
                      )}
                    </div>
                  </div>
                  <a
                    href={`/${selectedCreator.username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="gap-2">
                      <ExternalLink className="w-4 h-4" />
                      View Page
                    </Button>
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Tribe Name</p>
                    <p className="font-medium">{selectedCreator.tribe_name || '-'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">Category</p>
                    <p className="font-medium">{selectedCreator.category?.name || '-'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">M-PESA Phone</p>
                    <p className="font-medium">{selectedCreator.mpesa_phone || '-'}</p>
                  </div>
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground">PayPal Email</p>
                    <p className="font-medium">{selectedCreator.paypal_email || '-'}</p>
                  </div>
                </div>

                {selectedCreator.bio && (
                  <div className="p-4 rounded-lg bg-secondary/50">
                    <p className="text-sm text-muted-foreground mb-1">Bio</p>
                    <p>{selectedCreator.bio}</p>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-4 rounded-lg bg-primary/5">
                    <p className="text-2xl font-bold text-primary">{selectedCreator.total_supporters}</p>
                    <p className="text-sm text-muted-foreground">Supporters</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary/5">
                    <p className="text-2xl font-bold text-primary">KSh {Number(selectedCreator.total_raised).toLocaleString()}</p>
                    <p className="text-sm text-muted-foreground">Total Raised</p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-primary/5">
                    <p className="text-2xl font-bold text-primary">{selectedCreator.total_votes}</p>
                    <p className="text-sm text-muted-foreground">Votes</p>
                  </div>
                </div>

                {selectedCreator.rejection_reason && (
                  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
                    <p className="text-sm font-medium text-destructive">Rejection Reason</p>
                    <p className="text-sm text-destructive/80 mt-1">{selectedCreator.rejection_reason}</p>
                  </div>
                )}

                {selectedCreator.suspension_reason && (
                  <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <p className="text-sm font-medium text-amber-600">Suspension Reason</p>
                    <p className="text-sm text-amber-600/80 mt-1">{selectedCreator.suspension_reason}</p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminCreators;
