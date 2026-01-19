import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Gift, DollarSign, Plus, Edit, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminGifts = () => {
  const [editingGift, setEditingGift] = useState<any>(null);
  const [newGift, setNewGift] = useState({ name: '', icon: '🎁', price: '' });
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: giftTypes, isLoading } = useQuery({
    queryKey: ['admin-gift-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('gift_types')
        .select('*')
        .order('display_order');
      if (error) throw error;
      return data;
    }
  });

  const { data: stats } = useQuery({
    queryKey: ['gift-stats'],
    queryFn: async () => {
      const { data: gifts } = await supabase
        .from('gifts')
        .select('total_amount, creator_amount, platform_fee, quantity')
        .eq('status', 'completed');

      return {
        totalGifts: gifts?.reduce((sum, g) => sum + (g.quantity || 1), 0) || 0,
        totalRevenue: gifts?.reduce((sum, g) => sum + Number(g.total_amount), 0) || 0,
        platformFees: gifts?.reduce((sum, g) => sum + Number(g.platform_fee), 0) || 0
      };
    }
  });

  const createGift = useMutation({
    mutationFn: async (gift: { name: string; icon: string; price: number }) => {
      const { error } = await supabase
        .from('gift_types')
        .insert({
          name: gift.name,
          icon: gift.icon,
          price: gift.price,
          display_order: (giftTypes?.length || 0) + 1
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-types'] });
      setDialogOpen(false);
      setNewGift({ name: '', icon: '🎁', price: '' });
      toast.success('Gift type created');
    },
    onError: () => {
      toast.error('Failed to create gift type');
    }
  });

  const updateGift = useMutation({
    mutationFn: async (gift: { id: string; name: string; icon: string; price: number; is_active: boolean }) => {
      const { error } = await supabase
        .from('gift_types')
        .update({
          name: gift.name,
          icon: gift.icon,
          price: gift.price,
          is_active: gift.is_active
        })
        .eq('id', gift.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-types'] });
      setEditingGift(null);
      toast.success('Gift type updated');
    },
    onError: () => {
      toast.error('Failed to update gift type');
    }
  });

  const deleteGift = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('gift_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-gift-types'] });
      toast.success('Gift type deleted');
    },
    onError: () => {
      toast.error('Failed to delete gift type');
    }
  });

  const handleCreate = () => {
    if (!newGift.name || !newGift.price) {
      toast.error('Please fill in all fields');
      return;
    }
    createGift.mutate({
      name: newGift.name,
      icon: newGift.icon,
      price: parseFloat(newGift.price)
    });
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-display font-bold">Gift Types</h1>
            <p className="text-muted-foreground">Manage virtual gifts for creators</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                Add Gift Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Gift Type</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div>
                  <Label>Name</Label>
                  <Input
                    value={newGift.name}
                    onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                    placeholder="e.g., Super Heart"
                  />
                </div>
                <div>
                  <Label>Icon (emoji)</Label>
                  <Input
                    value={newGift.icon}
                    onChange={(e) => setNewGift({ ...newGift, icon: e.target.value })}
                    placeholder="🎁"
                  />
                </div>
                <div>
                  <Label>Price (KSh)</Label>
                  <Input
                    type="number"
                    value={newGift.price}
                    onChange={(e) => setNewGift({ ...newGift, price: e.target.value })}
                    placeholder="100"
                  />
                </div>
                <Button onClick={handleCreate} disabled={createGift.isPending} className="w-full">
                  {createGift.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Create Gift Type
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-pink-500/10 to-purple-500/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-pink-100 flex items-center justify-center">
                  <Gift className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Gifts Sent</p>
                  <p className="text-xl font-bold">{stats?.totalGifts || 0}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                  <p className="text-xl font-bold">
                    KSh {(stats?.totalRevenue || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Platform Fees</p>
                  <p className="text-xl font-bold">
                    KSh {(stats?.platformFees || 0).toLocaleString()}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Gift Types Table */}
        <Card>
          <CardHeader>
            <CardTitle>Gift Types</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Gift</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {giftTypes?.map((gift) => (
                    <TableRow key={gift.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{gift.icon}</span>
                          {editingGift?.id === gift.id ? (
                            <div className="flex gap-2">
                              <Input
                                value={editingGift.name}
                                onChange={(e) => setEditingGift({ ...editingGift, name: e.target.value })}
                                className="w-32"
                              />
                              <Input
                                value={editingGift.icon}
                                onChange={(e) => setEditingGift({ ...editingGift, icon: e.target.value })}
                                className="w-16"
                              />
                            </div>
                          ) : (
                            <span className="font-medium">{gift.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {editingGift?.id === gift.id ? (
                          <Input
                            type="number"
                            value={editingGift.price}
                            onChange={(e) => setEditingGift({ ...editingGift, price: parseFloat(e.target.value) })}
                            className="w-24"
                          />
                        ) : (
                          <span>KSh {Number(gift.price).toLocaleString()}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{gift.display_order}</Badge>
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={editingGift?.id === gift.id ? editingGift.is_active : gift.is_active}
                          onCheckedChange={(checked) => {
                            if (editingGift?.id === gift.id) {
                              setEditingGift({ ...editingGift, is_active: checked });
                            } else {
                              updateGift.mutate({ ...gift, is_active: checked });
                            }
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {editingGift?.id === gift.id ? (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => updateGift.mutate(editingGift)}
                              disabled={updateGift.isPending}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingGift(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingGift(gift)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                if (confirm('Delete this gift type?')) {
                                  deleteGift.mutate(gift.id);
                                }
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
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

export default AdminGifts;
