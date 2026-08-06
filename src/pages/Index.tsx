import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import {
  Heart, Users, ShoppingBag, Ticket, ArrowRight, Shield, Trophy, Star,
  CheckCircle, Globe, Gift, BarChart3, Megaphone, ArrowUpRight, Briefcase,
  Handshake, FileText, Wallet, Search
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useEffect, useRef, useState } from "react";

/* ─── Animated Counter Hook ─── */
const useCountUp = (end: number, duration = 1600) => {
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

/* ─── Band 1: Hero ─── */
const HeroBand = () => {
  const { data: stats } = useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      const { data: creators } = await supabase.from('creators').select('id', { count: 'exact' }).eq('status', 'approved');
      const { data: raised } = await supabase.from('transactions').select('net_amount').eq('status', 'completed');
      const totalRaised = raised?.reduce((sum, t) => sum + Number(t.net_amount), 0) || 0;
      return { creators: creators?.length || 0, raised: totalRaised };
    }
  });

  const creatorCount = useCountUp(stats?.creators || 120);
  const raisedCount = useCountUp(Math.round((stats?.raised || 5000000) / 1000000));

  return (
    <section className="relative bg-charcoal text-cream pt-28 pb-20 md:pt-40 md:pb-28">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl">
          <div className="inline-flex items-center gap-2 border border-cream/20 px-4 py-1.5 rounded-full text-xs font-medium tracking-widest uppercase mb-8">
            <Briefcase className="w-3.5 h-3.5" />
            Creator agency &amp; monetization platform
          </div>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.05] mb-6">
            We build the business
            <br />
            behind the creator.
          </h1>
          <p className="text-lg md:text-xl text-cream/70 max-w-2xl leading-relaxed mb-10">
            Brand deals with escrow-backed contracts, direct fan support, ticketed events and merch —
            represented, negotiated and paid out through one house.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <Button size="lg" asChild className="bg-cream text-charcoal hover:bg-cream/90 rounded-md px-8 h-12 text-base font-semibold">
              <Link to="/advertise" className="gap-2">
                Brands: post a brief
                <ArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="border-cream/25 bg-transparent text-cream hover:bg-cream/10 rounded-md px-8 h-12 text-base">
              <Link to="/signup">Creators: apply to the roster</Link>
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-cream/10 mt-16 md:mt-24 border border-cream/10">
          <div className="bg-charcoal p-6" ref={creatorCount.ref}>
            <div className="font-display text-3xl font-bold">{creatorCount.count.toLocaleString()}+</div>
            <div className="text-sm text-cream/50 mt-1">Represented creators</div>
          </div>
          <div className="bg-charcoal p-6" ref={raisedCount.ref}>
            <div className="font-display text-3xl font-bold">KSh {raisedCount.count}M+</div>
            <div className="text-sm text-cream/50 mt-1">Paid to talent</div>
          </div>
          <div className="bg-charcoal p-6">
            <div className="font-display text-3xl font-bold">100%</div>
            <div className="text-sm text-cream/50 mt-1">Escrowed brand deals</div>
          </div>
          <div className="bg-charcoal p-6">
            <div className="font-display text-3xl font-bold">5%</div>
            <div className="text-sm text-cream/50 mt-1">Platform fee</div>
          </div>
        </div>
      </div>
    </section>
  );
};

/* ─── Band 2: Two doors ─── */
const AudienceBand = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container mx-auto px-4">
      <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
        <div className="bg-card p-8 md:p-12">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-4">For brands</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            One brief. A shortlist of the right creators.
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            Tell us the campaign, budget and audience. We match, contract, brief and report —
            and your budget only leaves escrow when the deliverables land.
          </p>
          <ul className="space-y-3 mb-8">
            {['Vetted, contracted talent', 'Escrow release on delivery', 'One invoice, many creators', 'Campaign reporting'].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <Button asChild className="rounded-md"><Link to="/advertise" className="gap-2">Post a brief <ArrowRight className="w-4 h-4" /></Link></Button>
        </div>
        <div className="bg-card p-8 md:p-12">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-4">For creators</p>
          <h2 className="font-display text-2xl md:text-3xl font-bold mb-4">
            Get represented. Get paid on time.
          </h2>
          <p className="text-muted-foreground mb-6 leading-relaxed">
            We bring the deals and handle the paperwork, while your page keeps earning from
            fan support, events, merch and gifts — all withdrawable to mobile money.
          </p>
          <ul className="space-y-3 mb-8">
            {['Brand deals negotiated for you', 'Contracts and invoicing handled', 'Instant mobile-money payouts', 'Your own storefront page'].map((t) => (
              <li key={t} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 text-accent mt-0.5 shrink-0" /> {t}
              </li>
            ))}
          </ul>
          <Button asChild variant="outline" className="rounded-md"><Link to="/signup" className="gap-2">Apply to the roster <ArrowRight className="w-4 h-4" /></Link></Button>
        </div>
      </div>
    </div>
  </section>
);

