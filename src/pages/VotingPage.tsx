import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Users, ArrowLeft, Loader2, Vote, Crown, Medal, Star, ChevronRight, Sparkles, Clock, TrendingUp } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

const CountdownTimer = ({ endDate }: { endDate: string }) => {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    const calc = () => {
      const end = new Date(endDate).getTime();
      const now = Date.now();
      const diff = end - now;
      if (diff <= 0) { setTimeLeft('Ended'); return; }
      const d = Math.floor(diff / (1000 * 60 * 60 * 24));
      const h = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      if (d > 0) setTimeLeft(`${d}d ${h}h left`);
      else if (h > 0) setTimeLeft(`${h}h ${m}m left`);
      else setTimeLeft(`${m}m left`);
    };
    calc();
    const interval = setInterval(calc, 60000);
    return () => clearInterval(interval);
  }, [endDate]);

  return <span className="flex items-center gap-1 text-xs"><Clock className="w-3 h-3" />{timeLeft}</span>;
};

const VotingPage = () => {
  const { slug } = useParams();
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string | null>(null);

  const { data: awards, isLoading } = useQuery({
    queryKey: ['public-awards', slug],
    queryFn: async () => {
      let query = supabase.from('award_categories').select(`
        *,
        category:creator_categories(id, name, icon, slug)
      `).eq('is_active', true);
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
        .select(`*, creator:creators(id, display_name, username, avatar_url, total_votes, category:creator_categories(name, icon))`)
        .eq('award_id', awardId)
        .order('total_votes', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!slug && !!awards?.length
  });

  // Fetch real vote counts for nominees from votes table
  const { data: realVoteCounts } = useQuery({
    queryKey: ['real-vote-counts', slug],
    queryFn: async () => {
      if (!nominees?.length) return {};
      const counts: Record<string, number> = {};
      for (const n of nominees) {
        const { data } = await supabase
          .from('votes')
          .select('vote_count')
          .eq('nominee_id', n.id)
          .eq('status', 'confirmed');
        counts[n.id] = (data || []).reduce((sum, v) => sum + (v.vote_count || 0), 0);
      }
      return counts;
    },
    enabled: !!nominees?.length
  });

  const { data: categories } = useQuery({
    queryKey: ['award-creator-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    },
    enabled: !slug
  });

  const filteredAwards = selectedCategoryFilter 
    ? awards?.filter(a => a.category?.id === selectedCategoryFilter)
    : awards;

  const getVotingStatus = (award: any) => {
    const now = new Date();
    const start = award.voting_starts_at ? new Date(award.voting_starts_at) : null;
    const end = award.voting_ends_at ? new Date(award.voting_ends_at) : null;
    if (!start || !end) return { status: 'open', label: 'Open', color: 'bg-green-600' };
    if (now < start) return { status: 'upcoming', label: 'Coming Soon', color: 'bg-amber-600' };
    if (now > end) return { status: 'ended', label: 'Ended', color: 'bg-muted text-muted-foreground' };
    return { status: 'live', label: '🔴 Live', color: 'bg-red-600' };
  };

  const getVotes = (nominee: any) => {
    return realVoteCounts?.[nominee.id] ?? (nominee.total_votes || 0);
  };

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

  // Single award detail view
  if (slug && awards?.length) {
    const award = awards[0];
    const votingStatus = getVotingStatus(award);
    const totalVotes = nominees?.reduce((sum, n) => sum + getVotes(n), 0) || 0;
    const topVotes = nominees?.[0] ? getVotes(nominees[0]) : 1;
    
    return (
      <>
        <Header />
        <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-12">
          <div className="container mx-auto px-4">
            <Link to="/vote" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Awards
            </Link>
            
            {/* Award Header */}
            <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-3xl p-6 sm:p-8 md:p-12 mb-8 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-4xl sm:text-5xl mb-4 sm:mb-6 shadow-lg">
                  {award.icon || '🏆'}
                </div>
                <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">{award.name}</h1>
                <p className="text-muted-foreground max-w-xl mx-auto mb-4">{award.description}</p>
                <div className="flex items-center justify-center gap-2 sm:gap-3 flex-wrap">
                  <Badge className={`${votingStatus.color} text-white`}>{votingStatus.label}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Vote className="w-3 h-3" />
                    KSh {award.vote_fee}/vote
                  </Badge>
                  <Badge variant="secondary" className="gap-1">
                    <TrendingUp className="w-3 h-3" />
                    {totalVotes.toLocaleString()} total votes
                  </Badge>
                  {award.voting_ends_at && votingStatus.status === 'live' && (
                    <Badge variant="outline"><CountdownTimer endDate={award.voting_ends_at} /></Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Nominees */}
            <div className="mb-6">
              <h2 className="font-display text-xl sm:text-2xl font-bold mb-1 flex items-center gap-2">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                Nominees ({nominees?.length || 0})
              </h2>
              <p className="text-sm text-muted-foreground">Click on a nominee to visit their profile and cast your vote</p>
            </div>

            {nominees?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No nominees yet for this award</p>
              </div>
            ) : (
              <div className="space-y-3 max-w-3xl mx-auto">
                {nominees?.map((nominee, index) => {
                  const isTop3 = index < 3;
                  const RankIcon = index === 0 ? Crown : index === 1 ? Medal : Star;
                  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
                  const votes = getVotes(nominee);
                  const votePercent = topVotes > 0 ? (votes / topVotes) * 100 : 0;
                  
                  return (
                    <Link key={nominee.id} to={`/${nominee.creator?.username}`} className="group block">
                      <Card className={`overflow-hidden transition-all duration-300 hover:shadow-lg ${index === 0 ? 'ring-2 ring-yellow-400 ring-offset-2' : ''}`}>
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3 sm:gap-4">
                            {/* Rank */}
                            <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                              index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                              index === 1 ? 'bg-gray-100 text-gray-600' : 
                              index === 2 ? 'bg-amber-100 text-amber-700' : 
                              'bg-secondary text-muted-foreground'
                            }`}>
                              {isTop3 ? <RankIcon className={`w-4 h-4 sm:w-5 sm:h-5 ${rankColors[index]}`} /> : `#${index + 1}`}
                            </div>
                            
                            {/* Avatar */}
                            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-primary/10 overflow-hidden shrink-0 ring-2 ring-background">
                              {nominee.creator?.avatar_url ? (
                                <img src={nominee.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-lg font-bold text-primary">
                                  {nominee.creator?.display_name?.charAt(0)}
                                </div>
                              )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold truncate group-hover:text-primary transition-colors">
                                {nominee.creator?.display_name}
                              </h3>
                              <p className="text-xs text-muted-foreground">@{nominee.creator?.username}</p>
                              {/* Vote bar */}
                              <div className="mt-2">
                                <Progress value={votePercent} className="h-1.5" />
                              </div>
                            </div>

                            {/* Votes + Action */}
                            <div className="text-right shrink-0">
                              <div className="flex items-center gap-1 justify-end">
                                <Trophy className="w-4 h-4 text-primary" />
                                <span className="font-bold text-lg">{votes.toLocaleString()}</span>
                              </div>
                              <span className="text-xs text-muted-foreground">votes</span>
                            </div>

                            <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors shrink-0 hidden sm:block" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
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
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-12">
        <div className="container mx-auto px-4">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-3xl sm:text-4xl mb-4 sm:mb-6 shadow-lg">
              🏆
            </div>
            <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold mb-3">Creator Awards</h1>
            <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto">
              Support your favorite creators by voting for them in these prestigious awards
            </p>
          </div>

          {/* Category Filter */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-8">
              <Button 
                variant={selectedCategoryFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryFilter(null)}
                className="rounded-full"
              >
                All
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategoryFilter === cat.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                  className="rounded-full gap-1"
                >
                  {cat.icon} {cat.name}
                </Button>
              ))}
            </div>
          )}

          {filteredAwards?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No active awards at the moment</p>
              <p className="text-sm">Check back soon!</p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-5xl mx-auto">
              {filteredAwards?.map((award) => {
                const votingStatus = getVotingStatus(award);
                return (
                  <Link key={award.id} to={`/vote/${award.slug}`} className="group">
                    <Card className="h-full overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                      <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-2xl sm:text-3xl group-hover:scale-110 transition-transform">
                            {award.icon || '🏆'}
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <Badge className={`${votingStatus.color} text-white shrink-0`}>
                              {votingStatus.label}
                            </Badge>
                            {award.voting_ends_at && votingStatus.status === 'live' && (
                              <CountdownTimer endDate={award.voting_ends_at} />
                            )}
                          </div>
                        </div>
                        <CardTitle className="mt-3 group-hover:text-primary transition-colors text-lg">
                          {award.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {award.description || 'Vote for your favorite creator!'}
                        </p>
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="gap-1">
                            <Vote className="w-3 h-3" />
                            KSh {award.vote_fee}
                          </Badge>
                          <Button size="sm" variant="ghost" className="gap-1 group-hover:gap-2 transition-all">
                            View <ChevronRight className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          )}

          {/* How it works */}
          <div className="mt-16 sm:mt-20 max-w-4xl mx-auto">
            <h2 className="font-display text-xl sm:text-2xl font-bold text-center mb-6 sm:mb-8 flex items-center justify-center gap-2">
              <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
              How Voting Works
            </h2>
            <div className="grid sm:grid-cols-3 gap-4 sm:gap-6">
              {[
                { step: '1', title: 'Choose an Award', desc: 'Browse through award categories and find your favorite creators' },
                { step: '2', title: 'Visit Their Profile', desc: 'Click on a nominee to go to their profile page' },
                { step: '3', title: 'Cast Your Vote', desc: 'Pay via M-PESA to vote for your favorite creator' }
              ].map((item) => (
                <Card key={item.step} className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-primary/10 flex items-center justify-center text-lg sm:text-2xl mx-auto mb-3 sm:mb-4 font-bold text-primary">
                      {item.step}
                    </div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VotingPage;
