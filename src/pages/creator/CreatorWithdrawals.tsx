import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Wallet, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { notify } from '@/lib/notify';
import { useAuth } from '@/contexts/AuthContext';

const CreatorWithdrawals = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const { data: balance } = useQuery({
    queryKey: ['creator-balance', creator?.id],
    queryFn: async () => {
      if (!creator) return 0;
      const { data, error } = await supabase.rpc('get_creator_balance', { _creator_id: creator.id });
      if (error) throw error;
      return Number(data || 0);
    },
    enabled: !!creator
  });

  // Available = completed balance minus funds already locked in open withdrawals
  const { data: available } = useQuery({
    queryKey: ['creator-available-balance', creator?.id],
    queryFn: async () => {
      if (!creator) return 0;
      const { data, error } = await supabase.rpc('get_creator_available_balance', { _creator_id: creator.id });
      if (error) throw error;
      return Number(data || 0);
    },
    enabled: !!creator
  });

  const { data: wSettings } = useQuery({
    queryKey: ['withdrawal-settings'],
    queryFn: async () => {
      const { data } = await supabase
        .from('platform_settings')
        .select('key, value')
        .in('key', ['withdrawal_min_amount', 'withdrawal_fee']);
      const get = (k: string) => data?.find(d => d.key === k)?.value;
      return {
        min: Number(get('withdrawal_min_amount') ?? 500),
        fee: Number(get('withdrawal_fee') ?? 50),
      };
    },
  });

  const minAmount = wSettings?.min ?? 500;
  const fee = wSettings?.fee ?? 50;

  const { data: withdrawals, isLoading } = useQuery({
    queryKey: ['creator-withdrawals', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('withdrawals')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const createWithdrawal = useMutation({
    mutationFn: async (amount: number) => {
      if (!creator) throw new Error('No creator');
      // All validation (balance, minimum, fee, approval flag) happens server-side
      const { data: newId, error } = await supabase.rpc('request_withdrawal', {
        _amount: amount,
        _payment_details: {},
      });
      if (error) throw new Error(error.message.replace(/^.*?:\s*/, ''));
      const net = amount - fee;
      if (user?.email) {
        notify('withdrawal_requested', user.email, {
          recipient_name: creator.display_name || creator.username,
          amount: net.toLocaleString(),
          currency: 'KES',
          receipt: String(newId || '').slice(0, 8).toUpperCase() || 'PENDING',
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-withdrawals'] });
      queryClient.invalidateQueries({ queryKey: ['creator-available-balance'] });
      toast.success('Withdrawal request submitted');
      setIsOpen(false);
      setAmount('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = () => {
    const amountNum = parseInt(amount, 10);
    if (!amountNum || amountNum <= 0) {
      toast.error('Enter a valid amount');
      return;
    }
    if (amountNum < minAmount) {
      toast.error(`Minimum withdrawal is KSh ${minAmount.toLocaleString()}`);
      return;
    }
    if (amountNum > (available || 0)) {
      toast.error('Insufficient available balance');
      return;
    }
    if (!creator?.mpesa_phone) {
      toast.error('Add your M-PESA phone number in settings first');
      return;
    }
    createWithdrawal.mutate(amountNum);
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Withdrawals</h1>
            <p className="text-muted-foreground mt-1">Manage your withdrawal requests</p>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Withdrawal
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Withdrawal</DialogTitle>
                <DialogDescription>
                  Withdraw funds to your M-PESA: {creator?.mpesa_phone || 'Not set'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-sm text-muted-foreground">Available to withdraw</p>
                  <p className="text-2xl font-bold text-primary">KSh {Number(available || 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Earned: KSh {Number(balance || 0).toLocaleString()} · Locked in open requests: KSh {Math.max(Number(balance || 0) - Number(available || 0), 0).toLocaleString()}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Amount (KSh)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder={`Min ${minAmount}`}
                  />
                  <p className="text-xs text-muted-foreground">
                    Fee: KSh {fee.toLocaleString()}
                    {parseInt(amount || '0', 10) > fee && ` · You receive KSh ${(parseInt(amount, 10) - fee).toLocaleString()}`}
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={createWithdrawal.isPending}>
                  {createWithdrawal.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Submit Request
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5" />
              Available Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-primary">KSh {Number(available || 0).toLocaleString()}</p>
            <p className="text-sm text-muted-foreground mt-1">
              Total earned KSh {Number(balance || 0).toLocaleString()} — pending payout requests are held back to prevent overdrafts.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Withdrawal History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : withdrawals?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No withdrawals yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {withdrawals?.map((w) => (
                    <TableRow key={w.id}>
                      <TableCell>KSh {Number(w.amount).toLocaleString()}</TableCell>
                      <TableCell className="text-muted-foreground">KSh {Number(w.fee || 0).toLocaleString()}</TableCell>
                      <TableCell className="font-semibold">KSh {Number(w.net_amount).toLocaleString()}</TableCell>
                      <TableCell>{format(new Date(w.created_at), 'MMM d, yyyy')}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1 items-start">
                          <Badge variant={w.status === 'completed' ? 'default' : w.status === 'rejected' ? 'destructive' : 'outline'}>
                            {w.status}
                          </Badge>
                          {(w as any).requires_review && w.status === 'pending' && (
                            <span className="text-xs text-amber-600">awaiting admin approval</span>
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
      </div>
    </DashboardLayout>
  );
};

export default CreatorWithdrawals;
