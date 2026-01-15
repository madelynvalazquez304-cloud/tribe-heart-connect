import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Heart, ArrowLeft, Loader2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const VotingPage = () => {
  const { slug } = useParams();

  const { data: awards, isLoading } = useQuery({
    queryKey: ['public-awards', slug],
    queryFn: async () => {
      let query = supabase.from('award_categories').select('*').eq('is_active', true);
      if (slug) query = query.eq('slug', slug);
      const { data, error } = await query.order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  const { data: nominees } = useQuery({
    queryKey: ['award-nominees-public', slug],
    queryFn: async () => {
      if (!slug || !awards?.length) return [];
      const awardId = awards.find(a => a.slug === slug)?.id;
      if (!awardId) return [];
      const { data, error } = await supabase
        .from('award_nominees')
        .select(`*, creator:creators(id, display_name, username, avatar_url, total_votes)`)
        .eq('award_id', awardId)
        .order('total_votes', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !!awards?.length
  });

  if (isLoading) {
    return (
      <>
        <Header />
        <div className="min-h-screen flex items-center justify-center pt-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
        <Footer />
      </>
    );
  }

  // Single award view
  if (slug && awards?.length) {
    const award = awards[0];
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Link to="/vote" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> All Awards
            </Link>
            
            <div className="text-center mb-12">
              <span className="text-5xl mb-4 block">{award.icon || '🏆'}</span>
              <h1 className="font-display text-4xl font-bold mb-2">{award.name}</h1>
              <p className="text-muted-foreground max-w-xl mx-auto">{award.description}</p>
              <Badge className="mt-4">KSh {award.vote_fee} per vote</Badge>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
              {nominees?.map((nominee, index) => (
                <Card key={nominee.id} className="hover-lift overflow-hidden">
                  <div className={`h-2 ${index === 0 ? 'bg-yellow-400' : index === 1 ? 'bg-gray-300' : index === 2 ? 'bg-amber-600' : 'bg-muted'}`} />
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold">
                        {nominee.creator?.avatar_url ? (
                          <img src={nominee.creator.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
                        ) : (
                          <span className="text-primary">{nominee.creator?.display_name?.charAt(0)}</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{nominee.creator?.display_name}</h3>
                        <p className="text-sm text-muted-foreground">@{nominee.creator?.username}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-primary" />
                        <span className="font-bold">{nominee.total_votes} votes</span>
                      </div>
                      <Link to={`/${nominee.creator?.username}`}>
                        <Button size="sm">Vote</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  // Awards list view
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Trophy className="w-16 h-16 text-primary mx-auto mb-4" />
            <h1 className="font-display text-4xl font-bold mb-2">Creator Awards</h1>
            <p className="text-muted-foreground">Support your favorite creators by voting in these awards</p>
          </div>

          {awards?.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No active awards at the moment</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {awards?.map((award) => (
                <Link key={award.id} to={`/vote/${award.slug}`}>
                  <Card className="hover-lift h-full">
                    <CardHeader>
                      <div className="text-4xl mb-2">{award.icon || '🏆'}</div>
                      <CardTitle>{award.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground text-sm mb-4">{award.description || 'Vote for your favorite!'}</p>
                      <Badge>KSh {award.vote_fee} per vote</Badge>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VotingPage;
