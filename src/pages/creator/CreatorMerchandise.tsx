import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, ShoppingBag, Plus } from 'lucide-react';

const CreatorMerchandise = () => {
  const { data: creator } = useMyCreator();

  const { data: merchandise, isLoading } = useQuery({
    queryKey: ['creator-merchandise', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('creator_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Merchandise</h1>
            <p className="text-muted-foreground mt-1">Create and sell your branded merchandise</p>
          </div>
          <Button className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            Add Product
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : merchandise?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Products Yet</h3>
                <p className="text-sm mb-4">Start selling merchandise to your fans</p>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="grid md:grid-cols-3 gap-4">
                {merchandise?.map((item) => (
                  <div key={item.id} className="rounded-lg border overflow-hidden">
                    <div className="aspect-square bg-secondary/50 flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                    </div>
                    <div className="p-4">
                      <h3 className="font-semibold">{item.name}</h3>
                      <p className="text-primary font-bold">KSh {Number(item.price).toLocaleString()}</p>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-sm text-muted-foreground">Stock: {item.stock}</span>
                        <Badge variant={item.is_active ? 'default' : 'secondary'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default CreatorMerchandise;
