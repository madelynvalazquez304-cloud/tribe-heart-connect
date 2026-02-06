import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, MapPin, Clock, Ticket, Loader2, Phone, CheckCircle2, XCircle, Users } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import PaymentProcessingModal from './PaymentProcessingModal';

interface EventsSectionProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

type PaymentStatus = 'idle' | 'processing' | 'polling' | 'success' | 'failed';

const EventsSection: React.FC<EventsSectionProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [selectedTicketType, setSelectedTicketType] = useState<string>('');
  const [quantity, setQuantity] = useState(1);
  const [buyerName, setBuyerName] = useState('');
  const [buyerPhone, setBuyerPhone] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('idle');
  const [recordId, setRecordId] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['creator-public-events', creatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          ticket_types(*)
        `)
        .eq('creator_id', creatorId)
        .in('status', ['approved', 'live'])
        .gte('event_date', new Date().toISOString())
        .order('event_date', { ascending: true })
        .limit(3);
      
      if (error) throw error;
      return data;
    },
    enabled: !!creatorId
  });

  const purchaseTicket = useMutation({
    mutationFn: async () => {
      if (!selectedTicketType || !buyerName || !buyerPhone) {
        throw new Error('Please fill all required fields');
      }

      const ticketType = selectedEvent?.ticket_types?.find((t: any) => t.id === selectedTicketType);
      if (!ticketType) throw new Error('Invalid ticket type');

      const total = ticketType.price * quantity;

      // Initiate payment via ticket_payments
      const response = await supabase.functions.invoke('mpesa-stk', {
        body: {
          phone: buyerPhone,
          amount: total,
          creatorId,
          type: 'ticket',
          ticketTypeId: selectedTicketType,
          quantity,
          donorName: buyerName
        }
      });

      if (response.error) throw new Error(response.error.message);
      if (!response.data.success) throw new Error(response.data.error);

      return response.data;
    },
    onSuccess: (data) => {
      setRecordId(data.recordId);
      setPaymentStatus('polling');
    },
    onError: (error: Error) => {
      toast.error(error.message);
      setPaymentStatus('idle');
    }
  });

  // Poll for payment status
  useEffect(() => {
    if (paymentStatus !== 'polling' || !recordId) return;

    const pollInterval = setInterval(async () => {
      const response = await supabase.functions.invoke('check-payment', {
        body: { recordId, type: 'ticket' }
      });

      if (response.data?.status === 'completed') {
        setPaymentStatus('success');
        clearInterval(pollInterval);
      } else if (response.data?.status === 'failed') {
        setPaymentStatus('failed');
        clearInterval(pollInterval);
      }
    }, 3000);

    const timeout = setTimeout(() => {
      clearInterval(pollInterval);
      if (paymentStatus === 'polling') {
        setPaymentStatus('failed');
      }
    }, 120000);

    return () => {
      clearInterval(pollInterval);
      clearTimeout(timeout);
    };
  }, [paymentStatus, recordId]);

  const handleBuyTicket = (event: any) => {
    setSelectedEvent(event);
    if (event.ticket_types?.length === 1) {
      setSelectedTicketType(event.ticket_types[0].id);
    }
  };

  const handlePurchase = () => {
    if (!selectedTicketType) {
      toast.error('Please select a ticket type');
      return;
    }
    if (!buyerName || !buyerPhone) {
      toast.error('Please fill required fields');
      return;
    }
    setPaymentStatus('processing');
    purchaseTicket.mutate();
  };

  const resetPurchase = () => {
    setSelectedEvent(null);
    setSelectedTicketType('');
    setQuantity(1);
    setBuyerName('');
    setBuyerPhone('');
    setBuyerEmail('');
    setPaymentStatus('idle');
    setRecordId('');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 flex items-center justify-center h-32">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!events || events.length === 0) {
    return null;
  }

  const selectedTicketData = selectedEvent?.ticket_types?.find((t: any) => t.id === selectedTicketType);
  const total = selectedTicketData ? selectedTicketData.price * quantity : 0;

  return (
    <>
      <Card className="overflow-hidden">
        <div className="h-1" style={{ backgroundColor: themeColor }} />
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: themeColor }} />
            <h3 className="font-semibold">Upcoming Events</h3>
          </div>

          <div className="space-y-3">
            {events.map((event) => {
              const lowestPrice = event.ticket_types?.length > 0
                ? Math.min(...event.ticket_types.map((t: any) => t.price))
                : null;
              const totalTickets = event.ticket_types?.reduce((sum: number, t: any) => 
                sum + (t.quantity_available - (t.quantity_sold || 0)), 0) || 0;

              return (
                <div 
                  key={event.id} 
                  className="p-3 rounded-xl bg-secondary/30 hover:bg-secondary/50 transition-colors"
                >
                  {event.banner_url && (
                    <img 
                      src={event.banner_url} 
                      alt={event.title}
                      className="w-full h-24 object-cover rounded-lg mb-3"
                    />
                  )}
                  
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold truncate">{event.title}</h4>
                      
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(event.event_date), 'MMM d, yyyy')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {format(new Date(event.event_date), 'h:mm a')}
                        </span>
                        {event.venue && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {event.venue}
                          </span>
                        )}
                      </div>
                    </div>

                    <Badge variant="secondary" className="shrink-0">
                      {event.status === 'live' ? '🔴 Live' : event.event_type || 'Event'}
                    </Badge>
                  </div>

                  {event.description && (
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                      {event.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between mt-3">
                    <div>
                      {lowestPrice !== null && lowestPrice > 0 ? (
                        <span className="text-sm font-semibold" style={{ color: themeColor }}>
                          From KSh {lowestPrice.toLocaleString()}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground">Free Event</span>
                      )}
                      {totalTickets > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {totalTickets} tickets left
                        </p>
                      )}
                    </div>
                    
                    <Button 
                      size="sm" 
                      className="gap-1 text-white"
                      style={{ backgroundColor: themeColor }}
                      onClick={() => handleBuyTicket(event)}
                    >
                      <Ticket className="w-3 h-3" />
                      Get Tickets
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Ticket Purchase Dialog */}
      <Dialog open={!!selectedEvent && paymentStatus === 'idle'} onOpenChange={(open) => !open && resetPurchase()}>
        <DialogContent className="max-w-md">
          {selectedEvent && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedEvent.title}</DialogTitle>
                <DialogDescription>
                  {format(new Date(selectedEvent.event_date), 'EEEE, MMMM d, yyyy • h:mm a')}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {/* Ticket Type Selection */}
                {selectedEvent.ticket_types?.length > 1 && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Select Ticket Type</label>
                    <Select value={selectedTicketType} onValueChange={setSelectedTicketType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose ticket type" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedEvent.ticket_types.map((type: any) => (
                          <SelectItem key={type.id} value={type.id}>
                            {type.name} - KSh {type.price.toLocaleString()} 
                            ({type.quantity_available - (type.quantity_sold || 0)} left)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {selectedTicketData && (
                  <>
                    {/* Quantity */}
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Quantity</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4, 5].map((q) => (
                          <Button
                            key={q}
                            variant={quantity === q ? "default" : "outline"}
                            size="sm"
                            onClick={() => setQuantity(q)}
                            disabled={q > selectedTicketData.max_per_order || q > (selectedTicketData.quantity_available - (selectedTicketData.quantity_sold || 0))}
                          >
                            {q}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Total */}
                    <div className="p-4 rounded-lg bg-secondary/50 flex justify-between items-center">
                      <div>
                        <p className="text-sm text-muted-foreground">{quantity}x {selectedTicketData.name}</p>
                        <p className="font-semibold">{selectedEvent.venue || 'Online Event'}</p>
                      </div>
                      <span className="text-xl font-bold" style={{ color: themeColor }}>
                        KSh {total.toLocaleString()}
                      </span>
                    </div>

                    <hr />

                    {/* Buyer Info */}
                    <Input
                      placeholder="Your name *"
                      value={buyerName}
                      onChange={(e) => setBuyerName(e.target.value)}
                    />
                    
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="tel"
                        placeholder="M-PESA number (07...) *"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="pl-10"
                      />
                    </div>

                    <Input
                      type="email"
                      placeholder="Email for ticket (optional)"
                      value={buyerEmail}
                      onChange={(e) => setBuyerEmail(e.target.value)}
                    />

                    <Button 
                      className="w-full gap-2 text-white"
                      style={{ backgroundColor: themeColor }}
                      onClick={handlePurchase}
                      disabled={purchaseTicket.isPending}
                    >
                      {purchaseTicket.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Ticket className="w-4 h-4" />
                      )}
                      Pay KSh {total.toLocaleString()}
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Payment Processing Modal */}
      <PaymentProcessingModal
        isOpen={paymentStatus !== 'idle'}
        status={paymentStatus}
        recordId={recordId}
        type="ticket"
        themeColor={themeColor}
        onComplete={(success) => {
          setPaymentStatus(success ? 'success' : 'failed');
        }}
        onClose={resetPurchase}
        successMessage="Your tickets have been confirmed! Check your phone for QR codes."
      />
    </>
  );
};

export default EventsSection;
