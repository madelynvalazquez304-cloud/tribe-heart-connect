import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, Users, ShoppingBag, Ticket, ArrowRight, Sparkles, Shield, Zap, Trophy, Play, Star, TrendingUp, CheckCircle, Globe } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.jpg";
import creator1 from "@/assets/creator-1.jpg";
import creator2 from "@/assets/creator-2.jpg";
import creator3 from "@/assets/creator-3.jpg";

const HeroSection = () => {
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data: creators } = await supabase.from('creators').select('id', { count: 'exact' }).eq('status', 'approved');
      const { data: raised } = await supabase.from('transactions').select('net_amount').eq('status', 'completed');
      const totalRaised = raised?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      return { creators: creators?.length || 0, raised: totalRaised };
    }
  });

  return (
    <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
      {/* Dark gradient hero background */}
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-gold/10 rounded-full blur-[80px]" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-primary/15 text-primary-foreground/90 border border-primary/20 px-5 py-2.5 rounded-full text-sm font-medium animate-slide-up backdrop-blur-sm">
              <Sparkles className="w-4 h-4 text-gold" />
              The #1 Platform for African Creators
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-extrabold text-white leading-[1.1] animate-slide-up tracking-tight">
              Monetize Your{" "}
              <span className="text-gradient">Passion</span>,<br />
              Build Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-sage-light">Tribe</span>
            </h1>
            <p className="text-lg md:text-xl text-white/70 max-w-lg leading-relaxed animate-slide-up">
              Accept M-PESA donations, sell merchandise, host ticketed events, and grow your community — all in one beautiful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-white rounded-full px-8 h-14 text-base font-semibold shadow-warm group">
                <Link to="/signup" className="gap-3">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-white/20 text-white hover:bg-white/10 rounded-full px-8 h-14 text-base backdrop-blur-sm">
                <Link to="/explore" className="gap-2">
                  <Play className="w-4 h-4" />
                  Explore Creators
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-8 pt-4 animate-slide-up">
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">{stats?.creators || '5,000'}+</div>
                <div className="text-sm text-white/50">Creators</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">
                  KSh {((stats?.raised || 50000000) / 1000000).toFixed(1)}M+
                </div>
                <div className="text-sm text-white/50">Earned</div>
              </div>
              <div className="w-px h-12 bg-white/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-white">100K+</div>
                <div className="text-sm text-white/50">Supporters</div>
              </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="relative z-10">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-white/10 hover-lift">
                <img src={heroImage} alt="African creators community" className="w-full h-auto" />
              </div>
              
              <div className="absolute -left-8 top-1/4 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">New Support!</p>
                    <p className="font-semibold text-sm text-white">+KSh 1,500</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -right-4 bottom-1/3 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-white/60">Ticket Sold</p>
                    <p className="font-semibold text-sm text-white">VIP Access ✓</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
            <div className="absolute -top-6 -right-6 w-32 h-32 bg-accent/20 rounded-full blur-3xl" />
          </div>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = () => (
  <section className="py-24 relative overflow-hidden">
    <div className="absolute inset-0 bg-gradient-to-b from-background via-secondary/30 to-background" />
    <div className="container mx-auto px-4 relative">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-2 rounded-full text-sm font-medium mb-6">
          <Zap className="w-4 h-4" />
          Powerful Features
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
          Everything You Need to <span className="text-primary">Succeed</span>
        </h2>
        <p className="text-lg text-muted-foreground">
          Accept payments, sell products, host events — all optimized for African creators.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { icon: Heart, title: "M-PESA Donations", description: "Accept donations via STK Push. Fans pay in seconds.", color: "bg-primary/10 text-primary", stats: "2-sec checkout" },
          { icon: ShoppingBag, title: "Merch Store", description: "Sell branded merch. We handle production & shipping.", color: "bg-accent/10 text-accent", stats: "Fulfilled by us" },
          { icon: Ticket, title: "Event Ticketing", description: "Host events with QR ticketing and co-host with collaborators.", color: "bg-gold/10 text-gold", stats: "QR verification" },
          { icon: Trophy, title: "Awards & Voting", description: "Compete in fan-voted awards. Build hype and engagement.", color: "bg-primary/10 text-primary", stats: "Fan engagement" },
        ].map((feature, index) => (
          <div key={index} className="group bg-card rounded-2xl p-7 border hover:border-primary/20 hover:shadow-elevated transition-all duration-300">
            <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 transition-transform duration-300`}>
              <feature.icon className="w-6 h-6" />
            </div>
            <div className="inline-block text-xs font-medium bg-secondary px-2.5 py-1 rounded-full mb-3 text-muted-foreground">
              {feature.stats}
            </div>
            <h3 className="font-display text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CreatorsShowcase = () => {
  const { data: creators } = useQuery({
    queryKey: ['featured-creators'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select(`*, category:creator_categories(name)`)
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('total_supporters', { ascending: false })
        .limit(6);
      if (error) throw error;
      return data;
    }
  });

  // Only show real featured creators — no demo fallback
  const displayCreators = creators || [];

  return (
    <section className="py-24">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Star className="w-4 h-4" />
            Featured Creators
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
            Join Thriving Creators
          </h2>
          <p className="text-lg text-muted-foreground">
            See how creators are building communities and earning from their passion.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {displayCreators.slice(0, 3).map((creator: any, index) => (
            <Link key={index} to={`/${creator.username}`} className="group">
              <div className="bg-card rounded-2xl overflow-hidden border hover:border-primary/20 hover:shadow-elevated transition-all duration-300">
                <div className="aspect-square overflow-hidden relative">
                  <img src={creator.avatar_url || creator1} alt={creator.display_name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white border-0">
                      {creator.category?.name || 'Creator'}
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-display text-xl font-semibold text-foreground">{creator.display_name}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      {creator.total_supporters?.toLocaleString() || 0}
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm">{creator.tribe_name || 'Tribe Member'}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
        
        <div className="text-center mt-12">
          <Button variant="outline" size="lg" asChild className="rounded-full px-8">
            <Link to="/explore" className="gap-2">
              Explore All Creators
              <ArrowRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

const HowItWorks = () => (
  <section className="py-24 gradient-hero text-white relative overflow-hidden">
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,_hsl(350_78%_55%_/_0.1),_transparent_50%)]" />
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,_hsl(174_55%_42%_/_0.08),_transparent_50%)]" />
    <div className="container mx-auto px-4 relative">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <div className="inline-flex items-center gap-2 bg-primary/20 text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
          <TrendingUp className="w-4 h-4" />
          Simple Process
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
          Launch in Minutes
        </h2>
        <p className="text-lg text-white/60">
          Get started in three easy steps. No technical skills required.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {[
          { step: "01", title: "Create Your Profile", description: "Sign up, customize your page, and set up your payment methods.", icon: Users },
          { step: "02", title: "Share Your Link", description: "Share your unique tribeyangu.com link across all your platforms.", icon: Globe },
          { step: "03", title: "Earn & Withdraw", description: "Receive donations and sales directly to your M-PESA.", icon: CheckCircle },
        ].map((item, index) => (
          <div key={index} className="text-center group">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <item.icon className="w-8 h-8 text-primary" />
            </div>
            <div className="text-5xl font-display font-bold text-white/10 mb-4">{item.step}</div>
            <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-white/50 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TrustSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: "Bank-Level Security", description: "Your funds are protected with enterprise-grade encryption.", color: "text-accent" },
          { icon: Zap, title: "Instant M-PESA Payouts", description: "Withdraw your earnings directly to M-PESA in seconds.", color: "text-primary" },
          { icon: Heart, title: "Creator-First Fees", description: "Just 5% platform fee — the lowest in Africa.", color: "text-gold" },
        ].map((item, index) => (
          <div key={index} className="flex gap-4 items-start p-6 rounded-2xl bg-card border hover:border-primary/10 hover:shadow-soft transition-all">
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center flex-shrink-0">
              <item.icon className={`w-6 h-6 ${item.color}`} />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CTASection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="bg-gradient-to-br from-primary via-primary/90 to-gold rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-white/5 rounded-full blur-[80px]" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Join 5,000+ Creators
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Monetize Your Passion?
          </h2>
          <p className="text-xl text-white/80 mb-8">
            Create your free profile in 2 minutes. Start earning today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-white text-foreground hover:bg-white/90 rounded-full px-8 h-14 text-base font-semibold">
              <Link to="/signup" className="gap-3">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-white/30 text-white hover:bg-white/10 rounded-full px-8 h-14">
              <Link to="/explore">
                See Examples
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>
);

const Index = () => {
  return (
    <>
      <Header />
      <HeroSection />
      <FeaturesSection />
      <CreatorsShowcase />
      <HowItWorks />
      <TrustSection />
      <CTASection />
      <Footer />
    </>
  );
};

export default Index;
