-- Remove the last database RPC from the abandoned admin-key editing flow.
-- The deployed admin-presets Edge Function remains a 410 Gone compatibility endpoint.

drop function if exists public.admin_validate_token(text);
