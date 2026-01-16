import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Ticket, Plus, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';

const CreatorEvents = () => {
  const { data: creator } = useMyCreator();

  const { data: events, isLoading } = useQuery({
    queryKey: ['creator-events', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('creator_id', creator.id)
        .order('event_date', { ascending: false });
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
            <h1 className="font-display text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground mt-1">Create and manage your events</p>
          </div>
          <Button className="gap-2" disabled>
            <Plus className="w-4 h-4" />
            Create Event
            <Badge variant="secondary" className="ml-2">Coming Soon</Badge>
          </Button>
        </div>

        <Card>
          <CardContent className="p-6">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : events?.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Ticket className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <h3 className="text-lg font-semibold mb-2">No Events Yet</h3>
                <p className="text-sm mb-4">Create your first event to start selling tickets</p>
                <Button disabled>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Event
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {events?.map((event) => (
                  <div key={event.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Ticket className="w-6 h-6 text-primary" />
                      </div>
                      <div>
                        <h3 className="font-semibold">{event.title}</h3>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {format(new Date(event.event_date), 'MMM d, yyyy')}
                          </span>
                          {event.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              {event.location}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Badge>{event.status}</Badge>
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

export default CreatorEvents;