/* ─── Band 3: Roster ─── */
const RosterBand = () => {
  const { data: creators } = useQuery({
    queryKey: ['featured-creators-landing'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('creators')
        .select('id, username, display_name, avatar_url, bio, category:creator_categories(name, icon)')
        .eq('status', 'approved')
        .eq('is_featured', true)
        .limit(8);
      if (error) throw error;
      return data;
    }
  });

  if (!creators || creators.length === 0) return null;

  return (
    <section className="py-20 md:py-28 bg-secondary/50 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-3">The roster</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">Talent we represent</h2>
          </div>
          <Button variant="ghost" asChild className="gap-2 text-accent hover:text-accent/80">
            <Link to="/explore">Full roster <ArrowUpRight className="w-4 h-4" /></Link>
          </Button>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-border border border-border">
          {creators.map((creator) => (
            <Link key={creator.id} to={`/${creator.username}`} className="group bg-card p-6 hover:bg-secondary/60 transition-colors">
              <div className="w-14 h-14 rounded-md overflow-hidden bg-secondary border border-border mb-4">
                {creator.avatar_url ? (
                  <img src={creator.avatar_url} alt={creator.display_name} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-lg font-bold text-accent">
                    {creator.display_name.charAt(0)}
                  </div>
                )}
              </div>
              <h3 className="font-display font-semibold group-hover:text-accent transition-colors truncate">
                {creator.display_name}
              </h3>
              <p className="text-sm text-muted-foreground mb-3">@{creator.username}</p>
              {creator.category && (
                <span className="inline-flex items-center gap-1 text-xs border border-border px-2 py-0.5 rounded-full text-muted-foreground mb-3">
                  {(creator.category as any).icon} {(creator.category as any).name}
                </span>
              )}
              <p className="text-sm text-muted-foreground line-clamp-2">
                {creator.bio || 'Creating for a dedicated audience.'}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Band 4: Services ─── */
const ServicesBand = () => {
  const services = [
    { icon: Handshake, title: "Brand representation", description: "We source, negotiate and close partnerships on your behalf." },
    { icon: FileText, title: "Contracts & invoicing", description: "Standard agreements, e-signatures and invoices issued for you." },
    { icon: Shield, title: "Escrow protection", description: "Brand budgets are held and only released once work is delivered." },
    { icon: Heart, title: "Fan support", description: "Direct mobile-money support with instant confirmation." },
    { icon: Ticket, title: "Event ticketing", description: "Ticketed events with QR check-in and revenue sharing." },
    { icon: ShoppingBag, title: "Merch", description: "Sell branded products with production and fulfilment handled." },
    { icon: Megaphone, title: "Campaigns", description: "Goal-based funding drives with live progress tracking." },
    { icon: Gift, title: "Virtual gifts", description: "Real-value gifting moments during streams and drops." },
    { icon: BarChart3, title: "Reporting", description: "Earnings, supporters and campaign performance in real time." },
    { icon: Globe, title: "Creator page", description: "One link for your bio, socials, store and support." },
    { icon: Trophy, title: "Awards", description: "Audience-voted awards that build reach and hype." },
    { icon: Wallet, title: "Payouts", description: "Withdraw earnings straight to mobile money." },
  ];

  return (
    <section className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-3">What we do</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Agency services, platform economics
          </h2>
          <p className="text-muted-foreground">
            Representation and deal-making on one side, the tools to earn directly from an audience on the other.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border border border-border">
          {services.map((s, i) => (
            <div key={i} className="bg-card p-6 hover:bg-secondary/50 transition-colors">
              <s.icon className="w-6 h-6 text-accent mb-4" />
              <h3 className="font-display font-semibold mb-1.5">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Band 5: Process ─── */
const ProcessBand = () => (
  <section className="py-20 md:py-28 bg-charcoal text-cream">
    <div className="container mx-auto px-4">
      <div className="max-w-2xl mb-14">
        <p className="text-xs uppercase tracking-widest text-cream/50 font-semibold mb-3">How it works</p>
        <h2 className="font-display text-3xl md:text-4xl font-bold">From brief to payout in four steps</h2>
      </div>
      <div className="grid md:grid-cols-4 gap-px bg-cream/10 border border-cream/10">
        {[
          { step: "01", title: "Brief or apply", description: "Brands submit a campaign brief. Creators apply to the roster.", icon: Search },
          { step: "02", title: "Match & contract", description: "We shortlist talent and issue the agreement for both sides.", icon: Handshake },
          { step: "03", title: "Fund escrow", description: "The brand funds the deal. Nothing releases before delivery.", icon: Shield },
          { step: "04", title: "Deliver & get paid", description: "Work ships, escrow releases, payouts hit mobile money.", icon: Wallet },
        ].map((item, i) => (
          <div key={i} className="bg-charcoal p-8">
            <div className="text-sm font-display font-bold text-cream/30 mb-6">{item.step}</div>
            <item.icon className="w-6 h-6 text-cream mb-4" />
            <h3 className="font-display text-lg font-semibold mb-2">{item.title}</h3>
            <p className="text-sm text-cream/60 leading-relaxed">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

/* ─── Band 6: Proof ─── */
const ProofBand = () => {
  const quotes = [
    { name: "Amara K.", role: "Music artist", text: "They brought me two brand deals in a quarter and handled every contract. I just create." },
    { name: "Brian O.", role: "Content creator", text: "Payouts land the same day I withdraw, and the escrow means I never chase an invoice again." },
    { name: "Faith M.", role: "Fashion designer", text: "My store, my events and my sponsorships all run from one dashboard. Nothing slips." },
  ];

  return (
    <section className="py-20 md:py-28 bg-secondary/50 border-y border-border">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mb-12">
          <p className="text-xs uppercase tracking-widest text-accent font-semibold mb-3">Proof</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold">Talent that stayed</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-px bg-border border border-border">
          {quotes.map((t, i) => (
            <div key={i} className="bg-card p-8">
              <div className="flex gap-0.5 mb-5">
                {[...Array(5)].map((_, j) => <Star key={j} className="w-3.5 h-3.5 text-accent fill-current" />)}
              </div>
              <p className="text-foreground leading-relaxed mb-6">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="w-9 h-9 rounded-md bg-secondary border border-border flex items-center justify-center text-sm font-semibold text-accent">
                  {t.name.charAt(0)}
                </div>
                <div>
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

/* ─── Band 7: CTA ─── */
const CTABand = () => (
  <section className="py-20 md:py-28 bg-background">
    <div className="container mx-auto px-4">
      <div className="border border-border bg-card p-10 md:p-16 text-center">
        <h2 className="font-display text-3xl md:text-5xl font-bold mb-5 max-w-3xl mx-auto">
          Whichever side you're on, start here.
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Brands get a shortlist in days. Creators get representation and a page that earns from day one.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" asChild className="rounded-md px-8 h-12 text-base font-semibold">
            <Link to="/advertise" className="gap-2">Post a brief <ArrowRight className="w-4 h-4" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild className="rounded-md px-8 h-12 text-base">
            <Link to="/signup">Apply to the roster</Link>
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-6 mt-10 pt-8 border-t border-border text-sm text-muted-foreground">
          <span className="flex items-center gap-2"><Shield className="w-4 h-4 text-accent" /> Escrow-backed deals</span>
          <span className="flex items-center gap-2"><Wallet className="w-4 h-4 text-accent" /> Mobile-money payouts</span>
          <span className="flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Vetted roster</span>
        </div>
      </div>
    </div>
  </section>
);

const Index = () => (
  <div className="pb-20 md:pb-0">
    <Header />
    <HeroBand />
    <AudienceBand />
    <RosterBand />
    <ServicesBand />
    <ProcessBand />
    <ProofBand />
    <CTABand />
    <Footer />
  </div>
);

export default Index;
