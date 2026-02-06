import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
import { Ban, Search, Loader2, RefreshCw, AlertTriangle, User } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminDisabledAccounts = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [disableDialog, setDisableDialog] = useState<any>(null);
  const [reason, setReason] = useState('');

  // Get disabled accounts with creator info
  const { data: disabledAccounts, isLoading } = useQuery({
    queryKey: ['disabled-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('disabled_accounts')
        .select('*')
        .eq('is_disabled', true)
        .order('disabled_at', { ascending: false });
      
      if (error) throw error;

      // Get creator info for each
      const withCreators = await Promise.all(
        data.map(async (da) => {
          const { data: creator } = await supabase
            .from('creators')
            .select('id, display_name, username, avatar_url')
            .eq('user_id', da.user_id)
            .single();
          return { ...da, creator };
        })
      );

      return withCreators;
    }
  });

  // Get creators for disabling
  const { data: creators } = useQuery({
    queryKey: ['admin-creators-for-disable'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, user_id, display_name, username, avatar_url, status')
        .eq('status', 'approved')
        .order('display_name');
      
      if (error) throw error;
      return data;
    }
  });

  const disableAccount = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      const { error } = await supabase
        .from('disabled_accounts')
        .upsert({
          user_id: userId,
          is_disabled: true,
          reason,
          disabled_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disabled-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-creators-for-disable'] });
      toast.success('Account disabled');
      setDisableDialog(null);
      setReason('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const enableAccount = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase
        .from('disabled_accounts')
        .update({ is_disabled: false })
        .eq('user_id', userId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['disabled-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['admin-creators-for-disable'] });
      toast.success('Account enabled');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredCreators = creators?.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase())
  );

  const disabledUserIds = new Set(disabledAccounts?.map(da => da.user_id) || []);

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Disabled Accounts</h1>
          <p className="text-muted-foreground mt-1">
            Disable accounts to hide them from the platform completely
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Disable new accounts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                Disable Accounts
              </CardTitle>
              <CardDescription>Search and disable creator accounts</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {filteredCreators?.filter(c => !disabledUserIds.has(c.user_id)).map((creator) => (
                  <div
                    key={creator.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {creator.avatar_url ? (
                          <img src={creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <User className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{creator.display_name}</p>
                        <p className="text-sm text-muted-foreground">@{creator.username}</p>
                      </div>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDisableDialog(creator)}
                    >
                      <Ban className="w-4 h-4 mr-1" />
                      Disable
                    </Button>
                  </div>
                ))}

                {filteredCreators?.filter(c => !disabledUserIds.has(c.user_id)).length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No creators found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Currently disabled */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                Currently Disabled ({disabledAccounts?.length || 0})
              </CardTitle>
              <CardDescription>These accounts are hidden from the platform</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : disabledAccounts?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No disabled accounts
                </div>
              ) : (
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {disabledAccounts?.map((da) => (
                    <div
                      key={da.user_id}
                      className="flex items-center justify-between p-3 rounded-lg bg-destructive/5 border border-destructive/10"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
                          {da.creator?.avatar_url ? (
                            <img src={da.creator.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover opacity-50" />
                          ) : (
                            <Ban className="w-5 h-5 text-destructive" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{da.creator?.display_name || 'Unknown'}</p>
                          <p className="text-xs text-muted-foreground">
                            Disabled {format(new Date(da.disabled_at), 'MMM d, yyyy')}
                          </p>
                          {da.reason && (
                            <p className="text-xs text-destructive/80 mt-1">{da.reason}</p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => enableAccount.mutate(da.user_id)}
                        disabled={enableAccount.isPending}
                      >
                        {enableAccount.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4 mr-1" />
                        )}
                        Enable
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Disable Dialog */}
        <Dialog open={!!disableDialog} onOpenChange={() => setDisableDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                Disable Account
              </DialogTitle>
              <DialogDescription>
                Disable {disableDialog?.display_name}'s account? They will be completely hidden from the platform.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Reason (optional)</label>
                <Textarea
                  placeholder="Why is this account being disabled?"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setDisableDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => disableAccount.mutate({ userId: disableDialog.user_id, reason })}
                disabled={disableAccount.isPending}
              >
                {disableAccount.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Disable Account
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminDisabledAccounts;
