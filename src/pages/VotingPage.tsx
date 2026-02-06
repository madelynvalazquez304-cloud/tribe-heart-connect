import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Users, Heart, ArrowLeft, Loader2, Vote, Crown, Medal, Star, ChevronRight, Sparkles } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

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

  // Group awards by category for the list view
  const awardsByCategory = awards?.reduce((acc, award) => {
    const catName = award.category?.name || 'General';
    if (!acc[catName]) acc[catName] = [];
    acc[catName].push(award);
    return acc;
  }, {} as Record<string, typeof awards>);

  const filteredAwards = selectedCategoryFilter 
    ? awards?.filter(a => a.category?.id === selectedCategoryFilter)
    : awards;

  const getVotingStatus = (award: any) => {
    const now = new Date();
    const start = award.voting_starts_at ? new Date(award.voting_starts_at) : null;
    const end = award.voting_ends_at ? new Date(award.voting_ends_at) : null;

    if (!start || !end) return { status: 'open', label: 'Open', color: 'bg-green-600' };
    if (now < start) return { status: 'upcoming', label: 'Coming Soon', color: 'bg-amber-600' };
    if (now > end) return { status: 'ended', label: 'Ended', color: 'bg-secondary' };
    return { status: 'live', label: '🔴 Live', color: 'bg-red-600' };
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

  // Single award view with nominees
  if (slug && awards?.length) {
    const award = awards[0];
    const votingStatus = getVotingStatus(award);
    
    return (
      <>
        <Header />
        <main className="min-h-screen pt-24 pb-12">
          <div className="container mx-auto px-4">
            <Link to="/vote" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors">
              <ArrowLeft className="w-4 h-4" /> All Awards
            </Link>
            
            {/* Award Header */}
            <div className="relative bg-gradient-to-br from-primary/20 via-primary/10 to-background rounded-3xl p-8 md:p-12 mb-12 overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="relative z-10 text-center">
                <div className="inline-flex items-center justify-center w-24 h-24 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-5xl mb-6 shadow-lg">
                  {award.icon || '🏆'}
                </div>
                <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">{award.name}</h1>
                <p className="text-muted-foreground max-w-xl mx-auto mb-6">{award.description}</p>
                <div className="flex items-center justify-center gap-3 flex-wrap">
                  <Badge className={`${votingStatus.color} text-white`}>{votingStatus.label}</Badge>
                  <Badge variant="outline" className="gap-1">
                    <Vote className="w-3 h-3" />
                    KSh {award.vote_fee} per vote
                  </Badge>
                  {award.category && (
                    <Badge variant="secondary" className="gap-1">
                      {award.category.icon} {award.category.name}
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Nominees */}
            <div className="mb-8">
              <h2 className="font-display text-2xl font-bold mb-2 flex items-center gap-2">
                <Users className="w-6 h-6 text-primary" />
                Nominees ({nominees?.length || 0})
              </h2>
              <p className="text-muted-foreground">Click on a nominee to visit their profile and cast your vote</p>
            </div>

            {nominees?.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-16 h-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No nominees yet for this award</p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {nominees?.map((nominee, index) => {
                  const isTop3 = index < 3;
                  const RankIcon = index === 0 ? Crown : index === 1 ? Medal : Star;
                  const rankColors = ['text-yellow-500', 'text-gray-400', 'text-amber-600'];
                  
                  return (
                    <Link key={nominee.id} to={`/${nominee.creator?.username}`} className="group">
                      <Card className={`hover-lift overflow-hidden transition-all duration-300 ${isTop3 ? 'ring-2 ring-offset-2' : ''} ${index === 0 ? 'ring-yellow-400' : index === 1 ? 'ring-gray-300' : index === 2 ? 'ring-amber-500' : ''}`}>
                        <div className={`h-1.5 ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' : index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-400' : index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-700' : 'bg-muted'}`} />
                        <CardContent className="pt-6">
                          <div className="flex items-start gap-4 mb-4">
                            <div className="relative">
                              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold overflow-hidden ring-2 ring-background shadow-md">
                                {nominee.creator?.avatar_url ? (
                                  <img src={nominee.creator.avatar_url} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <span className="text-primary">{nominee.creator?.display_name?.charAt(0)}</span>
                                )}
                              </div>
                              {isTop3 && (
                                <div className={`absolute -top-1 -right-1 w-6 h-6 rounded-full bg-background shadow flex items-center justify-center`}>
                                  <RankIcon className={`w-4 h-4 ${rankColors[index]}`} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-lg truncate group-hover:text-primary transition-colors">
                                {nominee.creator?.display_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">@{nominee.creator?.username}</p>
                              {nominee.creator?.category && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {nominee.creator.category.icon} {nominee.creator.category.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-4 border-t">
                            <div className="flex items-center gap-2">
                              <Trophy className="w-5 h-5 text-primary" />
                              <span className="font-bold text-lg">{nominee.total_votes?.toLocaleString() || 0}</span>
                              <span className="text-muted-foreground text-sm">votes</span>
                            </div>
                            <Button size="sm" className="gap-1 group-hover:gap-2 transition-all">
                              Vote <ChevronRight className="w-4 h-4" />
                            </Button>
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

  // Awards list view with category filtering
  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-primary/60 text-4xl mb-6 shadow-lg">
              🏆
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-3">Creator Awards</h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Support your favorite creators by voting for them in these prestigious awards
            </p>
          </div>

          {/* Category Filter */}
          {categories && categories.length > 0 && (
            <div className="flex flex-wrap justify-center gap-2 mb-10">
              <Button 
                variant={selectedCategoryFilter === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategoryFilter(null)}
                className="rounded-full"
              >
                All Categories
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
              <p className="text-sm">Check back soon for exciting voting opportunities!</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {filteredAwards?.map((award) => {
                const votingStatus = getVotingStatus(award);
                return (
                  <Link key={award.id} to={`/vote/${award.slug}`} className="group">
                    <Card className="hover-lift h-full overflow-hidden transition-all duration-300 hover:shadow-xl">
                      <div className="h-1.5 bg-gradient-to-r from-primary to-primary/60" />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-4">
                          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform">
                            {award.icon || '🏆'}
                          </div>
                          <Badge className={`${votingStatus.color} text-white shrink-0`}>
                            {votingStatus.label}
                          </Badge>
                        </div>
                        <CardTitle className="mt-3 group-hover:text-primary transition-colors">
                          {award.name}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                          {award.description || 'Vote for your favorite creator in this category!'}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="gap-1">
                              <Vote className="w-3 h-3" />
                              KSh {award.vote_fee}
                            </Badge>
                            {award.category && (
                              <Badge variant="secondary" className="gap-1 text-xs">
                                {award.category.icon}
                              </Badge>
                            )}
                          </div>
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
          <div className="mt-20 max-w-4xl mx-auto">
            <h2 className="font-display text-2xl font-bold text-center mb-8 flex items-center justify-center gap-2">
              <Sparkles className="w-6 h-6 text-primary" />
              How Voting Works
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-4">
                    1️⃣
                  </div>
                  <h3 className="font-semibold mb-2">Choose an Award</h3>
                  <p className="text-sm text-muted-foreground">Browse through award categories and find your favorite creators</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-4">
                    2️⃣
                  </div>
                  <h3 className="font-semibold mb-2">Visit Their Profile</h3>
                  <p className="text-sm text-muted-foreground">Click on a nominee to go to their profile page</p>
                </CardContent>
              </Card>
              <Card className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl mx-auto mb-4">
                    3️⃣
                  </div>
                  <h3 className="font-semibold mb-2">Cast Your Vote</h3>
                  <p className="text-sm text-muted-foreground">Pay via M-PESA to vote for your favorite creator</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default VotingPage;
