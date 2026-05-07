import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, Users, ShoppingBag, Ticket, ArrowRight, Sparkles, Shield, Zap, Trophy, Play, Star, TrendingUp, CheckCircle, Globe, Gift, BarChart3, Megaphone, ArrowUpRight, Briefcase, Handshake } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.jpg";
import { useEffect, useRef, useState } from "react";

/* ─── Animated Counter Hook ─── */
const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !counted.current) {
        counted.current = true;
        let start = 0;
        const step = end / (duration / 16);
        const timer = setInterval(() => {
          start += step;
          if (start >= end) { setCount(end); clearInterval(timer); }
          else setCount(Math.floor(start));
        }, 16);
      }
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);

  return { count, ref };
};

/* ─── Hero Section ─── */
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

  const creatorCount = useCountUp(stats?.creators || 500, 1500);
  const raisedCount = useCountUp(Math.round((stats?.raised || 5000000) / 1000000), 1800);

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center pt-16 md:pt-20 overflow-hidden">
      <div className="absolute inset-0 gradient-hero" />
      <div className="absolute inset-0">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-primary/15 rounded-full blur-[120px] animate-pulse-soft" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-accent/10 rounded-full blur-[100px] animate-pulse-soft delay-300" />
        <div className="absolute top-1/2 right-1/3 w-60 h-60 bg-gold/10 rounded-full blur-[80px] animate-pulse-soft delay-500" />
      </div>
      
      <div className="container mx-auto px-4 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 glass-dark px-5 py-2.5 rounded-full text-sm font-medium animate-slide-up">
              <Sparkles className="w-4 h-4 text-gold" />
              <span className="text-primary-foreground/90">The #1 Platform for African Creators</span>
            </div>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground leading-[1.1] animate-slide-up tracking-tight">
              Monetize Your{" "}
              <span className="text-gradient">Passion</span>,<br />
              Build Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent to-sage-light">Tribe</span>
            </h1>
            <p className="text-lg md:text-xl text-primary-foreground/60 max-w-lg leading-relaxed animate-slide-up">
              Accept M-PESA donations, sell merchandise, host ticketed events, and grow your community — all in one beautiful platform.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 animate-slide-up">
              <Button size="lg" asChild className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 h-14 text-base font-semibold shadow-warm group">
                <Link to="/signup" className="gap-3">
                  Get Started Free
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="border-primary-foreground/20 text-primary-foreground hover:bg-primary-foreground/10 rounded-full px-8 h-14 text-base backdrop-blur-sm">
                <Link to="/explore" className="gap-2">
                  <Play className="w-4 h-4" />
                  Explore Creators
                </Link>
              </Button>
            </div>
            <div className="flex items-center gap-8 pt-4 animate-slide-up" ref={creatorCount.ref}>
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-primary-foreground">{creatorCount.count.toLocaleString()}+</div>
                <div className="text-sm text-primary-foreground/50">Creators</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/10" />
              <div className="text-center" ref={raisedCount.ref}>
                <div className="font-display text-3xl font-bold text-primary-foreground">
                  KSh {raisedCount.count}M+
                </div>
                <div className="text-sm text-primary-foreground/50">Earned</div>
              </div>
              <div className="w-px h-12 bg-primary-foreground/10" />
              <div className="text-center">
                <div className="font-display text-3xl font-bold text-primary-foreground">100K+</div>
                <div className="text-sm text-primary-foreground/50">Supporters</div>
              </div>
            </div>
          </div>
          
          <div className="relative hidden lg:block">
            <div className="relative z-10">
              <div className="rounded-3xl overflow-hidden shadow-2xl ring-1 ring-primary-foreground/10 hover-lift">
                <img src={heroImage} alt="African creators community" className="w-full h-auto" />
              </div>
              
              {/* Floating cards */}
              <div className="absolute -left-8 top-1/4 glass-dark rounded-2xl p-4 shadow-xl animate-float">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
                    <Heart className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="text-xs text-primary-foreground/60">New Support!</p>
                    <p className="font-semibold text-sm text-primary-foreground">+KSh 1,500</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -right-4 bottom-1/3 glass-dark rounded-2xl p-4 shadow-xl animate-float" style={{ animationDelay: '1s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Ticket className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs text-primary-foreground/60">Ticket Sold</p>
                    <p className="font-semibold text-sm text-primary-foreground">VIP Access ✓</p>
                  </div>
                </div>
              </div>

              <div className="absolute left-1/2 -bottom-6 -translate-x-1/2 glass-dark rounded-2xl p-3 shadow-xl animate-float" style={{ animationDelay: '2s' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                    <Gift className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-primary-foreground/60">Gift Received</p>
                    <p className="font-semibold text-sm text-primary-foreground">🎉 Fire Gift!</p>
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

/* ─── Featured Creators Showcase ─── */
const CreatorsShowcase = () => {
  const { data: creators } = useQuery({
    queryKey: ['featured-creators-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, username, display_name, avatar_url, bio, total_raised, total_supporters, category:creator_categories(name, icon)')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .order('total_raised', { ascending: false })
        .limit(8);
      if (error) throw error;
      return data;
    }
  });

  if (!creators || creators.length === 0) return null;

  return (
    <section className="py-20 overflow-hidden">
      <div className="container mx-auto px-4 mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium mb-4">
              <Star className="w-4 h-4" fill="currentColor" />
              Featured Creators
            </div>
            <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground">
              Meet Our <span className="text-primary">Top Creators</span>
            </h2>
          </div>
          <Button variant="ghost" asChild className="hidden md:flex gap-2 text-primary hover:text-primary/80">
            <Link to="/explore">
              View All <ArrowUpRight className="w-4 h-4" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="flex gap-6 px-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
        {creators.map((creator, i) => (
          <Link 
            key={creator.id} 
            to={`/${creator.username}`}
            className="flex-shrink-0 w-72 snap-start group"
          >
            <div className="relative bg-card rounded-2xl border overflow-hidden hover-lift h-full">
              {/* Gradient top accent */}
              <div className="h-20 bg-gradient-to-br from-primary/20 via-accent/10 to-gold/10 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              </div>
              
              <div className="px-5 pb-5 -mt-10 relative">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-primary/10 border-4 border-card shadow-md mb-3">
                  {creator.avatar_url ? (
                    <img src={creator.avatar_url} alt={creator.display_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl font-bold text-primary bg-primary/5">
                      {creator.display_name.charAt(0)}
                    </div>
                  )}
                </div>

                <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors truncate">
                  {creator.display_name}
                </h3>
                <p className="text-sm text-muted-foreground mb-2">@{creator.username}</p>
                
                {creator.category && (
                  <span className="inline-flex items-center gap-1 text-xs bg-secondary px-2 py-1 rounded-full text-muted-foreground mb-3">
                    {(creator.category as any).icon} {(creator.category as any).name}
                  </span>
                )}
                
                <p className="text-sm text-muted-foreground line-clamp-2 mb-4 min-h-[2.5rem]">
                  {creator.bio || 'Creating amazing content'}
                </p>

                <div className="flex items-center justify-between text-sm border-t pt-3">
                  <span className="flex items-center gap-1 text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {creator.total_supporters || 0}
                  </span>
                  <span className="font-semibold text-primary">
                    KSh {Number(creator.total_raised || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="container mx-auto px-4 mt-6 md:hidden">
        <Button variant="outline" asChild className="w-full gap-2">
          <Link to="/explore">View All Creators <ArrowUpRight className="w-4 h-4" /></Link>
        </Button>
      </div>
    </section>
  );
};

/* ─── Features Section ─── */
const FeaturesSection = () => {
  const features = [
    { icon: Heart, title: "M-PESA Donations", description: "Accept donations via STK Push. Fans pay in seconds from their phone.", color: "bg-primary/10 text-primary", stats: "2-sec checkout" },
    { icon: ShoppingBag, title: "Merch Store", description: "Sell branded merch. We handle production & shipping for you.", color: "bg-accent/10 text-accent", stats: "In-house fulfilment" },
    { icon: Ticket, title: "Event Ticketing", description: "Host events with QR ticketing, collaborations, and revenue sharing.", color: "bg-gold/10 text-gold", stats: "QR verification" },
    { icon: Trophy, title: "Awards & Voting", description: "Compete in fan-voted awards. Build hype and engagement.", color: "bg-primary/10 text-primary", stats: "Fan engagement" },
    { icon: Gift, title: "Virtual Gifts", description: "Receive animated gifts with real monetary value from fans.", color: "bg-accent/10 text-accent", stats: "Fun interactions" },
    { icon: Megaphone, title: "Campaigns", description: "Launch crowdfunding campaigns with progress tracking.", color: "bg-gold/10 text-gold", stats: "Goal-based funding" },
    { icon: BarChart3, title: "Analytics", description: "Track your earnings, supporters, and growth in real-time.", color: "bg-primary/10 text-primary", stats: "Real-time data" },
    { icon: Globe, title: "Custom Links", description: "One link for everything — bio, socials, and support page.", color: "bg-accent/10 text-accent", stats: "Link-in-bio" },
  ];

  return (
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
            All the tools optimized for African creators — payments, products, events, and community.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature, index) => (
            <div key={index} className="group bg-card rounded-2xl p-6 border hover:border-primary/20 hover:shadow-elevated transition-all duration-300">
              <div className={`w-12 h-12 ${feature.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
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
};

/* ─── How It Works ─── */
const HowItWorks = () => (
  <section className="py-24 gradient-hero text-primary-foreground relative overflow-hidden">
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
        <p className="text-lg text-primary-foreground/60">
          Get started in three easy steps. No technical skills required.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {[
          { step: "01", title: "Create Your Profile", description: "Sign up, customize your page with your brand colors, and set up M-PESA.", icon: Users },
          { step: "02", title: "Share Your Link", description: "Share your unique link across all your social platforms.", icon: Globe },
          { step: "03", title: "Earn & Withdraw", description: "Receive donations and sales directly to your M-PESA instantly.", icon: CheckCircle },
        ].map((item, index) => (
          <div key={index} className="text-center group">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-primary-foreground/5 border border-primary-foreground/10 flex items-center justify-center group-hover:scale-110 group-hover:bg-primary/20 transition-all duration-300">
              <item.icon className="w-8 h-8 text-primary" />
            </div>
            <div className="text-5xl font-display font-bold text-primary-foreground/10 mb-4">{item.step}</div>
            <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-primary-foreground/50 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Social Proof / Testimonials ─── */
const TestimonialsSection = () => {
  const testimonials = [
    { name: "Amara K.", role: "Music Artist", text: "TribeYangu changed my life. I went from struggling to making a full-time income from my music fans.", avatar: "🎵" },
    { name: "Brian O.", role: "Content Creator", text: "The M-PESA integration is seamless. My fans can support me in seconds. Best platform in Africa!", avatar: "📸" },
    { name: "Faith M.", role: "Fashion Designer", text: "I sell my designs through the merch store and the fulfilment team handles everything. Game changer!", avatar: "👗" },
  ];

  return (
    <section className="py-20 bg-secondary/30">
      <div className="container mx-auto px-4">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-4">
            Loved by <span className="text-primary">Creators</span>
          </h2>
          <p className="text-muted-foreground">Hear from creators who transformed their passion into income.</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-card rounded-2xl p-6 border hover-lift">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  <p className="text-sm text-muted-foreground">{t.role}</p>
                </div>
              </div>
              <p className="text-muted-foreground leading-relaxed italic">"{t.text}"</p>
              <div className="flex gap-1 mt-4">
                {[...Array(5)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 text-gold fill-current" />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Trust Section ─── */
const TrustSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-6">
        {[
          { icon: Shield, title: "Bank-Level Security", description: "Your funds are protected with enterprise-grade encryption and M-PESA integration.", color: "text-accent" },
          { icon: Zap, title: "Instant M-PESA Payouts", description: "Withdraw your earnings directly to M-PESA. No delays, no hassle.", color: "text-primary" },
          { icon: Heart, title: "Creator-First Fees", description: "Just 5% platform fee — the lowest for creators in Africa.", color: "text-gold" },
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

/* ─── CTA Section ─── */
const CTASection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="bg-gradient-to-br from-primary via-primary/90 to-gold rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-foreground/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-primary-foreground/5 rounded-full blur-[80px]" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-foreground/15 backdrop-blur-sm text-primary-foreground px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Sparkles className="w-4 h-4" />
            Join 5,000+ Creators
          </div>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Monetize Your Passion?
          </h2>
          <p className="text-xl text-primary-foreground/80 mb-8">
            Create your free profile in 2 minutes. Start earning today.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" asChild className="bg-card text-foreground hover:bg-card/90 rounded-full px-8 h-14 text-base font-semibold">
              <Link to="/signup" className="gap-3">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 rounded-full px-8 h-14">
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

/* ─── Main Index ─── */
const Index = () => {
  return (
    <div className="pb-20 md:pb-0">
      <Header />
      <HeroSection />
      <CreatorsShowcase />
      <FeaturesSection />
      <HowItWorks />
      <TestimonialsSection />
      <TrustSection />
      <CTASection />
      <Footer />
    </div>
  );
};

export default Index;
