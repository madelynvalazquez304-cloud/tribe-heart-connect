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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, Loader2, Package, Truck, CheckCircle, XCircle, Eye, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const AdminOrders = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');

  const { data: orders, isLoading } = useQuery({
    queryKey: ['admin-orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          creator:creators(display_name, username),
          items:order_items(
            *,
            merchandise:merchandise(name, images)
          )
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: OrderStatus }) => {
      const { error } = await supabase
        .from('orders')
        .update({ status, updated_at: new Date().toISOString() })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      toast.success('Order status updated');
      setSelectedOrder(null);
      setNewStatus('');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredOrders = orders?.filter(o =>
    o.customer_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
    o.creator?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: OrderStatus | 'all') => {
    if (status === 'all') return filteredOrders || [];
    return filteredOrders?.filter(o => o.status === status) || [];
  };

  const getStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string; icon: React.ReactNode }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600', icon: <Package className="w-3 h-3" /> },
      processing: { variant: 'default', className: 'bg-blue-600', icon: <Package className="w-3 h-3" /> },
      shipped: { variant: 'default', className: 'bg-purple-600', icon: <Truck className="w-3 h-3" /> },
      delivered: { variant: 'default', className: 'bg-green-600', icon: <CheckCircle className="w-3 h-3" /> },
      cancelled: { variant: 'destructive', className: '', icon: <XCircle className="w-3 h-3" /> },
      refunded: { variant: 'secondary', className: '', icon: <XCircle className="w-3 h-3" /> }
    };
    const c = config[status];
    return (
      <Badge variant={c.variant} className={`gap-1 ${c.className}`}>
        {c.icon}
        {status}
      </Badge>
    );
  };

  const getItemImages = (item: any): string[] => {
    if (!item.merchandise?.images) return [];
    return item.merchandise.images as string[];
  };

  const stats = {
    pending: byStatus('pending').length,
    processing: byStatus('processing').length,
    shipped: byStatus('shipped').length,
    delivered: byStatus('delivered').length,
    totalRevenue: orders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.total), 0) || 0
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">Manage all merchandise orders across creators</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
                </div>
                <Package className="w-8 h-8 text-amber-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Processing</p>
                  <p className="text-2xl font-bold text-blue-600">{stats.processing}</p>
                </div>
                <Package className="w-8 h-8 text-blue-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Shipped</p>
                  <p className="text-2xl font-bold text-purple-600">{stats.shipped}</p>
                </div>
                <Truck className="w-8 h-8 text-purple-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Delivered</p>
                  <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600/30" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue</p>
                  <p className="text-xl font-bold">KSh {stats.totalRevenue.toLocaleString()}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({orders?.length || 0})</TabsTrigger>
            <TabsTrigger value="pending" className="gap-1">
              Pending
              {stats.pending > 0 && <Badge variant="secondary" className="ml-1">{stats.pending}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="processing">Processing</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          {(['all', 'pending', 'processing', 'shipped', 'delivered'] as const).map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byStatus(status).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No {status === 'all' ? '' : status} orders</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number || order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.customer_name}</p>
                                <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{order.creator?.display_name}</p>
                                <p className="text-xs text-muted-foreground">@{order.creator?.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex -space-x-2">
                                {order.items?.slice(0, 3).map((item: any, i: number) => {
                                  const images = getItemImages(item);
                                  return images.length > 0 ? (
                                    <img 
                                      key={i} 
                                      src={images[0]} 
                                      alt="" 
                                      className="w-8 h-8 rounded border-2 border-background object-cover" 
                                    />
                                  ) : (
                                    <div key={i} className="w-8 h-8 rounded bg-secondary flex items-center justify-center border-2 border-background">
                                      <Package className="w-3 h-3" />
                                    </div>
                                  );
                                })}
                                {(order.items?.length || 0) > 3 && (
                                  <div className="w-8 h-8 rounded bg-secondary flex items-center justify-center border-2 border-background text-xs">
                                    +{order.items.length - 3}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold">
                              KSh {Number(order.total).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedOrder(order)}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Button>
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

        {/* Order Details Dialog */}
        <Dialog open={!!selectedOrder} onOpenChange={() => setSelectedOrder(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Order #{selectedOrder?.order_number || selectedOrder?.id.slice(0, 8)}</DialogTitle>
              <DialogDescription>
                Placed on {selectedOrder && format(new Date(selectedOrder.created_at), 'MMMM d, yyyy')}
              </DialogDescription>
            </DialogHeader>
            
            {selectedOrder && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-2 gap-4 p-4 bg-secondary/50 rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Customer</p>
                    <p className="font-medium">{selectedOrder.customer_name}</p>
                    <p className="text-sm">{selectedOrder.customer_phone}</p>
                    {selectedOrder.customer_email && (
                      <p className="text-sm">{selectedOrder.customer_email}</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Creator</p>
                    <p className="font-medium">{selectedOrder.creator?.display_name}</p>
                    <p className="text-sm">@{selectedOrder.creator?.username}</p>
                  </div>
                </div>

                {/* Items */}
                <div>
                  <h4 className="font-medium mb-3">Items</h4>
                  <div className="space-y-2">
                    {selectedOrder.items?.map((item: any) => {
                      const images = getItemImages(item);
                      return (
                        <div key={item.id} className="flex items-center gap-3 p-3 border rounded-lg">
                          {images.length > 0 ? (
                            <img src={images[0]} alt="" className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-secondary flex items-center justify-center">
                              <Package className="w-5 h-5" />
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium">{item.merchandise?.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {item.size && `Size: ${item.size}`} {item.color && `• Color: ${item.color}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">KSh {Number(item.total_price).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">Qty: {item.quantity}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span>KSh {Number(selectedOrder.subtotal).toLocaleString()}</span>
                  </div>
                  {selectedOrder.shipping_fee > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Shipping</span>
                      <span>KSh {Number(selectedOrder.shipping_fee).toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span>KSh {Number(selectedOrder.total).toLocaleString()}</span>
                  </div>
                </div>

                {/* Update Status */}
                <div className="border-t pt-4">
                  <label className="text-sm font-medium mb-2 block">Update Status</label>
                  <div className="flex gap-2">
                    <Select value={newStatus || selectedOrder.status} onValueChange={(v) => setNewStatus(v as OrderStatus)}>
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="shipped">Shipped</SelectItem>
                        <SelectItem value="delivered">Delivered</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="refunded">Refunded</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={() => updateStatus.mutate({ id: selectedOrder.id, status: (newStatus || selectedOrder.status) as OrderStatus })}
                      disabled={updateStatus.isPending || (!newStatus || newStatus === selectedOrder.status)}
                    >
                      {updateStatus.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                      Update
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
};

export default AdminOrders;
