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
import { Search, Check, X, Loader2, Ticket, Calendar, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

type EventStatus = 'draft' | 'pending' | 'approved' | 'live' | 'ended' | 'cancelled';

const AdminEvents = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: events, isLoading } = useQuery({
    queryKey: ['admin-events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: EventStatus }) => {
      const { error } = await supabase
        .from('events')
        .update({ status })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-events'] });
      toast.success('Event status updated');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const filteredEvents = events?.filter(e =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.creator?.display_name?.toLowerCase().includes(search.toLowerCase())
  );

  const byStatus = (status: EventStatus) => filteredEvents?.filter(e => e.status === status) || [];
  const pendingEvents = filteredEvents?.filter(e => e.status === 'pending') || [];
  const activeEvents = filteredEvents?.filter(e => e.status === 'approved' || e.status === 'live') || [];

  const getStatusBadge = (status: EventStatus) => {
    const variants: Record<EventStatus, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
      draft: { variant: 'secondary', className: '' },
      pending: { variant: 'outline', className: 'text-amber-600 border-amber-600' },
      approved: { variant: 'default', className: 'bg-blue-600' },
      live: { variant: 'default', className: 'bg-green-600' },
      ended: { variant: 'secondary', className: '' },
      cancelled: { variant: 'destructive', className: '' }
    };
    const v = variants[status] || variants.draft;
    return <Badge variant={v.variant} className={v.className}>{status}</Badge>;
  };

  return (
    <DashboardLayout type="admin">
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Events</h1>
          <p className="text-muted-foreground mt-1">Review and approve creator events</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pending Approval</p>
                  <p className="text-2xl font-bold text-amber-600">{pendingEvents.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-amber-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Events</p>
                  <p className="text-2xl font-bold text-green-600">{activeEvents.length}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{events?.length || 0}</p>
                </div>
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Ticket className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search events..."
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
              {pendingEvents.length > 0 && (
                <Badge variant="secondary">{pendingEvents.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
            <TabsTrigger value="live">Live</TabsTrigger>
            <TabsTrigger value="ended">Ended</TabsTrigger>
          </TabsList>

          {(['pending', 'approved', 'live', 'ended'] as EventStatus[]).map((status) => (
            <TabsContent key={status} value={status}>
              <Card>
                <CardContent className="p-0">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : byStatus(status).length === 0 ? (
                    <div className="text-center py-12 text-muted-foreground">
                      <Ticket className="w-12 h-12 mx-auto mb-4 opacity-20" />
                      <p>No {status} events</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Event</TableHead>
                          <TableHead>Creator</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {byStatus(status).map((event) => (
                          <TableRow key={event.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {event.banner_url ? (
                                  <img src={event.banner_url} alt="" className="w-12 h-12 rounded object-cover" />
                                ) : (
                                  <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center">
                                    <Ticket className="w-5 h-5 text-primary" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{event.title}</p>
                                  <p className="text-xs text-muted-foreground">{event.event_type}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{event.creator?.display_name}</p>
                                <p className="text-xs text-muted-foreground">@{event.creator?.username}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.event_date), 'MMM d, yyyy')}
                              </div>
                            </TableCell>
                            <TableCell>
                              {event.location && (
                                <div className="flex items-center gap-1 text-sm">
                                  <MapPin className="w-3 h-3" />
                                  {event.location}
                                </div>
                              )}
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(event.status)}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {status === 'pending' && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                      onClick={() => updateStatus.mutate({ id: event.id, status: 'approved' })}
                                    >
                                      <Check className="w-4 h-4 mr-1" />
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="text-destructive"
                                      onClick={() => updateStatus.mutate({ id: event.id, status: 'cancelled' })}
                                    >
                                      <X className="w-4 h-4 mr-1" />
                                      Reject
                                    </Button>
                                  </>
                                )}
                                {status === 'approved' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-green-600"
                                    onClick={() => updateStatus.mutate({ id: event.id, status: 'live' })}
                                  >
                                    Set Live
                                  </Button>
                                )}
                                {status === 'live' && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => updateStatus.mutate({ id: event.id, status: 'ended' })}
                                  >
                                    End Event
                                  </Button>
                                )}
                              </div>
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

export default AdminEvents;
