import { useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Heart, Users, ShoppingBag, Ticket, Share2, Check, MapPin, Calendar } from "lucide-react";
import { useState } from "react";
import creator1 from "@/assets/creator-1.jpg";
import heroImage from "@/assets/hero-image.jpg";

const donationAmounts = [100, 300, 500, 1000];

const CreatorPage = () => {
  const { username } = useParams();
  const [selectedAmount, setSelectedAmount] = useState<number | null>(300);
  const [customAmount, setCustomAmount] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [showThankYou, setShowThankYou] = useState(false);

  const handleDonate = () => {
    // Simulate donation
    setShowThankYou(true);
    setTimeout(() => setShowThankYou(false), 4000);
  };

  // Mock creator data
  const creator = {
    name: "Amara Okonkwo",
    username: username?.replace("@", "") || "amaraokonkwo",
    tribe: "The Music Collective",
    bio: "Singer, songwriter, and music producer. Creating soulful African music that tells our stories. Join my tribe and help me share our sound with the world! 🎵✨",
    supporters: 2547,
    totalRaised: "KSh 847,300",
    avatar: creator1,
    banner: heroImage,
    isVerified: true,
    events: [
      {
        id: 1,
        title: "Live Acoustic Night",
        date: "Feb 14, 2024",
        location: "Nairobi, Kenya",
        price: "KSh 1,500",
        ticketsLeft: 45,
      },
    ],
    merch: [
      {
        id: 1,
        name: "Tribe Hoodie",
        price: "KSh 2,500",
        image: "/placeholder.svg",
      },
      {
        id: 2,
        name: "Music Cap",
        price: "KSh 800",
        image: "/placeholder.svg",
      },
    ],
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Banner */}
      <div className="relative h-64 md:h-80 overflow-hidden">
        <img
          src={creator.banner}
          alt="Banner"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 to-transparent" />
      </div>

      <div className="container mx-auto px-4 -mt-24 relative z-10">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Profile Header */}
            <div className="gradient-card rounded-3xl p-6 md:p-8 shadow-elevated">
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="relative">
                  <img
                    src={creator.avatar}
                    alt={creator.name}
                    className="w-24 h-24 md:w-32 md:h-32 rounded-2xl object-cover shadow-warm"
                  />
                  {creator.isVerified && (
                    <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-sage rounded-full flex items-center justify-center shadow-md">
                      <Check className="w-4 h-4 text-primary-foreground" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">
                      {creator.name}
                    </h1>
                  </div>
                  <p className="text-terracotta font-medium mb-3">@{creator.username}</p>
                  <p className="text-muted-foreground leading-relaxed mb-4">{creator.bio}</p>
                  
                  <div className="flex flex-wrap gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-terracotta" />
                      <span className="font-semibold">{creator.supporters.toLocaleString()}</span>
                      <span className="text-muted-foreground">supporters</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Heart className="w-4 h-4 text-terracotta" />
                      <span className="font-semibold">{creator.totalRaised}</span>
                      <span className="text-muted-foreground">raised</span>
                    </div>
                  </div>
                </div>

                <Button variant="soft" size="sm" className="gap-2">
                  <Share2 className="w-4 h-4" />
                  Share
                </Button>
              </div>
            </div>

            {/* Events Section */}
            {creator.events.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-terracotta" />
                  Upcoming Events
                </h2>
                <div className="grid gap-4">
                  {creator.events.map((event) => (
                    <div key={event.id} className="gradient-card rounded-2xl p-6 hover-lift">
                      <div className="flex flex-col md:flex-row justify-between gap-4">
                        <div>
                          <h3 className="font-display text-lg font-semibold mb-2">{event.title}</h3>
                          <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-4 h-4" />
                              {event.date}
                            </span>
                            <span className="flex items-center gap-1">
                              <MapPin className="w-4 h-4" />
                              {event.location}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <span className="font-display text-xl font-bold text-terracotta">{event.price}</span>
                          <span className="text-xs text-muted-foreground">{event.ticketsLeft} tickets left</span>
                          <Button variant="terracotta" size="sm">Get Tickets</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Merchandise Section */}
            {creator.merch.length > 0 && (
              <div className="space-y-4">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-sage" />
                  Merchandise
                </h2>
                <div className="grid grid-cols-2 gap-4">
                  {creator.merch.map((item) => (
                    <div key={item.id} className="gradient-card rounded-2xl overflow-hidden hover-lift group">
                      <div className="aspect-square bg-cream flex items-center justify-center">
                        <ShoppingBag className="w-12 h-12 text-muted-foreground/30" />
                      </div>
                      <div className="p-4">
                        <h3 className="font-medium text-foreground mb-1">{item.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="font-display font-bold text-terracotta">{item.price}</span>
                          <Button variant="soft" size="sm">Buy</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Donation Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24">
              <div className="gradient-card rounded-3xl p-6 shadow-elevated relative overflow-hidden">
                {/* Thank You Animation */}
                {showThankYou && (
                  <div className="absolute inset-0 bg-sage flex items-center justify-center z-20 animate-scale-in">
                    <div className="text-center text-primary-foreground">
                      <Heart className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                      <h3 className="font-display text-2xl font-bold mb-2">Thank You!</h3>
                      <p className="text-primary-foreground/80">Your support means everything 💚</p>
                    </div>
                  </div>
                )}

                <div className="text-center mb-6">
                  <div className="w-14 h-14 mx-auto mb-4 gradient-warm rounded-full flex items-center justify-center">
                    <Heart className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="font-display text-xl font-bold text-foreground">
                    Support {creator.name.split(' ')[0]}
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Your support helps keep the music alive
                  </p>
                </div>

                {/* Amount Selection */}
                <div className="grid grid-cols-2 gap-3 mb-4">
                  {donationAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => {
                        setSelectedAmount(amount);
                        setCustomAmount("");
                      }}
                      className={`py-3 px-4 rounded-xl font-semibold transition-all duration-200 ${
                        selectedAmount === amount
                          ? "gradient-warm text-primary-foreground shadow-warm"
                          : "bg-cream text-foreground hover:bg-cream-dark"
                      }`}
                    >
                      KSh {amount}
                    </button>
                  ))}
                </div>

                {/* Custom Amount */}
                <div className="mb-4">
                  <input
                    type="number"
                    placeholder="Custom amount (KSh)"
                    value={customAmount}
                    onChange={(e) => {
                      setCustomAmount(e.target.value);
                      setSelectedAmount(null);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-cream border-2 border-transparent focus:border-terracotta outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Phone Number */}
                <div className="mb-4">
                  <input
                    type="tel"
                    placeholder="M-PESA number (07...)"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-cream border-2 border-transparent focus:border-terracotta outline-none transition-colors text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Message */}
                <div className="mb-6">
                  <textarea
                    placeholder="Leave some love... 💚 (optional)"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl bg-cream border-2 border-transparent focus:border-terracotta outline-none transition-colors resize-none text-foreground placeholder:text-muted-foreground"
                  />
                </div>

                {/* Submit Button */}
                <Button
                  variant="hero"
                  size="xl"
                  className="w-full gap-2"
                  onClick={handleDonate}
                >
                  <Heart className="w-5 h-5" />
                  Support with KSh {customAmount || selectedAmount || 0}
                </Button>

                <p className="text-xs text-center text-muted-foreground mt-4">
                  Secure payment via M-PESA • Instant delivery
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Spacing */}
      <div className="h-24" />
    </div>
  );
};

export default CreatorPage;
