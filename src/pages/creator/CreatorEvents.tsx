import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { Loader2, Ticket, Plus, Edit, Trash2, Calendar, MapPin, Upload, Camera, Users, UserPlus, Search, Check, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';

const CreatorEvents = () => {
  const queryClient = useQueryClient();
  const { data: creator } = useMyCreator();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCollabOpen, setIsCollabOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [selectedEventForCollab, setSelectedEventForCollab] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCollaborator, setSelectedCollaborator] = useState<string>('');
  const [collabMessage, setCollabMessage] = useState('');
  const [revenueShare, setRevenueShare] = useState(50);
  
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    event_end_date: '',
    location: '',
    venue: '',
    event_type: 'concert',
    banner_url: ''
  });

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

  // Collaborations I've sent
  const { data: sentCollabs } = useQuery({
    queryKey: ['sent-collaborations', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('event_collaborations')
        .select(`
          *,
          event:events(id, title, event_date),
          invitee:creators!event_collaborations_invitee_id_fkey(id, display_name, username, avatar_url)
        `)
        .eq('inviter_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  // Collaborations I've received
  const { data: receivedCollabs } = useQuery({
    queryKey: ['received-collaborations', creator?.id],
    queryFn: async () => {
      if (!creator) return [];
      const { data, error } = await supabase
        .from('event_collaborations')
        .select(`
          *,
          event:events(id, title, event_date, banner_url),
          inviter:creators!event_collaborations_inviter_id_fkey(id, display_name, username, avatar_url)
        `)
        .eq('invitee_id', creator.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!creator
  });

  // Search creators for collaboration
  const { data: searchResults } = useQuery({
    queryKey: ['search-creators', searchQuery],
    queryFn: async () => {
      if (!searchQuery || searchQuery.length < 2) return [];
      const { data, error } = await supabase
        .from('creators')
        .select('id, display_name, username, avatar_url')
        .eq('status', 'approved')
        .neq('id', creator?.id)
        .or(`username.ilike.%${searchQuery}%,display_name.ilike.%${searchQuery}%`)
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!searchQuery && searchQuery.length >= 2
  });

  const createEvent = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase.from('events').insert({
        ...data,
        creator_id: creator?.id,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      toast.success('Event created! Pending admin approval.');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateEvent = useMutation({
    mutationFn: async ({ id, ...data }: any) => {
      const { error } = await supabase.from('events').update(data).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      toast.success('Event updated!');
      resetForm();
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('events').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['creator-events'] });
      toast.success('Event deleted');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const sendCollabInvite = useMutation({
    mutationFn: async () => {
      if (!selectedEventForCollab || !selectedCollaborator) {
        throw new Error('Please select an event and collaborator');
      }
      const { error } = await supabase.from('event_collaborations').insert({
        event_id: selectedEventForCollab.id,
        inviter_id: creator?.id,
        invitee_id: selectedCollaborator,
        revenue_share: revenueShare,
        message: collabMessage || null,
        status: 'pending'
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sent-collaborations'] });
      toast.success('Collaboration invite sent!');
      setIsCollabOpen(false);
      setSelectedCollaborator('');
      setCollabMessage('');
      setRevenueShare(50);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const respondToCollab = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'accepted' | 'rejected' }) => {
      const { error } = await supabase
        .from('event_collaborations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['received-collaborations'] });
      toast.success(status === 'accepted' ? 'Collaboration accepted!' : 'Collaboration declined');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      event_date: '',
      event_end_date: '',
      location: '',
      venue: '',
      event_type: 'concert',
      banner_url: ''
    });
    setEditingEvent(null);
    setIsDialogOpen(false);
  };

  const handleEdit = (event: any) => {
    setForm({
      title: event.title,
      description: event.description || '',
      event_date: event.event_date.slice(0, 16),
      event_end_date: event.event_end_date?.slice(0, 16) || '',
      location: event.location || '',
      venue: event.venue || '',
      event_type: event.event_type || 'concert',
      banner_url: event.banner_url || ''
    });
    setEditingEvent(event);
    setIsDialogOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      title: form.title,
      description: form.description,
      event_date: new Date(form.event_date).toISOString(),
      event_end_date: form.event_end_date ? new Date(form.event_end_date).toISOString() : null,
      location: form.location,
      venue: form.venue,
      event_type: form.event_type,
      banner_url: form.banner_url || null
    };

    if (editingEvent) {
      updateEvent.mutate({ id: editingEvent.id, ...data });
    } else {
      createEvent.mutate(data);
    }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !creator) return;

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${creator.id}/events/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('creator-assets')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('creator-assets')
        .getPublicUrl(fileName);

      setForm(prev => ({ ...prev, banner_url: publicUrl }));
      toast.success('Banner uploaded!');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
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

  const pendingReceivedCount = receivedCollabs?.filter(c => c.status === 'pending').length || 0;

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold">Events</h1>
            <p className="text-muted-foreground mt-1">Create events and invite collaborators to sell tickets together</p>
          </div>
          <div className="flex gap-2">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2" onClick={() => resetForm()}>
                  <Plus className="w-4 h-4" />
                  Create Event
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingEvent ? 'Edit Event' : 'Create New Event'}</DialogTitle>
                  <DialogDescription>
                    Events require admin approval before going live.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Form fields - same as before */}
                  <div className="space-y-2">
                    <Label>Event Title</Label>
                    <Input
                      placeholder="e.g., Live Concert"
                      value={form.title}
                      onChange={(e) => setForm(prev => ({ ...prev, title: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Tell your fans about the event..."
                      value={form.description}
                      onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Event Type</Label>
                    <Select value={form.event_type} onValueChange={(value) => setForm(prev => ({ ...prev, event_type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concert">Concert</SelectItem>
                        <SelectItem value="meetup">Meet & Greet</SelectItem>
                        <SelectItem value="workshop">Workshop</SelectItem>
                        <SelectItem value="livestream">Live Stream</SelectItem>
                        <SelectItem value="premiere">Premiere</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Start Date & Time</Label>
                      <Input
                        type="datetime-local"
                        value={form.event_date}
                        onChange={(e) => setForm(prev => ({ ...prev, event_date: e.target.value }))}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date & Time (Optional)</Label>
                      <Input
                        type="datetime-local"
                        value={form.event_end_date}
                        onChange={(e) => setForm(prev => ({ ...prev, event_end_date: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Location</Label>
                      <Input
                        placeholder="City, Country"
                        value={form.location}
                        onChange={(e) => setForm(prev => ({ ...prev, location: e.target.value }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Venue</Label>
                      <Input
                        placeholder="Venue name"
                        value={form.venue}
                        onChange={(e) => setForm(prev => ({ ...prev, venue: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Banner Image</Label>
                    <div className="flex items-center gap-4">
                      {form.banner_url ? (
                        <img src={form.banner_url} alt="Banner" className="w-32 h-20 object-cover rounded" />
                      ) : (
                        <div className="w-32 h-20 bg-secondary rounded flex items-center justify-center">
                          <Camera className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-secondary/50 transition-colors">
                          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          <span className="text-sm">{uploading ? 'Uploading...' : 'Upload'}</span>
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleBannerUpload}
                          disabled={uploading}
                        />
                      </label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={resetForm}>Cancel</Button>
                    <Button type="submit" disabled={createEvent.isPending || updateEvent.isPending}>
                      {(createEvent.isPending || updateEvent.isPending) && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      {editingEvent ? 'Update' : 'Create'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <Tabs defaultValue="events" className="space-y-4">
          <TabsList>
            <TabsTrigger value="events">My Events</TabsTrigger>
            <TabsTrigger value="collaborations" className="relative">
              Collaborations
              {pendingReceivedCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center">
                  {pendingReceivedCount}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="events">
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
                  </div>
                ) : (
                  <div className="space-y-4">
                    {events?.map((event) => (
                      <div key={event.id} className="flex items-center justify-between p-4 rounded-lg border group">
                        <div className="flex items-center gap-4">
                          {event.banner_url ? (
                            <img src={event.banner_url} alt="" className="w-16 h-16 rounded-lg object-cover" />
                          ) : (
                            <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Ticket className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold">{event.title}</h3>
                              {getStatusBadge(event.status)}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {format(new Date(event.event_date), 'MMM d, yyyy HH:mm')}
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
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="gap-1"
                            onClick={() => {
                              setSelectedEventForCollab(event);
                              setIsCollabOpen(true);
                            }}
                          >
                            <UserPlus className="w-4 h-4" />
                            Invite Collab
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(event)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive"
                            onClick={() => deleteEvent.mutate(event.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="collaborations">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Received Invitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Mail className="w-5 h-5" />
                    Invitations Received
                    {pendingReceivedCount > 0 && (
                      <Badge variant="destructive">{pendingReceivedCount} pending</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {receivedCollabs?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No collaboration invites yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {receivedCollabs?.map((collab) => (
                        <div key={collab.id} className="p-4 rounded-lg border bg-secondary/30">
                          <div className="flex items-start gap-3">
                            {collab.inviter?.avatar_url ? (
                              <img src={collab.inviter.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {collab.inviter?.display_name?.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{collab.inviter?.display_name}</p>
                              <p className="text-sm text-muted-foreground">@{collab.inviter?.username}</p>
                              <p className="text-sm mt-2">
                                <strong>{collab.event?.title}</strong>
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {collab.event?.event_date && format(new Date(collab.event.event_date), 'MMM d, yyyy')}
                              </p>
                              {collab.message && (
                                <p className="text-sm mt-2 italic text-muted-foreground">"{collab.message}"</p>
                              )}
                              <p className="text-xs mt-2">
                                Revenue share: <strong>{collab.revenue_share}%</strong>
                              </p>
                            </div>
                          </div>
                          {collab.status === 'pending' ? (
                            <div className="flex gap-2 mt-4">
                              <Button 
                                size="sm" 
                                className="flex-1 gap-1"
                                onClick={() => respondToCollab.mutate({ id: collab.id, status: 'accepted' })}
                              >
                                <Check className="w-4 h-4" />
                                Accept
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 gap-1"
                                onClick={() => respondToCollab.mutate({ id: collab.id, status: 'rejected' })}
                              >
                                <X className="w-4 h-4" />
                                Decline
                              </Button>
                            </div>
                          ) : (
                            <Badge 
                              variant={collab.status === 'accepted' ? 'default' : 'secondary'}
                              className="mt-4"
                            >
                              {collab.status}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Sent Invitations */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Invitations Sent
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {sentCollabs?.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No collaboration invites sent yet
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {sentCollabs?.map((collab) => (
                        <div key={collab.id} className="p-4 rounded-lg border">
                          <div className="flex items-start gap-3">
                            {collab.invitee?.avatar_url ? (
                              <img src={collab.invitee.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                {collab.invitee?.display_name?.charAt(0)}
                              </div>
                            )}
                            <div className="flex-1">
                              <p className="font-medium">{collab.invitee?.display_name}</p>
                              <p className="text-sm text-muted-foreground">@{collab.invitee?.username}</p>
                              <p className="text-sm mt-1 font-medium">{collab.event?.title}</p>
                            </div>
                            <Badge variant={
                              collab.status === 'accepted' ? 'default' :
                              collab.status === 'rejected' ? 'destructive' : 'secondary'
                            }>
                              {collab.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Collaboration Invite Dialog */}
      <Dialog open={isCollabOpen} onOpenChange={setIsCollabOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Invite Collaborator</DialogTitle>
            <DialogDescription>
              Search for a creator to collaborate on "{selectedEventForCollab?.title}"
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {searchResults && searchResults.length > 0 && (
              <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
                {searchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => {
                      setSelectedCollaborator(result.id);
                      setSearchQuery(result.display_name);
                    }}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-secondary/50 transition-colors ${
                      selectedCollaborator === result.id ? 'bg-primary/10' : ''
                    }`}
                  >
                    {result.avatar_url ? (
                      <img src={result.avatar_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        {result.display_name?.charAt(0)}
                      </div>
                    )}
                    <div className="text-left">
                      <p className="font-medium">{result.display_name}</p>
                      <p className="text-sm text-muted-foreground">@{result.username}</p>
                    </div>
                    {selectedCollaborator === result.id && (
                      <Check className="w-5 h-5 text-primary ml-auto" />
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="space-y-2">
              <Label>Revenue Share (%)</Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={revenueShare}
                onChange={(e) => setRevenueShare(parseInt(e.target.value) || 50)}
              />
              <p className="text-xs text-muted-foreground">
                Your partner gets {revenueShare}%, you get {100 - revenueShare}%
              </p>
            </div>

            <div className="space-y-2">
              <Label>Message (optional)</Label>
              <Textarea
                placeholder="Hey! Want to collaborate on this event?"
                value={collabMessage}
                onChange={(e) => setCollabMessage(e.target.value)}
                rows={2}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCollabOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => sendCollabInvite.mutate()}
              disabled={!selectedCollaborator || sendCollabInvite.isPending}
            >
              {sendCollabInvite.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
};

export default CreatorEvents;
