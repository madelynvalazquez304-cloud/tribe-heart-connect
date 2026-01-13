import { Link } from "react-router-dom";
import { Heart, Instagram, Twitter, Youtube, Mail } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-charcoal text-cream py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          {/* Brand */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl gradient-warm flex items-center justify-center">
                <Heart className="w-5 h-5 text-primary-foreground fill-current" />
              </div>
              <span className="font-display text-2xl font-semibold text-cream">
                Tribe<span className="text-terracotta">Yangu</span>
              </span>
            </Link>
            <p className="text-cream/70 text-sm leading-relaxed">
              Turning fans into family and support into impact. Empowering African creators to build sustainable communities.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* For Creators */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">For Creators</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/signup" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Start Your Tribe
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Pricing & Fees
                </Link>
              </li>
              <li>
                <Link to="/creator-tools" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Creator Tools
                </Link>
              </li>
              <li>
                <Link to="/success-stories" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Success Stories
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">Support</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/help" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Help Center
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  FAQ
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Contact Us
                </Link>
              </li>
              <li>
                <Link to="/community" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Community Guidelines
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">Legal</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/terms" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link to="/privacy" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Privacy Policy
                </Link>
              </li>
              <li>
                <Link to="/cookies" className="text-cream/70 hover:text-terracotta transition-colors text-sm">
                  Cookie Policy
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-cream/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-cream/50 text-sm">
            © 2024 TribeYangu. Made with ❤️ for African creators.
          </p>
          <div className="flex items-center gap-2 text-cream/50 text-sm">
            <Mail className="w-4 h-4" />
            <a href="mailto:hello@tribeyangu.com" className="hover:text-terracotta transition-colors">
              hello@tribeyangu.com
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
