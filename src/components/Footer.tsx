import { Link } from "react-router-dom";
import { Heart, Instagram, Twitter, Youtube, Mail } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const Footer = () => {
  const { data: site } = useSiteSettings();

  const siteName = site?.site_name || 'TribeYangu';
  const nameParts = siteName.includes('Tribe')
    ? [siteName.substring(0, siteName.indexOf('Tribe') + 5), siteName.substring(siteName.indexOf('Tribe') + 5)]
    : [siteName, ''];

  return (
    <footer className="bg-charcoal text-cream py-16">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2 group">
              {site?.site_logo_url ? (
                <img src={site.site_logo_url} alt={siteName} className="w-10 h-10 rounded-xl object-contain" />
              ) : (
                <div className="w-10 h-10 rounded-lg bg-cream/10 border border-cream/20 flex items-center justify-center">
                  <Heart className="w-5 h-5 text-cream fill-current" />
                </div>
              )}
              <span className="font-display text-2xl font-semibold text-cream">
                {nameParts[0]}<span className="text-terracotta">{nameParts[1]}</span>
              </span>
            </Link>
            <p className="text-cream/70 text-sm leading-relaxed">
              {site?.footer_description || 'A creator agency and monetization platform — brand deals, fan support, events and merch, managed end to end.'}
            </p>
            <div className="flex gap-4">
              <a href={site?.social_twitter || '#'} className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Twitter className="w-4 h-4" />
              </a>
              <a href={site?.social_instagram || '#'} className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
              <a href={site?.social_youtube || '#'} className="w-10 h-10 rounded-full bg-cream/10 flex items-center justify-center hover:bg-terracotta transition-colors">
                <Youtube className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">For Brands</h4>
            <ul className="space-y-3">
              <li><Link to="/advertise" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Post a Brief</Link></li>
              <li><Link to="/explore" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Browse the Roster</Link></li>
              <li><Link to="/contact" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Talk to the Agency</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">For Creators</h4>
            <ul className="space-y-3">
              <li><Link to="/signup" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Join the Roster</Link></li>
              <li><Link to="/vote" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Creator Awards</Link></li>
              <li><Link to="/faq" className="text-cream/70 hover:text-terracotta transition-colors text-sm">FAQ</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-display text-lg font-semibold mb-4 text-cream">Legal</h4>
            <ul className="space-y-3">
              <li><Link to="/terms" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Terms of Service</Link></li>
              <li><Link to="/privacy" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Privacy Policy</Link></li>
              <li><Link to="/contact" className="text-cream/70 hover:text-terracotta transition-colors text-sm">Contact Us</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-cream/10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-cream/50 text-sm">
            {site?.copyright_text || '© 2026 All rights reserved.'}
          </p>
          <div className="flex items-center gap-2 text-cream/50 text-sm">
            <Mail className="w-4 h-4" />
            <a href={`mailto:${site?.contact_email || 'hello@tribeyangu.com'}`} className="hover:text-terracotta transition-colors">
              {site?.contact_email || 'hello@tribeyangu.com'}
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
