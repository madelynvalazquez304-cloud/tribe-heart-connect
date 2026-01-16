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
import { Search, Users, Heart, Loader2, Filter } from 'lucide-react';

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
      <main className="min-h-screen pt-24 pb-12">
        <div className="container mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">
              Explore Creators
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Discover amazing African creators and support their journey
            </p>
          </div>

          {/* Search & Filter */}
          <div className="max-w-4xl mx-auto mb-8">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  placeholder="Search creators..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 h-12"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant={selectedCategory === null ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                All
              </Button>
              {categories?.map((cat) => (
                <Button
                  key={cat.id}
                  variant={selectedCategory === cat.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(cat.id)}
                  className="gap-1"
                >
                  {cat.icon && <span>{cat.icon}</span>}
                  {cat.name}
                </Button>
              ))}
            </div>
          </div>

          {/* Creators Grid */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCreators?.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No creators found</p>
              <p className="text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCreators?.map((creator) => (
                <Link key={creator.id} to={`/${creator.username}`}>
                  <Card className="hover-lift overflow-hidden group h-full">
                    {/* Banner */}
                    <div className="h-24 bg-gradient-to-r from-primary/20 to-primary/5 relative">
                      {creator.banner_url && (
                        <img
                          src={creator.banner_url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>

                    <CardContent className="pt-0 -mt-8 relative">
                      {/* Avatar */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-primary/10 border-4 border-background mb-3">
                        {creator.avatar_url ? (
                          <img
                            src={creator.avatar_url}
                            alt={creator.display_name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary">
                            {creator.display_name.charAt(0)}
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                            {creator.display_name}
                          </h3>
                          <p className="text-sm text-muted-foreground">@{creator.username}</p>
                        </div>
                        {creator.is_verified && (
                          <Badge className="bg-blue-500 text-xs">✓</Badge>
                        )}
                      </div>

                      {creator.category && (
                        <Badge variant="secondary" className="mb-2 text-xs">
                          {creator.category.icon} {creator.category.name}
                        </Badge>
                      )}

                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {creator.bio || 'No bio yet'}
                      </p>

                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {creator.total_supporters || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
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
