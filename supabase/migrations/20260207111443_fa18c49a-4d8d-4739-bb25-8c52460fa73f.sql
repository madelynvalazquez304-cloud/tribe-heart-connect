-- Fix campaign doubling: Remove duplicate trigger
-- There are two triggers both calling update_campaign_stats():
-- 1. trg_update_campaign_stats (AFTER UPDATE OF status)
-- 2. update_campaign_stats_trigger (AFTER INSERT OR UPDATE)
-- The second one fires on ALL inserts AND updates, causing double counting.
-- Keep only the status-change trigger.

DROP TRIGGER IF EXISTS update_campaign_stats_trigger ON public.campaign_contributions;

-- Also recreate the remaining trigger to be more precise
DROP TRIGGER IF EXISTS trg_update_campaign_stats ON public.campaign_contributions;

CREATE TRIGGER trg_update_campaign_stats
  AFTER UPDATE OF status ON public.campaign_contributions
  FOR EACH ROW
  WHEN (NEW.status = 'completed' AND OLD.status IS DISTINCT FROM 'completed')
  EXECUTE FUNCTION public.update_campaign_stats();