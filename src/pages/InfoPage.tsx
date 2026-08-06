import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useSiteSettings } from "@/hooks/useSiteSettings";

type Section = { heading: string; body: string[] };

const InfoPage = ({ title, intro, sections }: { title: string; intro: string; sections: Section[] }) => {
  const { data: site } = useSiteSettings();
  const brand = site?.site_name || 'the platform';

  return (
    <div className="pb-20 md:pb-0">
      <Header />
      <section className="bg-charcoal text-cream pt-28 pb-16 md:pt-36 md:pb-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <h1 className="font-display text-3xl md:text-5xl font-bold mb-4">{title}</h1>
          <p className="text-cream/70 text-lg">{intro}</p>
        </div>
      </section>
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4 max-w-3xl space-y-10">
          {sections.map((s) => (
            <article key={s.heading}>
              <h2 className="font-display text-xl md:text-2xl font-semibold mb-3">{s.heading}</h2>
              {s.body.map((p, i) => (
                <p key={i} className="text-muted-foreground leading-relaxed mb-3">
                  {p.replace(/\{brand\}/g, brand)}
                </p>
              ))}
            </article>
          ))}
          <p className="text-sm text-muted-foreground border-t border-border pt-6">
            Questions? Email{' '}
            <a className="text-accent hover:underline" href={`mailto:${site?.contact_email || 'hello@example.com'}`}>
              {site?.contact_email || 'hello@example.com'}
            </a>.
          </p>
        </div>
      </section>
      <Footer />
    </div>
  );
};

export const FaqPage = () => (
  <InfoPage
    title="Frequently asked questions"
    intro="How representation, payouts and brand deals work for both sides."
    sections={[
      { heading: 'How do I join the roster?', body: ['Create an account, complete your profile and request creator access. Every application is reviewed by our team before your page goes live.'] },
      { heading: 'What does the agency handle?', body: ['We source and negotiate brand partnerships, issue contracts and invoices, hold campaign budgets in escrow and release payment once deliverables are approved.'] },
      { heading: 'How and when am I paid?', body: ['Fan support, ticket sales, merch orders and gifts settle to your balance. You can request a withdrawal to mobile money at any time, subject to any holding period on event revenue.'] },
      { heading: 'What does it cost?', body: ['A flat platform fee is deducted from earnings. Brand deal commissions are always stated in the agreement before you sign.'] },
      { heading: 'How do brands get started?', body: ['Submit a campaign brief with your budget and audience. We return a shortlist, contract the talent and manage delivery from there.'] },
    ]}
  />
);

export const TermsPage = () => (
  <InfoPage
    title="Terms of Service"
    intro="The rules that govern use of {brand} for creators, brands and supporters."
    sections={[
      { heading: 'Accounts', body: ['You must provide accurate information and keep your credentials secure. Creator accounts require review and approval before publishing a public page.'] },
      { heading: 'Payments and payouts', body: ['All transactions are recorded before settlement and only completed once the payment provider confirms them. Withdrawals are paid to the mobile-money number on your account and may be held pending verification.'] },
      { heading: 'Brand deals and escrow', body: ['Brand budgets are held until agreed deliverables are submitted and approved, or until an automatic release window elapses. Disputes are reviewed by the platform before any release or refund.'] },
      { heading: 'Acceptable use', body: ['Fraud, impersonation, unlawful content and attempts to circumvent fees or escrow will result in suspension and forfeiture of pending balances.'] },
      { heading: 'Changes', body: ['These terms may be updated as the service evolves. Continued use after an update constitutes acceptance.'] },
    ]}
  />
);

export const PrivacyPage = () => (
  <InfoPage
    title="Privacy Policy"
    intro="What {brand} collects, why it is collected, and how it is protected."
    sections={[
      { heading: 'What we collect', body: ['Account details such as name, email and phone number, plus transaction records needed to process payments and payouts.'] },
      { heading: 'Phone numbers', body: ['Phone numbers are used strictly for payouts, transaction confirmations and account security. They are never displayed publicly or shared with brands or supporters.'] },
      { heading: 'How data is used', body: ['To operate your account, process payments, prevent fraud, send transactional notifications and produce reporting for campaigns you take part in.'] },
      { heading: 'Security', body: ['Access is restricted by row-level security policies, and sensitive credentials are stored encrypted and never exposed to the browser.'] },
      { heading: 'Your choices', body: ['You may request correction or deletion of your personal data. Records required for financial and legal compliance may be retained.'] },
    ]}
  />
);

export default InfoPage;
