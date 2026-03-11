CREATE OR REPLACE FUNCTION recalculate_all_tiers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  p1_cutoff INT;
  p2_cutoff INT;
BEGIN
  -- Get the current tier settings
  SELECT min_score INTO p1_cutoff FROM tier_settings WHERE tier = 'P1';
  SELECT min_score INTO p2_cutoff FROM tier_settings WHERE tier = 'P2';

  -- Default to fallback cutoffs if not set for some reason
  IF p1_cutoff IS NULL THEN p1_cutoff := 22; END IF;
  IF p2_cutoff IS NULL THEN p2_cutoff := 15; END IF;

  -- Update all existing results according to absolute points
  UPDATE results
  SET assigned_tier = 
    CASE 
      WHEN total_score > p1_cutoff THEN 'P1'::tier_level
      WHEN total_score > p2_cutoff THEN 'P2'::tier_level
      ELSE 'P3'::tier_level
    END;
END;
$$;
