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
import { Search, Check, X, Loader2, Wallet, Phone, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Json } from '@/integrations/supabase/types';

type WithdrawalStatus = 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';

const AdminWithdrawals = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [actionDialog, setActionDialog] = useState<{ type: 'approve' | 'reject' | null; withdrawal: any }>({ type: null, withdrawal: null });
  const [reason, setReason] = useState('');
  const [reference, setReference] = useState('');

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['admin-withdrawals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('withdrawals')
        .select(`
          *,
          creator:creators(display_name, username, mpesa_phone, paypal_email)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const processWithdrawal = useMutation({
    mutationFn: async ({ id, status, reason, reference }: { id: string; status: WithdrawalStatus; reason?: string; reference?: string }) => {
      const updates: any = { 
        status,
        processed_at: new Date().toISOString()
      };
      
      if (reason) updates.rejection_reason = reason;
      if (reference) updates.reference = reference;

      const { error } = await supabase
        .from('withdrawals')
        .update(updates)
        .eq('id', id);
      
      if (error) throw error;

      // If completed, create a transaction record
      if (status === 'completed') {
        const withdrawal = withdrawals?.find(w => w.id === id);
        if (withdrawal) {
          await supabase.from('transactions').insert({
            creator_id: withdrawal.creator_id,
            type: 'withdrawal',
            amount: withdrawal.amount,
            fee: withdrawal.fee || 0,
            net_amount: withdrawal.net_amount,
            status: 'completed',
            reference_type: 'withdrawal',
            reference_id: id,
            description: 'Withdrawal payout'
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-withdrawals'] });
      toast.success('Withdrawal processed');
      setActionDialog({ type: null, withdrawal: null });
      setReason('');
      setReference('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredWithdrawals = withdrawals?.filter(w =>
    w.creator?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    w.creator?.username?.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadge = (status: WithdrawalStatus) => {
    const variants: Record<WithdrawalStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      approved: { variant: 'default', className: 'bg-blue-600' },
      processing: { variant: 'default', className: 'bg-purple-600' },
      completed: { variant: 'default', className: 'bg-green-600' },
      rejected: { variant: 'destructive', className: '' }
    };
    return <Badge variant={variants[status].variant} className={variants[status].className}>{status}</Badge>;
  };

  const handleProcess = async (status: 'approved' | 'completed' | 'rejected') => {
    if (!actionDialog.withdrawal) return;
    
    await processWithdrawal.mutateAsync({
      id: actionDialog.withdrawal.id,
      status,
      reason: status === 'rejected' ? reason : undefined,
      reference: status === 'completed' ? reference : undefined
    });
  };

  const byStatus = (status: WithdrawalStatus) => filteredWithdrawals?.filter(w => w.status === status) || [];

  const getPaymentDetails = (withdrawal: any): Record<string, any> => {
    if (!withdrawal.payment_details) return {};
    return withdrawal.payment_details as Record<string, any>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Withdrawals</h1>
          <p className="text-muted-foreground mt-1">Process creator withdrawal requests</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{byStatus('pending').length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-purple-600">{byStatus('processing').length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Completed</p>
                  <p className="text-2xl font-bold text-green-600">{byStatus('completed').length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Check className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Paid</p>
                  <p className="text-2xl font-bold">
                    KSh {byStatus('completed').reduce((sum, w) => sum + Number(w.net_amount), 0).toLocaleString()}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by creator..."
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
                <Badge variant="secondary">{byStatus('pending').length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="rejected">Rejected</TabsTrigger>
          </TabsList>

          {(['pending', 'processing', 'completed', 'rejected'] as WithdrawalStatus[]).map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byStatus(status).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      No {status} withdrawals
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Creator</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Fee</TableHead>
                          <TableHead>Net</TableHead>
                          <TableHead>Method</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          {status === 'pending' && <TableHead className="text-right">Actions</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{withdrawal.creator?.display_name}</p>
                                <p className="text-sm text-muted-foreground">@{withdrawal.creator?.username}</p>
                              </div>
                            </TableCell>
                            <TableCell className="font-medium">
                              KSh {Number(withdrawal.amount).toLocaleString()}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              KSh {Number(withdrawal.fee || 0).toLocaleString()}
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              KSh {Number(withdrawal.net_amount).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {withdrawal.payment_method === 'mpesa' ? (
                                  <>
                                    <Phone className="w-4 h-4 text-green-600" />
                                    <span className="text-sm">{withdrawal.creator?.mpesa_phone}</span>
                                  </>
                                ) : (
                                  <>
                                    <CreditCard className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm">{withdrawal.creator?.paypal_email}</span>
                                  </>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(withdrawal.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(withdrawal.status)}
                            </TableCell>
                            {status === 'pending' && (
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                    onClick={() => setActionDialog({ type: 'approve', withdrawal })}
                                  >
                                    <Check className="w-4 h-4 mr-1" />
                                    Approve
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                    onClick={() => setActionDialog({ type: 'reject', withdrawal })}
                                  >
                                    <X className="w-4 h-4 mr-1" />
                                    Reject
                                  </Button>
                                </div>
                              </TableCell>
                            )}
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

        {/* Process Dialog */}
        <Dialog open={!!actionDialog.type} onOpenChange={() => setActionDialog({ type: null, withdrawal: null })}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {actionDialog.type === 'approve' ? 'Approve Withdrawal' : 'Reject Withdrawal'}
              </DialogTitle>
              <DialogDescription>
                {actionDialog.type === 'approve' 
                  ? `Approve withdrawal of KSh ${Number(actionDialog.withdrawal?.net_amount).toLocaleString()} to ${actionDialog.withdrawal?.creator?.display_name}?`
                  : `Reject this withdrawal request?`
                }
              </DialogDescription>
            </DialogHeader>
            
            {actionDialog.type === 'approve' && (
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-secondary/50">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Amount</p>
                      <p className="font-medium">KSh {Number(actionDialog.withdrawal?.amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fee</p>
                      <p className="font-medium">KSh {Number(actionDialog.withdrawal?.fee || 0).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net Amount</p>
                      <p className="font-semibold text-green-600">KSh {Number(actionDialog.withdrawal?.net_amount).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Payment To</p>
                      <p className="font-medium">
                        {actionDialog.withdrawal?.payment_method === 'mpesa' 
                          ? actionDialog.withdrawal?.creator?.mpesa_phone
                          : actionDialog.withdrawal?.creator?.paypal_email
                        }
                      </p>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Transaction Reference (optional)</label>
                  <Input
                    placeholder="e.g., MPESA transaction ID"
                    value={reference}
                    onChange={(e) => setReference(e.target.value)}
                  />
                </div>
              </div>
            )}
            
            {actionDialog.type === 'reject' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason for rejection</label>
                <Textarea
                  placeholder="Provide a reason..."
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setActionDialog({ type: null, withdrawal: null })}>
                Cancel
              </Button>
              {actionDialog.type === 'approve' ? (
                <Button
                  onClick={() => handleProcess('completed')}
                  disabled={processWithdrawal.isPending}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {processWithdrawal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Approve & Mark Paid
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  onClick={() => handleProcess('rejected')}
                  disabled={processWithdrawal.isPending || !reason}
                >
                  {processWithdrawal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Reject
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminWithdrawals;
