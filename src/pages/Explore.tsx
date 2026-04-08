import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Search, Users, Heart, Loader2, Star, TrendingUp, Sparkles, ArrowUpRight, Trophy } from 'lucide-react';

const Explore = () => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creator_categories')
        .select('*')
        .eq('is_active', true)
        .order('display_order');
      if (error) throw error;
      return data;
    }
  });

  const { data: creators, isLoading } = useQuery({
    queryKey: ['explore-creators', selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from('creators')
        .select(`
          *,
          category:creator_categories(name, icon)
        `)
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('total_raised', { ascending: false });

      if (selectedCategory) {
        query = query.eq('category_id', selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    }
  });

  const filteredCreators = creators?.filter(c =>
    c.display_name.toLowerCase().includes(search.toLowerCase()) ||
    c.username.toLowerCase().includes(search.toLowerCase()) ||
    c.bio?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 md:pt-24 pb-24 md:pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="w-4 h-4" />
              Featured Creators
            </div>
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Discover & Support
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Find amazing African creators and be part of their journey
            </p>
          </div>

          {/* Search & Filter */}
          <div className="max-w-4xl mx-auto mb-10">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Search creators by name, username, or bio..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12 h-14 text-base rounded-2xl bg-card border shadow-sm"
              />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                className="rounded-full"
              >
                All
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="gap-1 rounded-full"
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Results count */}
          {filteredCreators && filteredCreators.length > 0 && (
            <p className="text-sm text-muted-foreground mb-6 max-w-4xl mx-auto">
              Showing {filteredCreators.length} creator{filteredCreators.length !== 1 ? 's' : ''}
            </p>
          )}

          {/* Creators Grid */}
          {isLoading ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {[...Array(8)].map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden">
                  <div className="h-24 skeleton-pulse" />
                  <div className="p-5 space-y-3">
                    <div className="h-12 w-12 rounded-xl skeleton-pulse" />
                    <div className="h-5 w-3/4 skeleton-pulse" />
                    <div className="h-4 w-1/2 skeleton-pulse" />
                    <div className="h-10 skeleton-pulse" />
                  </div>
                </div>
              ))}
            </div>
          ) : filteredCreators?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">No featured creators found</p>
              <p className="text-sm mt-1">Try a different search or category</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators?.map((creator, i) => (
                <Link key={creator.id} to={`/${creator.username}`}>
                  <Card className="overflow-hidden group h-full hover:shadow-elevated transition-all duration-300 hover:-translate-y-1">
                    {/* Banner */}
                    <div className="h-28 bg-gradient-to-br from-primary/20 via-accent/10 to-gold/10 relative overflow-hidden">
                      {creator.banner_url && (
                        <img
                          src={creator.banner_url}
                          alt=""
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-card/60 to-transparent" />
                      <div className="absolute top-2 right-2 flex gap-1">
                        {creator.is_verified && (
                          <Badge className="bg-accent text-accent-foreground text-xs shadow-sm">✓ Verified</Badge>
                        )}
                      </div>
                    </div>

                    <CardContent className="pt-0 -mt-8 relative px-5 pb-5">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 border-4 border-card shadow-md mb-3 group-hover:shadow-lg transition-shadow">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary bg-primary/5">
                            {creator.display_name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                        {creator.display_name}
                      </h3>
                      <p className="text-sm text-muted-foreground mb-2">@{creator.username}</p>

                      {creator.category && (
                        <Badge variant="secondary" className="mb-2 text-xs rounded-full">
                          {(creator.category as any).icon} {(creator.category as any).name}
                        </Badge>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                        {creator.bio || 'No bio yet'}
                      </p>

                      <div className="flex items-center justify-between text-sm pt-3 border-t">
                        <span className="flex items-center gap-1.5 text-muted-foreground">
                          <Users className="w-4 h-4" />
                          {creator.total_supporters || 0}
                        </span>
                        <span className="flex items-center gap-1.5 font-semibold text-primary">
                          <TrendingUp className="w-4 h-4" />
                          KSh {Number(creator.total_raised || 0).toLocaleString()}
                        </span>
                      </div>
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

export default Explore;
