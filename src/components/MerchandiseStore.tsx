import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

import { ShoppingBag, Plus, Minus, Loader2, Phone, Package, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';
import PaymentProcessingModal, { PaymentStatus } from './PaymentProcessingModal';

interface MerchandiseStoreProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

const MerchandiseStore: React.FC<MerchandiseStoreProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [imageIndex, setImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [orderId, setOrderId] = useState('');

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
      if (!selectedProduct || !customerName.trim() || !customerPhone.trim()) {
        throw new Error('Please fill all required fields');
      }
      if (!/^(?:254|0)\d{9}$/.test(customerPhone.replace(/\s/g, ''))) {
        throw new Error('Enter a valid M-PESA number');
      }
      
      const sizes = getArray(selectedProduct.sizes);
      if (sizes.length > 0 && !selectedSize) {
        throw new Error('Please select a size');
      }
      const colors = getArray(selectedProduct.colors);
      if (colors.length > 0 && !selectedColor) {
        throw new Error('Please select a color');
      }

      // Check stock
      if (selectedProduct.stock !== null && selectedProduct.stock < quantity) {
        throw new Error(`Only ${selectedProduct.stock} items available`);
      }

      const total = selectedProduct.price * quantity;
      
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          creator_id: creatorId,
          customer_name: customerName.trim(),
          customer_phone: customerPhone.replace(/\s/g, ''),
          customer_email: customerEmail.trim() || null,
          subtotal: total,
          total: total,
          status: 'pending'
        })
        .select()
        .single();
      
      if (orderError) throw orderError;

      const { error: itemError } = await supabase.from('order_items').insert({
        order_id: order.id,
        merchandise_id: selectedProduct.id,
        quantity,
        unit_price: selectedProduct.price,
        total_price: total,
        size: selectedSize || null,
        color: selectedColor || null
      });

      if (itemError) throw itemError;

      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: customerPhone.replace(/\s/g, ''),
          amount: total,
          creatorId,
          type: 'merchandise',
          orderId: order.id
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);
      return { ...response.data, orderId: order.id };
    },
    onSuccess: (data) => {
      setOrderId(data.orderId);
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  const resetOrder = () => {
    if (paymentStatus === 'success') {
      setSelectedProduct(null);
      setQuantity(1);
      setSelectedSize('');
      setSelectedColor('');
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
    }
    setPaymentStatus('idle');
    setOrderId('');
    setImageIndex(0);
  };

  const getArray = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val as string[];
    return [];
  };

  const openProduct = (product: any) => {
    setSelectedProduct(product);
    setImageIndex(0);
    setQuantity(1);
    setSelectedSize('');
    setSelectedColor('');
  };

  if (isLoading || !merchandise || merchandise.length === 0) return null;

  const total = selectedProduct ? selectedProduct.price * quantity : 0;

  return (
    <Card className="overflow-hidden">
      <div className="h-1" style={{ backgroundColor: themeColor }} />
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingBag className="w-5 h-5" style={{ color: themeColor }} />
          <h3 className="font-semibold">Store</h3>
          <Badge variant="secondary">{merchandise.length} item{merchandise.length !== 1 ? 's' : ''}</Badge>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {merchandise.map((product) => {
            const images = getArray(product.images);
            const outOfStock = product.stock !== null && product.stock <= 0;
            return (
              <div 
                key={product.id} 
                className={`rounded-lg border overflow-hidden cursor-pointer hover:shadow-lg transition-all group relative ${outOfStock ? 'opacity-60' : ''}`}
                onClick={() => !outOfStock && openProduct(product)}
              >
                <div className="aspect-square bg-secondary/50 relative overflow-hidden">
                  {images.length > 0 ? (
                    <img 
                      src={images[0]} 
                      alt={product.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/30" />
                    </div>
                  )}
                  {outOfStock && (
                    <div className="absolute inset-0 bg-background/60 flex items-center justify-center">
                      <Badge variant="destructive">Sold Out</Badge>
                    </div>
                  )}
                  {product.stock !== null && product.stock > 0 && product.stock <= 5 && (
                    <Badge className="absolute top-2 right-2 bg-amber-600 text-white text-[10px]">
                      {product.stock} left
                    </Badge>
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
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto p-0">
          {selectedProduct && (() => {
            const images = getArray(selectedProduct.images);
            const sizes = getArray(selectedProduct.sizes);
            const colors = getArray(selectedProduct.colors);
            const maxQty = selectedProduct.stock !== null ? Math.min(selectedProduct.stock, 10) : 10;
            
            return (
              <>
                {/* Image carousel */}
                {images.length > 0 && (
                  <div className="relative aspect-square bg-secondary">
                    <img 
                      src={images[imageIndex]} 
                      alt={selectedProduct.name}
                      className="w-full h-full object-cover"
                    />
                    {images.length > 1 && (
                      <>
                        <button 
                          onClick={() => setImageIndex(i => (i - 1 + images.length) % images.length)}
                          className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center shadow"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setImageIndex(i => (i + 1) % images.length)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-background/80 flex items-center justify-center shadow"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                          {images.map((_: string, i: number) => (
                            <button
                              key={i}
                              onClick={() => setImageIndex(i)}
                              className={`w-2 h-2 rounded-full transition-all ${i === imageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                            />
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="p-5 space-y-4">
                  <DialogHeader className="text-left">
                    <DialogTitle className="text-xl">{selectedProduct.name}</DialogTitle>
                    <DialogDescription>From {creatorName}'s Store</DialogDescription>
                  </DialogHeader>

                  {selectedProduct.description && (
                    <p className="text-sm text-muted-foreground">{selectedProduct.description}</p>
                  )}

                  <div className="text-2xl font-bold" style={{ color: themeColor }}>
                    KSh {Number(selectedProduct.price).toLocaleString()}
                  </div>

                  {/* Stock indicator */}
                  {selectedProduct.stock !== null && (
                    <div className="flex items-center gap-2 text-sm">
                      {selectedProduct.stock <= 5 ? (
                        <><AlertCircle className="w-4 h-4 text-amber-500" /><span className="text-amber-600">Only {selectedProduct.stock} left in stock</span></>
                      ) : (
                        <><Package className="w-4 h-4 text-green-500" /><span className="text-green-600">In stock</span></>
                      )}
                    </div>
                  )}

                  {/* Size Selection */}
                  {sizes.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Size <span className="text-destructive">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {sizes.map((size) => (
                          <button
                            key={size}
                            onClick={() => setSelectedSize(size)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              selectedSize === size 
                                ? 'border-primary bg-primary text-primary-foreground' 
                                : 'hover:bg-secondary'
                            }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Color Selection */}
                  {colors.length > 0 && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Color <span className="text-destructive">*</span></label>
                      <div className="flex flex-wrap gap-2">
                        {colors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setSelectedColor(color)}
                            className={`px-4 py-2 rounded-lg border text-sm font-medium transition-all ${
                              selectedColor === color 
                                ? 'border-primary bg-primary text-primary-foreground' 
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
                        className="h-9 w-9"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity <= 1}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="w-8 text-center font-semibold text-lg">{quantity}</span>
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="h-9 w-9"
                        onClick={() => setQuantity(Math.min(maxQty, quantity + 1))}
                        disabled={quantity >= maxQty}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
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

                  {/* Total + Buy */}
                  <div className="p-4 rounded-lg bg-secondary/50 flex justify-between items-center">
                    <div>
                      <span className="text-sm text-muted-foreground">{quantity} × KSh {Number(selectedProduct.price).toLocaleString()}</span>
                      <p className="text-xl font-bold" style={{ color: themeColor }}>
                        KSh {total.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <Button 
                    className="w-full gap-2 text-white h-12 text-base"
                    style={{ backgroundColor: themeColor }}
                    onClick={() => {
                      setPaymentStatus('processing');
                      placeOrder.mutate();
                    }}
                    disabled={placeOrder.isPending || !customerName.trim() || !customerPhone.trim()}
                  >
                    {placeOrder.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <ShoppingBag className="w-4 h-4" />
                    )}
                    Buy Now — KSh {total.toLocaleString()}
                  </Button>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      <PaymentProcessingModal
        isOpen={paymentStatus !== 'idle'}
        status={paymentStatus}
        recordId={orderId}
        type="merchandise"
        themeColor={themeColor}
        amount={total}
        onComplete={(success) => setPaymentStatus(success ? 'success' : 'failed')}
        onClose={resetOrder}
        successMessage="Your order has been placed! You'll receive a confirmation shortly."
      />
    </Card>
  );
};

export default MerchandiseStore;
