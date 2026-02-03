import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, MapPin, Clock, Ticket, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface EventsSectionProps {
  creatorId: string;
  creatorName: string;
  themeColor?: string;
}

const EventsSection: React.FC<EventsSectionProps> = ({ creatorId, creatorName, themeColor = '#E07B4C' }) => {
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

  return (
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
                  {lowestPrice !== null ? (
                    <span className="text-sm font-semibold" style={{ color: themeColor }}>
                      From KSh {lowestPrice.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Free Event</span>
                  )}
                  
                  <Button 
                    size="sm" 
                    className="gap-1 text-white"
                    style={{ backgroundColor: themeColor }}
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
  );
};

export default EventsSection;
