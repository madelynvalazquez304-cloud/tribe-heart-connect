import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
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
import { Loader2, Package, Truck, CheckCircle, ShoppingCart, Info } from 'lucide-react';
import { format } from 'date-fns';
import { Alert, AlertDescription } from '@/components/ui/alert';

type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';

const CreatorOrders = () => {
  const { data: creator } = useMyCreator();

  const { data: orders, isLoading } = useQuery({
    queryKey: ['creator-orders', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          items:order_items(
            *,
            merchandise:merchandise(name, images)
          )
        `)
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  const byStatus = (status: OrderStatus | 'all') => {
    if (status === 'all') return orders || [];
    return orders?.filter(o => o.status === status) || [];
  };

  const getStatusBadge = (status: OrderStatus) => {
    const config: Record<OrderStatus, { variant: 'default' | 'secondary' | 'destructive' | 'outline'; className: string }> = {
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      processing: { variant: 'default', className: 'bg-blue-600' },
      shipped: { variant: 'default', className: 'bg-purple-600' },
      delivered: { variant: 'default', className: 'bg-green-600' },
      cancelled: { variant: 'destructive', className: '' },
      refunded: { variant: 'secondary', className: '' }
    };
    return <Badge variant={config[status].variant} className={config[status].className}>{status}</Badge>;
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
    totalEarnings: orders?.filter(o => o.status === 'delivered').reduce((sum, o) => sum + Number(o.creator_amount || 0), 0) || 0
  };

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">View your merchandise orders</p>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            TribeYangu fulfills orders on your behalf. You'll receive your earnings after orders are delivered.
          </AlertDescription>
        </Alert>

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
                  <p className="text-sm text-muted-foreground">Earnings</p>
                  <p className="text-xl font-bold text-green-600">KSh {stats.totalEarnings.toLocaleString()}</p>
                </div>
                <ShoppingCart className="w-8 h-8 text-primary/30" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">All ({orders?.length || 0})</TabsTrigger>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="shipped">Shipped</TabsTrigger>
            <TabsTrigger value="delivered">Delivered</TabsTrigger>
          </TabsList>

          {(['all', 'pending', 'shipped', 'delivered'] as const).map((status) => (
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
                      <p>No orders yet</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order #</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Items</TableHead>
                          <TableHead>Your Earnings</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.order_number || order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{order.customer_name}</p>
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
                              </div>
                            </TableCell>
                            <TableCell className="font-semibold text-green-600">
                              KSh {Number(order.creator_amount || 0).toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {format(new Date(order.created_at), 'MMM d, yyyy')}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
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

export default CreatorOrders;
