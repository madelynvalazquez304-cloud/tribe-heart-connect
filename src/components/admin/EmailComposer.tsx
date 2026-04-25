import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Send, Smartphone, Monitor, Eye, Code2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useSiteSettings } from '@/hooks/useSiteSettings';

export interface EmailComposerRecipient {
  email: string;
  name?: string;
  creator_link?: string;
  username?: string;
}

interface EmailComposerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recipient?: EmailComposerRecipient | null;
  /** When true, shows a recipient input (for ad-hoc sends from settings). */
  allowRecipientEdit?: boolean;
  defaultSubject?: string;
  defaultBody?: string;
}

const PLACEHOLDERS: { key: string; label: string; sample: string }[] = [
  { key: 'recipient_name', label: 'Recipient name', sample: 'Jane' },
  { key: 'creator_link', label: 'Creator profile link', sample: 'https://example.com/@jane' },
  { key: 'site_name', label: 'Site name', sample: 'TribeYangu' },
  { key: 'site_url', label: 'Site URL', sample: 'https://tribeyangu.com' },
  { key: 'support_email', label: 'Support email', sample: 'support@tribeyangu.com' },
  { key: 'action_url', label: 'CTA / action URL', sample: 'https://tribeyangu.com/dashboard' },
  { key: 'action_label', label: 'CTA button label', sample: 'Open dashboard' },
];

function render(tpl: string, data: Record<string, string>) {
  return tpl.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, k) => (data[k] ?? ''));
}

const wrapTemplate = (innerHtml: string, data: Record<string, string>) => {
  const cta = data.action_url
    ? `<div style="text-align:center;margin:28px 0;"><a href="${data.action_url}" style="display:inline-block;background:hsl(350,78%,55%);color:#fff;text-decoration:none;padding:14px 28px;border-radius:10px;font-weight:600;font-family:Arial,sans-serif;">${data.action_label || 'Open'}</a></div>`
    : '';
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f5f7;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 6px 24px rgba(0,0,0,0.06);">
        <tr><td style="background:linear-gradient(135deg,hsl(350,78%,55%),hsl(350,78%,42%));padding:22px 28px;color:#fff;">
          <div style="font-size:18px;font-weight:700;letter-spacing:.2px;">${data.site_name || 'TribeYangu'}</div>
        </td></tr>
        <tr><td style="padding:28px;font-size:15px;line-height:1.6;color:#1a1a1a;">
          <p style="margin:0 0 14px;">Hi ${data.recipient_name || 'there'},</p>
          <div>${innerHtml}</div>
          ${cta}
        </td></tr>
        <tr><td style="padding:18px 28px;border-top:1px solid #ececec;font-size:12px;color:#777;text-align:center;">
          ${data.site_name || 'TribeYangu'} · <a href="mailto:${data.support_email || ''}" style="color:#777;">${data.support_email || ''}</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
};

export const EmailComposer: React.FC<EmailComposerProps> = ({
  open, onOpenChange, recipient, allowRecipientEdit, defaultSubject, defaultBody,
}) => {
  const site = useSiteSettings();
  const [to, setTo] = useState(recipient?.email || '');
  const [subject, setSubject] = useState(defaultSubject || 'A note from {{site_name}}');
  const [body, setBody] = useState(defaultBody || 'We wanted to reach out personally about your account.');
  const [sending, setSending] = useState(false);
  const [view, setView] = useState<'mobile' | 'desktop'>('mobile');

  React.useEffect(() => { if (open) setTo(recipient?.email || ''); }, [open, recipient]);

  const data = useMemo<Record<string, string>>(() => ({
    recipient_name: recipient?.name || to.split('@')[0] || 'there',
    creator_link: recipient?.creator_link || (recipient?.username ? `${window.location.origin}/@${recipient.username}` : ''),
    site_name: site?.site_name || 'TribeYangu',
    site_url: window.location.origin,
    support_email: site?.contact_email || 'support@tribeyangu.com',
    action_url: recipient?.creator_link || `${window.location.origin}/dashboard`,
    action_label: 'Open dashboard',
  }), [recipient, to, site]);

  const renderedSubject = render(subject, data);
  const renderedInner = render(body.replace(/\n/g, '<br/>'), data);
  const previewHtml = wrapTemplate(renderedInner, data);

  const insertPlaceholder = (key: string) => setBody((b) => `${b}{{${key}}}`);

  const handleSend = async () => {
    if (!to) return toast.error('Recipient email is required');
    if (!subject.trim() || !body.trim()) return toast.error('Subject and message are required');
    setSending(true);
    try {
      const { data: res, error } = await supabase.functions.invoke('send-custom-email', {
        body: {
          recipient: to,
          recipient_name: data.recipient_name,
          subject: renderedSubject,
          message_html: previewHtml,
        },
      });
      if (error) throw error;
      if ((res as any)?.error) throw new Error((res as any).error);
      toast.success(`Email sent to ${to}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || 'Failed to send');
    } finally { setSending(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Compose email</DialogTitle>
          <DialogDescription>
            Insert dynamic placeholders and preview the mobile-responsive template before sending via SMTP.
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-5">
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>To</Label>
              <Input
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                disabled={!allowRecipientEdit && !!recipient?.email}
                placeholder="user@example.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Subject</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Message</Label>
              <Textarea
                rows={9}
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Write your message. Use placeholders like {{recipient_name}} or {{creator_link}}."
              />
              <div className="flex flex-wrap gap-1.5">
                {PLACEHOLDERS.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => insertPlaceholder(p.key)}
                    className="text-xs px-2 py-1 rounded-md border border-border bg-secondary hover:bg-secondary/80 text-secondary-foreground"
                    title={`Inserts {{${p.key}}} — sample: ${p.sample}`}
                  >
                    + {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5"><Eye className="w-4 h-4" /> Live preview</Label>
                <TabsList>
                  <TabsTrigger value="mobile" className="gap-1.5"><Smartphone className="w-3.5 h-3.5" />Mobile</TabsTrigger>
                  <TabsTrigger value="desktop" className="gap-1.5"><Monitor className="w-3.5 h-3.5" />Desktop</TabsTrigger>
                </TabsList>
              </div>
              <TabsContent value="mobile" className="mt-2">
                <div className="mx-auto border border-border rounded-2xl overflow-hidden bg-muted" style={{ width: 320, height: 540 }}>
                  <iframe title="mobile-preview" srcDoc={previewHtml} className="w-full h-full bg-white" />
                </div>
              </TabsContent>
              <TabsContent value="desktop" className="mt-2">
                <div className="border border-border rounded-lg overflow-hidden bg-muted" style={{ height: 540 }}>
                  <iframe title="desktop-preview" srcDoc={previewHtml} className="w-full h-full bg-white" />
                </div>
              </TabsContent>
            </Tabs>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
              <Code2 className="w-3.5 h-3.5" /> Subject preview: <span className="font-medium text-foreground truncate">{renderedSubject}</span>
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSend} disabled={sending} className="gap-2">
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send via SMTP
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default EmailComposer;