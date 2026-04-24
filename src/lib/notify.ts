import { supabase } from '@/integrations/supabase/client';

export type NotificationEvent =
  | 'donation_confirmed'
  | 'gift_confirmed'
  | 'vote_confirmed'
  | 'ticket_confirmed'
  | 'order_confirmed'
  | 'campaign_contribution'
  | 'withdrawal_requested'
  | 'withdrawal_approved'
  | 'withdrawal_rejected'
  | 'creator_approved'
  | 'two_factor_code';

/**
 * Fire-and-forget client trigger for transactional notifications.
 * Always fails silently — UI flows must not block on email delivery.
 */
export async function notify(
  event_type: NotificationEvent,
  recipient: string,
  data: Record<string, any> = {},
  channel: 'email' | 'sms' = 'email',
) {
  if (!recipient) return;
  try {
    await supabase.functions.invoke('send-notification', {
      body: { event_type, recipient, channel, data },
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn('[notify] failed', event_type, e);
  }
}

/**
 * Look up the email of a creator (via profiles).
 */
export async function getCreatorEmail(creatorId: string): Promise<string | null> {
  const { data } = await supabase
    .from('creators')
    .select('user_id, profiles:user_id(email)')
    .eq('id', creatorId)
    .maybeSingle();
  // @ts-ignore — joined profiles row
  return (data as any)?.profiles?.email ?? null;
}