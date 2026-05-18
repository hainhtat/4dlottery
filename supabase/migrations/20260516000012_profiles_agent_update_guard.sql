-- Agents may only change display_name and phone on their own profile.

CREATE OR REPLACE FUNCTION profiles_guard_agent_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF auth.uid() IS NULL OR is_admin() THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    NEW.commission_rate := OLD.commission_rate;
    NEW.credit_warning_threshold := OLD.credit_warning_threshold;
    NEW.is_active := OLD.is_active;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_before_update_guard ON profiles;

CREATE TRIGGER profiles_before_update_guard
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION profiles_guard_agent_update();
