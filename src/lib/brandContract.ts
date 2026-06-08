export type ContractInput = {
  brand_name: string;
  brand_contact_name?: string;
  brand_email?: string;
  creator_display_name: string;
  creator_username?: string;
  campaign_title: string;
  brief?: string;
  deliverables?: string;
  gross_amount: number;
  creator_amount: number;
  platform_fee: number;
  currency: string;
  start_date?: string | null;
  end_date?: string | null;
  invoice_number?: string;
};

export function generateContractHtml(d: ContractInput): string {
  const today = new Date().toLocaleDateString();
  const period = d.start_date && d.end_date ? `${d.start_date} → ${d.end_date}` : 'To be agreed in writing';
  return `<!doctype html><meta charset="utf-8"><div style="font-family:Inter,system-ui;line-height:1.6;color:#111;max-width:780px;margin:auto;padding:24px">
  <h1 style="font-size:22px;margin:0">Brand Deal Agreement</h1>
  <p style="color:#666;margin:4px 0 24px">Invoice ${d.invoice_number || '—'} · Drafted ${today}</p>
  <h3>Parties</h3>
  <p><strong>Brand (Advertiser):</strong> ${d.brand_name}${d.brand_contact_name ? ` — represented by ${d.brand_contact_name}` : ''}${d.brand_email ? ` (${d.brand_email})` : ''}.<br/>
  <strong>Creator:</strong> ${d.creator_display_name}${d.creator_username ? ` (@${d.creator_username})` : ''}.<br/>
  <strong>Platform (Escrow Agent):</strong> TribeYangu.</p>
  <h3>Scope of Work</h3>
  <p><strong>Campaign:</strong> ${d.campaign_title}</p>
  ${d.brief ? `<p><strong>Brief:</strong><br/>${d.brief.replace(/\n/g,'<br/>')}</p>` : ''}
  ${d.deliverables ? `<p><strong>Deliverables:</strong><br/>${d.deliverables.replace(/\n/g,'<br/>')}</p>` : ''}
  <p><strong>Performance Period:</strong> ${period}</p>
  <h3>Compensation & Escrow</h3>
  <ul>
    <li>Total contract value: <strong>${d.currency} ${Number(d.gross_amount).toLocaleString()}</strong></li>
    <li>Platform service fee: ${d.currency} ${Number(d.platform_fee).toLocaleString()}</li>
    <li>Net to creator: <strong>${d.currency} ${Number(d.creator_amount).toLocaleString()}</strong></li>
  </ul>
  <p>The Brand will remit the full contract value to TribeYangu, which holds the funds in escrow. Funds are released to the Creator after deliverables are submitted and either (a) approved by the Brand or (b) auto-released 7 calendar days after submission if no rejection is filed.</p>
  <h3>Approval & Revisions</h3>
  <p>The Brand may request up to two rounds of reasonable revisions within the 7-day approval window. Disputes are escalated to the Platform for binding mediation.</p>
  <h3>Intellectual Property & Usage Rights</h3>
  <p>Upon full payment, the Brand obtains a non-exclusive, worldwide license to use the delivered content on its owned channels and paid media for 12 months. The Creator retains authorship and may showcase the work in their portfolio.</p>
  <h3>Confidentiality, Conduct & Compliance</h3>
  <p>Both parties will keep non-public information confidential, disclose the relationship per applicable advertising regulations (e.g. #ad/#sponsored), and avoid content that is unlawful, defamatory, or violates platform policies.</p>
  <h3>Termination & Refunds</h3>
  <p>Either party may terminate before delivery for material breach. If the Creator fails to deliver, the Platform refunds the Brand. If the Brand cancels without cause after acceptance, a 30% kill-fee is released to the Creator.</p>
  <h3>E-Signature</h3>
  <p>By clicking "I agree" in the TribeYangu dashboard, each party acknowledges they have read, understood, and accepted this Agreement. Electronic acceptance has the same legal effect as a handwritten signature.</p>
  </div>`;
}