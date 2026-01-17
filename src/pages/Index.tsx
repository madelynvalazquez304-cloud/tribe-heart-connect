import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, Users, ShoppingBag, Ticket, ArrowRight, Sparkles, Shield, Zap } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import heroImage from "@/assets/hero-image.jpg";
import creator1 from "@/assets/creator-1.jpg";
import creator2 from "@/assets/creator-2.jpg";
import creator3 from "@/assets/creator-3.jpg";

const HeroSection = () => (
  <section className="relative min-h-screen flex items-center pt-20 overflow-hidden">
    {/* Background Elements */}
    <div className="absolute inset-0 gradient-hero" />
    <div className="absolute top-20 right-10 w-64 h-64 bg-terracotta/10 organic-blob animate-float" />
    <div className="absolute bottom-20 left-10 w-48 h-48 bg-sage/10 organic-blob-2 animate-float" style={{ animationDelay: '2s' }} />
    
    <div className="container mx-auto px-4 relative z-10">
      <div className="grid lg:grid-cols-2 gap-12 items-center">
        <div className="space-y-8 animate-slide-up">
          <div className="inline-flex items-center gap-2 bg-terracotta/10 text-terracotta px-4 py-2 rounded-full text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            Made for African Creators
          </div>
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight">
            Turn Your Fans Into{" "}
            <span className="text-gradient">Family</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-lg leading-relaxed">
            Accept donations via M-PESA, sell merchandise, and host events. 
            Build a community that supports your creative journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Button variant="hero" size="xl" asChild>
              <Link to="/signup" className="gap-3">
                Start Your Tribe
                <ArrowRight className="w-5 h-5" />
              </Link>
            </Button>
            <Button variant="outline-warm" size="xl" asChild>
              <Link to="/explore">Explore Creators</Link>
            </Button>
          </div>
          <div className="flex items-center gap-8 pt-4">
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-foreground">5,000+</div>
              <div className="text-sm text-muted-foreground">Creators</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-foreground">KSh 50M+</div>
              <div className="text-sm text-muted-foreground">Earned</div>
            </div>
            <div className="w-px h-12 bg-border" />
            <div className="text-center">
              <div className="font-display text-3xl font-bold text-foreground">100K+</div>
              <div className="text-sm text-muted-foreground">Supporters</div>
            </div>
          </div>
        </div>
        
        <div className="relative hidden lg:block">
          <div className="relative z-10 rounded-3xl overflow-hidden shadow-elevated hover-lift">
            <img src={heroImage} alt="African creators community" className="w-full h-auto" />
          </div>
          <div className="absolute -bottom-6 -left-6 w-32 h-32 bg-terracotta/20 rounded-full blur-2xl" />
          <div className="absolute -top-6 -right-6 w-24 h-24 bg-sage/30 rounded-full blur-2xl" />
        </div>
      </div>
    </div>
  </section>
);

