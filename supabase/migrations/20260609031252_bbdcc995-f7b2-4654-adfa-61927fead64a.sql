
-- 1. Extend app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lider_interno';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'decano';
