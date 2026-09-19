-- These tables are accessed through the NestJS backend using the table owner.
-- No Supabase client role should access them directly through the Data API.
-- Keep this separate from the already-applied creation migration.
BEGIN;

ALTER TABLE public."ReplacementDossier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReplacementDossierDocument" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ReplacementDossierDelivery" ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE
  public."ReplacementDossier",
  public."ReplacementDossierDocument",
  public."ReplacementDossierDelivery"
FROM PUBLIC, anon, authenticated;

COMMIT;
