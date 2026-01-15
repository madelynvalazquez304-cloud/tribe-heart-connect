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

const CreatorWithdrawals = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [isOpen, setIsOpen] = useState(false);
  const [amount, setAmount] = useState('');

  const { data: balance } = useQuery({
    queryKey: ['creator-balance', creator?.id],
    queryFn: async () => {
      if (!creator) return 0;
      const { data, error } = await supabase.rpc('get_creator_balance', { _creator_id: creator.id });
      if (error) throw error;
      return data || 0;
    },
    enabled: !!creator
  });

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
      const fee = 50; // Fixed fee
      const { error } = await supabase.from('withdrawals').insert({
        creator_id: creator.id,
        amount,
        fee,
        net_amount: amount - fee,
        payment_method: 'mpesa'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-withdrawals'] });
      toast.success('Withdrawal request submitted');
      setIsOpen(false);
      setAmount('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = () => {
    const amountNum = parseInt(amount);
    if (amountNum < 500) {
      toast.error('Minimum withdrawal is KSh 500');
      return;
    }
    if (amountNum > (balance || 0)) {
      toast.error('Insufficient balance');
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
                <div className="p-4 rounded-lg bg-green-50 text-center">
                  <p className="text-sm text-muted-foreground">Available Balance</p>
                  <p className="text-2xl font-bold text-green-600">KSh {Number(balance || 0).toLocaleString()}</p>
                </div>
                <div className="space-y-2">
                  <Label>Amount (KSh)</Label>
                  <Input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="Min 500"
                  />
                  <p className="text-xs text-muted-foreground">Fee: KSh 50</p>
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
            <p className="text-3xl font-bold text-green-600">KSh {Number(balance || 0).toLocaleString()}</p>
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
                        <Badge variant={w.status === 'completed' ? 'default' : w.status === 'rejected' ? 'destructive' : 'outline'}>
                          {w.status}
                        </Badge>
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
