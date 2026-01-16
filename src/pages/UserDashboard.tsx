import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Heart, User, Settings, Loader2, Star, Trophy, Clock, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const UserDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isRequestOpen, setIsRequestOpen] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    display_name: '',
    bio: '',
    category_id: '',
    mpesa_phone: ''
  });

  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

  const { data: existingCreator } = useQuery({
    queryKey: ['user-creator', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('*')
        .eq('user_id', user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user
  });

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

  const { data: myDonations } = useQuery({
    queryKey: ['my-donations', user?.id],
    queryFn: async () => {
      // Get donations made by this user's phone (from profile)
      if (!profile?.phone) return [];
      const { data, error } = await supabase
        .from('donations')
        .select(`
          *,
          creator:creators(display_name, username)
        `)
        .eq('donor_phone', profile.phone)
        .order('created_at', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.phone
  });

  const createCreatorRequest = useMutation({
    mutationFn: async (data: typeof formData) => {
      // Check if username is taken
      const { data: existing } = await supabase
        .from('creators')
        .select('id')
        .eq('username', data.username)
        .maybeSingle();

      if (existing) throw new Error('Username already taken');

      const { error } = await supabase.from('creators').insert({
        user_id: user!.id,
        username: data.username.toLowerCase().replace(/\s+/g, ''),
        display_name: data.display_name,
        bio: data.bio || null,
        category_id: data.category_id || null,
        mpesa_phone: data.mpesa_phone || null,
        status: 'pending'
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-creator'] });
      toast.success('Creator request submitted! We will review it soon.');
      setIsRequestOpen(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const handleSubmit = () => {
    if (!formData.username || !formData.display_name) {
      toast.error('Username and display name are required');
      return;
    }
    createCreatorRequest.mutate(formData);
  };

  return (
    <>
      <Header />
      <main className="min-h-screen pt-24 pb-12 bg-secondary/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-display text-3xl font-bold">My Account</h1>
                <p className="text-muted-foreground">Welcome back, {profile?.full_name || user?.email}</p>
              </div>
            </div>

            {/* Creator Request Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-primary" />
                  Become a Creator
                </CardTitle>
                <CardDescription>
                  Start receiving support from your fans
                </CardDescription>
              </CardHeader>
              <CardContent>
                {existingCreator ? (
                  <div className="flex items-center gap-4 p-4 rounded-lg bg-secondary/50">
                    {existingCreator.status === 'pending' && (
                      <>
                        <Clock className="w-8 h-8 text-amber-500" />
                        <div>
                          <p className="font-medium">Application Pending</p>
                          <p className="text-sm text-muted-foreground">
                            Your creator application is under review. We'll notify you soon.
                          </p>
                        </div>
                      </>
                    )}
                    {existingCreator.status === 'approved' && (
                      <>
                        <CheckCircle className="w-8 h-8 text-green-500" />
                        <div className="flex-1">
                          <p className="font-medium">You're a Creator!</p>
                          <p className="text-sm text-muted-foreground">
                            Access your creator dashboard to manage your page.
                          </p>
                        </div>
                        <Link to="/dashboard">
                          <Button>Go to Dashboard</Button>
                        </Link>
                      </>
                    )}
                    {existingCreator.status === 'rejected' && (
                      <>
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center">
                          <span className="text-red-600">✕</span>
                        </div>
                        <div>
                          <p className="font-medium text-red-600">Application Rejected</p>
                          <p className="text-sm text-muted-foreground">
                            {existingCreator.rejection_reason || 'Your application was not approved.'}
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-muted-foreground">
                      Create your page and start receiving donations, selling merchandise, and more.
                    </p>
                    <Dialog open={isRequestOpen} onOpenChange={setIsRequestOpen}>
                      <DialogTrigger asChild>
                        <Button>Request Creator Account</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Become a Creator</DialogTitle>
                          <DialogDescription>
                            Fill out this form to request a creator account
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label>Username *</Label>
                            <Input
                              value={formData.username}
                              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                              placeholder="yourname (no spaces)"
                            />
                            <p className="text-xs text-muted-foreground">
                              Your page will be at tribeyangu.com/{formData.username || 'yourname'}
                            </p>
                          </div>
                          <div className="space-y-2">
                            <Label>Display Name *</Label>
                            <Input
                              value={formData.display_name}
                              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                              placeholder="Your Name"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>Category</Label>
                            <Select value={formData.category_id} onValueChange={(v) => setFormData({ ...formData, category_id: v })}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                              </SelectTrigger>
                              <SelectContent>
                                {categories?.map((cat) => (
                                  <SelectItem key={cat.id} value={cat.id}>
                                    {cat.icon} {cat.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Bio</Label>
                            <Textarea
                              value={formData.bio}
                              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                              placeholder="Tell us about yourself..."
                              rows={3}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>M-PESA Phone (for payouts)</Label>
                            <Input
                              value={formData.mpesa_phone}
                              onChange={(e) => setFormData({ ...formData, mpesa_phone: e.target.value })}
                              placeholder="254712345678"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => setIsRequestOpen(false)}>Cancel</Button>
                          <Button onClick={handleSubmit} disabled={createCreatorRequest.isPending}>
                            {createCreatorRequest.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Submit Request
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* My Donations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Heart className="w-5 h-5 text-primary" />
                  My Donations
                </CardTitle>
                <CardDescription>Creators you've supported</CardDescription>
              </CardHeader>
              <CardContent>
                {!myDonations || myDonations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No donations yet</p>
                    <Link to="/explore">
                      <Button variant="link">Explore creators →</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {myDonations.map((donation) => (
                      <div key={donation.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                        <div>
                          <Link to={`/${donation.creator?.username}`} className="font-medium hover:text-primary">
                            {donation.creator?.display_name}
                          </Link>
                          <p className="text-sm text-muted-foreground">@{donation.creator?.username}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">KSh {Number(donation.amount).toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">{donation.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Voting */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Awards & Voting
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground mb-4">
                  Vote for your favorite creators in our award categories
                </p>
                <Link to="/vote">
                  <Button variant="outline">View Awards →</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default UserDashboard;
