ALTER TABLE IF EXISTS public._prisma_migrations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public._prisma_migrations FROM anon;
REVOKE ALL ON TABLE public._prisma_migrations FROM authenticated;