const FeaturesSection = () => (
  <section className="py-24 bg-cream">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-16 animate-slide-up">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
          Everything You Need to Grow Your Tribe
        </h2>
        <p className="text-lg text-muted-foreground">
          From donations to merchandise to live events — we've got you covered.
        </p>
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          {
            icon: Heart,
            title: "Accept Donations",
            description: "Get support via M-PESA STK Push. Fans donate in seconds.",
            color: "bg-terracotta/10 text-terracotta",
          },
          {
            icon: ShoppingBag,
            title: "Sell Merchandise",
            description: "Hoodies, tees, caps — we handle production & shipping.",
            color: "bg-sage/10 text-sage",
          },
          {
            icon: Ticket,
            title: "Host Events",
            description: "Sell tickets with QR codes. Scan at entry. Simple.",
            color: "bg-gold/10 text-gold",
          },
          {
            icon: Users,
            title: "Build Community",
            description: "Your own tribe page. Share your story. Grow together.",
            color: "bg-charcoal/10 text-charcoal",
          },
        ].map((feature, index) => (
          <div
            key={index}
            className="gradient-card p-8 rounded-3xl hover-lift group"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <div className={`w-14 h-14 ${feature.color} rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300`}>
              <feature.icon className="w-7 h-7" />
            </div>
            <h3 className="font-display text-xl font-semibold text-foreground mb-3">
              {feature.title}
            </h3>
            <p className="text-muted-foreground leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const CreatorsShowcase = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-6">
          Meet Our Creators
        </h2>
        <p className="text-lg text-muted-foreground">
          Join thousands of African creators building thriving communities.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            image: creator1,
            name: "Amara Okonkwo",
            tribe: "The Music Collective",
            supporters: "2.5K",
            category: "Musician",
          },
          {
            image: creator2,
            name: "Kofi Mensah",
            tribe: "Tech Talk Kenya",
            supporters: "4.2K",
            category: "Content Creator",
          },
          {
            image: creator3,
            name: "Zuri Ndegwa",
            tribe: "Art & Soul",
            supporters: "1.8K",
            category: "Visual Artist",
          },
        ].map((creator, index) => (
          <Link
            key={index}
            to={`/@${creator.name.toLowerCase().replace(' ', '')}`}
            className="group"
          >
            <div className="gradient-card rounded-3xl overflow-hidden hover-lift">
              <div className="aspect-square overflow-hidden">
                <img
                  src={creator.image}
                  alt={creator.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-terracotta bg-terracotta/10 px-3 py-1 rounded-full">
                    {creator.category}
                  </span>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-4 h-4" />
                    {creator.supporters}
                  </div>
                </div>
                <h3 className="font-display text-xl font-semibold text-foreground mb-1">
                  {creator.name}
                </h3>
                <p className="text-muted-foreground text-sm">{creator.tribe}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      
      <div className="text-center mt-12">
        <Button variant="outline-warm" size="lg" asChild>
          <Link to="/explore" className="gap-2">
            View All Creators
            <ArrowRight className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </div>
  </section>
);

const HowItWorks = () => (
  <section className="py-24 bg-charcoal text-cream">
    <div className="container mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
          How It Works
        </h2>
        <p className="text-lg text-cream/70">
          Get started in minutes. Start earning today.
        </p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
        {[
          {
            step: "01",
            title: "Create Your Page",
            description: "Sign up, add your bio, photo, and customize your tribe page.",
          },
          {
            step: "02",
            title: "Share Your Link",
            description: "Share tribeyangu.com/@yourname with your fans everywhere.",
          },
          {
            step: "03",
            title: "Get Paid",
            description: "Receive donations via M-PESA. Withdraw anytime.",
          },
        ].map((item, index) => (
          <div key={index} className="text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-terracotta/20 flex items-center justify-center">
              <span className="font-display text-2xl font-bold text-terracotta">{item.step}</span>
            </div>
            <h3 className="font-display text-xl font-semibold mb-3">{item.title}</h3>
            <p className="text-cream/70 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

const TrustSection = () => (
  <section className="py-24">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-3 gap-8">
        {[
          {
            icon: Shield,
            title: "Secure Payments",
            description: "All transactions protected with bank-level security.",
          },
          {
            icon: Zap,
            title: "Instant Payouts",
            description: "Withdraw your earnings directly to M-PESA instantly.",
          },
          {
            icon: Heart,
            title: "Creator-First",
            description: "We only win when you win. Lowest fees in the market.",
          },
        ].map((item, index) => (
          <div key={index} className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-sage/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-6 h-6 text-sage" />
            </div>
            <div>
              <h3 className="font-display text-lg font-semibold text-foreground mb-2">{item.title}</h3>
              <p className="text-muted-foreground">{item.description}</p>
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
      <div className="gradient-warm rounded-3xl p-12 md:p-16 text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary-foreground/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-primary-foreground/10 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-primary-foreground mb-6">
            Ready to Build Your Tribe?
          </h2>
          <p className="text-xl text-primary-foreground/90 mb-8">
            Join thousands of creators earning from their passion. Free to start.
          </p>
          <Button variant="glass" size="xl" asChild>
            <Link to="/signup" className="gap-3 text-foreground">
              Get Started Free
              <ArrowRight className="w-5 h-5" />
            </Link>
          </Button>
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
