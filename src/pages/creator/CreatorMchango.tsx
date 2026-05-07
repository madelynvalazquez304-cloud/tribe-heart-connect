import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useMyCreator } from '@/hooks/useCreator';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Handshake, Search, Trash2, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const CreatorMchango: React.FC = () => {
  const qc = useQueryClient();
  const { data: creator } = useMyCreator();
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const { data: featured } = useQuery({
    queryKey: ['my-mchango', creator?.id],
    enabled: !!creator?.id,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('campaign_features')
        .select('id, message, campaign:campaigns(id, title, banner_url, goal_amount, current_amount, creator:creators(display_name, username, avatar_url))')
        .eq('featured_by_creator_id', creator!.id);
      if (error) throw error;
      return data || [];
    },
  });

  const { data: results } = useQuery({
    queryKey: ['mchango-search', search, creator?.id],
    enabled: search.length >= 2 && !!creator?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('id, title, description, banner_url, goal_amount, current_amount, creator:creators(display_name, username, avatar_url)')
        .eq('status', 'active')
        .neq('creator_id', creator!.id)
        .ilike('title', `%${search}%`)
        .limit(15);
      if (error) throw error;
      return data || [];
    },
  });

  const featureIt = useMutation({
    mutationFn: async (campaignId: string) => {
      const { error } = await (supabase as any).from('campaign_features').insert({
        campaign_id: campaignId,
        featured_by_creator_id: creator!.id,
        message: message || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Campaign featured on your profile! 🎉');
      setMessage('');
      qc.invalidateQueries({ queryKey: ['my-mchango'] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeIt = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('campaign_features').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries({ queryKey: ['my-mchango'] });
    },
  });

  return (
    <DashboardLayout type="creator">
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="font-display text-3xl font-bold flex items-center gap-2">
            <Handshake className="w-7 h-7 text-primary" /> Mchango
          </h1>
          <p className="text-muted-foreground mt-1">
            Amplify other creators' campaigns on your profile. Money still goes directly to the original campaign owner — you just spread the love.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-primary" />Find a campaign to feature</CardTitle>
            <CardDescription>Search by campaign title and add a personal note to your supporters.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search campaigns…" className="pl-9" />
            </div>
            <Textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={2} placeholder="Optional note: why are you supporting this?" />
            {results && results.length > 0 && (
              <div className="space-y-2">
                {results.map((c: any) => (
                  <div key={c.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    {c.banner_url && <img src={c.banner_url} alt="" className="w-12 h-12 rounded-md object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{c.title}</p>
                      <p className="text-xs text-muted-foreground">by @{c.creator?.username}</p>
                    </div>
                    <Button size="sm" onClick={() => featureIt.mutate(c.id)} disabled={featureIt.isPending}>
                      {featureIt.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Feature'}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Currently featured on your profile</CardTitle>
          </CardHeader>
          <CardContent>
            {!featured || featured.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">You haven't featured any campaigns yet.</p>
            ) : (
              <div className="space-y-3">
                {featured.map((f: any) => (
                  <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border">
                    {f.campaign?.banner_url && <img src={f.campaign.banner_url} alt="" className="w-14 h-14 rounded-md object-cover" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{f.campaign?.title}</p>
                      <p className="text-xs text-muted-foreground">by @{f.campaign?.creator?.username}</p>
                      {f.message && <p className="text-xs italic mt-1">"{f.message}"</p>}
                    </div>
                    <Badge variant="secondary">Live</Badge>
                    <Button variant="ghost" size="icon" onClick={() => removeIt.mutate(f.id)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </Button>
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

export default CreatorMchango;