import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Search, Loader2, Heart, ShoppingBag, Ticket, Trophy, Wallet, ArrowDownLeft, ArrowUpRight, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

const transactionTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'donation', label: 'Donations' },
  { value: 'merchandise', label: 'Merchandise' },
  { value: 'ticket', label: 'Tickets' },
  { value: 'vote', label: 'Votes' },
  { value: 'withdrawal', label: 'Withdrawals' },
  { value: 'payout', label: 'Payouts' }
];

const getTypeIcon = (type: string) => {
  switch (type) {
    case 'donation': return <Heart className="w-4 h-4 text-pink-500" />;
    case 'merchandise': return <ShoppingBag className="w-4 h-4 text-purple-500" />;
    case 'ticket': return <Ticket className="w-4 h-4 text-blue-500" />;
    case 'vote': return <Trophy className="w-4 h-4 text-amber-500" />;
    case 'withdrawal': return <ArrowUpRight className="w-4 h-4 text-red-500" />;
    case 'payout': return <Wallet className="w-4 h-4 text-green-500" />;
    default: return <DollarSign className="w-4 h-4 text-muted-foreground" />;
  }
};

const AdminTransactions = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['admin-transactions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false })
        .limit(500);
      
      if (error) throw error;
      return data;
    }
  });

  const filteredTransactions = transactions?.filter(t => {
    const matchesSearch = 
      t.creator?.display_name?.toLowerCase().includes(search.toLowerCase()) ||
      t.creator?.username?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    
    const matchesType = typeFilter === 'all' || t.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      completed: { variant: 'default', className: 'bg-green-600' },
      failed: { variant: 'destructive', className: '' }
    };
    const v = variants[status] || variants.pending;
    return <Badge variant={v.variant} className={v.className}>{status}</Badge>;
  };

  const isCredit = (type: string) => ['donation', 'merchandise', 'ticket', 'vote'].includes(type);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">All Transactions</h1>
          <p className="text-muted-foreground mt-1">Complete transaction ledger</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by creator or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              {transactionTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : filteredTransactions?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-20" />
                <p>No transactions found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Type</TableHead>
                    <TableHead>Creator</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Fee</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTransactions?.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(transaction.type)}
                          <span className="capitalize text-sm">{transaction.type}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{transaction.creator?.display_name}</p>
                          <p className="text-xs text-muted-foreground">@{transaction.creator?.username}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell className={`font-semibold ${isCredit(transaction.type) ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit(transaction.type) ? '+' : '-'} KSh {Number(transaction.amount).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        KSh {Number(transaction.fee || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className={`font-medium ${isCredit(transaction.type) ? 'text-green-600' : 'text-red-600'}`}>
                        {isCredit(transaction.type) ? '+' : '-'} KSh {Number(transaction.net_amount).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        {format(new Date(transaction.created_at), 'MMM d, yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(transaction.status || 'pending')}
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

export default AdminTransactions;
