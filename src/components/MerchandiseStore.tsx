import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, Plus, Minus, Loader2, Phone, CheckCircle2, XCircle, Package } from 'lucide-react';
import { toast } from 'sonner';

interface MerchandiseStoreProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const MerchandiseStore: React.FC<MerchandiseStoreProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');

  const { data: merchandise, isLoading } = useQuery({
    queryKey: ['public-merchandise', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('merchandise')
        .select('*')
        .eq('creator_id', creatorId)
        .eq('is_active', true)
        .eq('is_approved', true)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId
  });

  const placeOrder = useMutation({
    mutationFn: async () => {
      if (!selectedProduct || !customerName || !customerPhone) {
        throw new Error('Please fill all required fields');
      }

      const total = selectedProduct.price * quantity;
      
      // Create order first
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          creator_id: creatorId,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: customerEmail || null,
          subtotal: total,
          total: total,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      // Add order items
      await supabase.from('order_items').insert({
        order_id: order.id,
        merchandise_id: selectedProduct.id,
        quantity,
        unit_price: selectedProduct.price,
        total_price: total,
        size: selectedSize || null,
        color: selectedColor || null
      });

      // Initiate payment
      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: customerPhone,
          amount: total,
          creatorId,
          type: 'order',
          orderId: order.id
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return { ...response.data, orderId: order.id };
    },
    onSuccess: (data) => {
      setPaymentStatus('polling');
      
      const pollInterval = setInterval(async () => {
        const response = await supabase.functions.invoke('check-payment', {
          body: { recordId: data.recordId, type: 'order' }
        });

        if (response.data?.status === 'completed') {
          setPaymentStatus('success');
          clearInterval(pollInterval);
        } else if (response.data?.status === 'failed') {
          setPaymentStatus('failed');
          clearInterval(pollInterval);
        }
      }, 3000);

      setTimeout(() => {
        clearInterval(pollInterval);
        if (paymentStatus === 'polling') {
          setPaymentStatus('failed');
        }
      }, 120000);
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  const resetOrder = () => {
    setPaymentStatus('idle');
    if (paymentStatus === 'success') {
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedSize('');
      setSelectedColor('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    }
  };

  const getImages = (product: any): string[] => {
    if (!product.images) return [];
    return product.images as string[];
  };

  const getSizes = (product: any): string[] => {
    if (!product.sizes) return [];
    return product.sizes as string[];
  };

  const getColors = (product: any): string[] => {
    if (!product.colors) return [];
    return product.colors as string[];
  };

  if (isLoading || !merchandise || merchandise.length === 0) return null;

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: themeColor }} />
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5" style={{ color: themeColor }} />
          <h3 className="font-semibold">Store</h3>
          <Badge variant="secondary">{merchandise.length} items</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {merchandise.map((product) => {
            const images = getImages(product);
            return (
              <div 
                key={product.id} 
                className="rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg transition-shadow group"
                onClick={() => setSelectedProduct(product)}
              >
                <div className="aspect-square bg-secondary/50 relative overflow-hidden">
                  {images.length > 0 ? (
                    <img 
                      src={images[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm truncate">{product.name}</h4>
                  <p className="font-bold" style={{ color: themeColor }}>
                    KSh {Number(product.price).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>

      {/* Product Detail Dialog */}
      <Dialog open={!!selectedProduct && paymentStatus === 'idle'} onOpenChange={(open) => !open && setSelectedProduct(null)}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          {selectedProduct && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedProduct.name}</DialogTitle>
                <DialogDescription>
                  From {creatorName}'s Store
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Product Image */}
                {getImages(selectedProduct).length > 0 && (
                  <div className="rounded-lg overflow-hidden">
                    <img 
                      src={getImages(selectedProduct)[0]} 
                      alt={selectedProduct.name}
                      className="w-full aspect-square object-cover"
                    />
                  </div>
                )}

                {/* Description */}
                {selectedProduct.description && (
                  <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                )}

                {/* Price */}
                <div className="text-2xl font-bold" style={{ color: themeColor }}>
                  KSh {Number(selectedProduct.price).toLocaleString()}
                </div>

                {/* Size Selection */}
                {getSizes(selectedProduct).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Size</label>
                    <Select value={selectedSize} onValueChange={setSelectedSize}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select size" />
                      </SelectTrigger>
                      <SelectContent>
                        {getSizes(selectedProduct).map((size) => (
                          <SelectItem key={size} value={size}>{size}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Color Selection */}
                {getColors(selectedProduct).length > 0 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Color</label>
                    <div className="flex gap-2">
                      {getColors(selectedProduct).map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`px-3 py-1 rounded-lg border text-sm transition-all ${
                            selectedColor === color 
                              ? 'border-primary bg-primary/10 text-primary font-medium' 
                              : 'hover:bg-secondary'
                          }`}
                        >
                          {color}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Quantity */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Quantity</span>
                  <div className="flex items-center gap-3">
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                    <span className="w-8 text-center font-semibold">{quantity}</span>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={() => setQuantity(quantity + 1)}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {/* Total */}
                <div className="p-3 rounded-lg bg-secondary/50 flex justify-between items-center">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold" style={{ color: themeColor }}>
                    KSh {(selectedProduct.price * quantity).toLocaleString()}
                  </span>
                </div>

                <hr />

                {/* Customer Info */}
                <Input
                  placeholder="Your name *"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
                
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="tel"
                    placeholder="M-PESA number (07...) *"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <Input
                  type="email"
                  placeholder="Email (optional)"
                  value={customerEmail}
                  onChange={(e) => setCustomerEmail(e.target.value)}
                />

                <Button 
                  className="w-full gap-2 text-white"
                  style={{ backgroundColor: themeColor }}
                  onClick={() => {
                    if (!customerName || !customerPhone) {
                      toast.error('Please fill required fields');
                      return;
                    }
                    setPaymentStatus('processing');
                    placeOrder.mutate();
                  }}
                  disabled={placeOrder.isPending}
                >
                  {placeOrder.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShoppingBag className="w-4 h-4" />
                  )}
                  Buy Now - KSh {(selectedProduct.price * quantity).toLocaleString()}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Status Dialog */}
      <Dialog open={paymentStatus !== 'idle' && paymentStatus !== 'processing'} onOpenChange={() => resetOrder()}>
        <DialogContent>
          <div className="py-8 text-center">
            {paymentStatus === 'polling' && (
              <>
                <Loader2 className="w-16 h-16 mx-auto mb-4 animate-spin" style={{ color: themeColor }} />
                <p className="text-muted-foreground">Check your phone for M-PESA prompt</p>
              </>
            )}
            {paymentStatus === 'success' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <CheckCircle2 className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Order Placed!</h3>
                <p className="text-muted-foreground">You'll receive a confirmation shortly</p>
              </>
            )}
            {paymentStatus === 'failed' && (
              <>
                <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="w-12 h-12 text-red-600" />
                </div>
                <h3 className="text-xl font-bold mb-2">Payment Failed</h3>
                <p className="text-muted-foreground">Please try again</p>
              </>
            )}
          </div>
          {(paymentStatus === 'success' || paymentStatus === 'failed') && (
            <Button onClick={resetOrder} className="w-full">
              {paymentStatus === 'success' ? 'Continue Shopping' : 'Try Again'}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default MerchandiseStore;
