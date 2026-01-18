import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Search, Check, X, Loader2, ShoppingBag, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const AdminMerchandise = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: merchandise, isLoading } = useQuery({
    queryKey: ['admin-merchandise'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandise')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateApproval = useMutation({
    mutationFn: async ({ id, is_approved }: { id: string; is_approved: boolean }) => {
      const { error } = await supabase
        .from('merchandise')
        .update({ is_approved })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-merchandise'] });
      toast.success('Product status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredMerchandise = merchandise?.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    m.creator?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const byApproval = (approved: boolean | null) => {
    if (approved === null) {
      return filteredMerchandise?.filter(m => m.is_approved === null || m.is_approved === false) || [];
    }
    return filteredMerchandise?.filter(m => m.is_approved === approved) || [];
  };

  const getImages = (item: any): string[] => {
    if (!item.images) return [];
    return item.images as string[];
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Merchandise</h1>
          <p className="text-muted-foreground mt-1">Review and approve creator products</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-600">{byApproval(false).length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold text-green-600">{byApproval(true).length}</p>
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
                  <p className="text-sm text-muted-foreground">Total Products</p>
                  <p className="text-2xl font-bold">{merchandise?.length || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
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
              {byApproval(false).length > 0 && (
                <Badge variant="secondary">{byApproval(false).length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          {[false, true].map((approved) => (
            <TabsContent key={approved ? 'approved' : 'pending'} value={approved ? 'approved' : 'pending'}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byApproval(approved).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingBag className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No {approved ? 'approved' : 'pending'} products</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Price</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byApproval(approved).map((item) => {
                          const images = getImages(item);
                          return (
                            <TableRow key={item.id}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  {images.length > 0 ? (
                                    <img src={images[0]} alt="" className="w-12 h-12 rounded object-cover" />
                                  ) : (
                                    <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                                      <ShoppingBag className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                  )}
                                  <div>
                                    <p className="font-medium">{item.name}</p>
                                    <p className="text-xs text-muted-foreground line-clamp-1">{item.description}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                <div>
                                  <p className="font-medium">{item.creator?.display_name}</p>
                                  <p className="text-xs text-muted-foreground">@{item.creator?.username}</p>
                                </div>
                              </TableCell>
                              <TableCell className="font-semibold">
                                KSh {Number(item.price).toLocaleString()}
                              </TableCell>
                              <TableCell>{item.stock}</TableCell>
                              <TableCell>
                                {format(new Date(item.created_at), 'MMM d, yyyy')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {!approved && (
                                    <>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                        onClick={() => updateApproval.mutate({ id: item.id, is_approved: true })}
                                      >
                                        <Check className="w-4 h-4 mr-1" />
                                        Approve
                                      </Button>
                                    </>
                                  )}
                                  {approved && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => updateApproval.mutate({ id: item.id, is_approved: false })}
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Revoke
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
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

export default AdminMerchandise;
