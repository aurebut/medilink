'use client';

import { useParams } from 'next/navigation';
import { useEstablishments } from '@/components/EstablishmentSelector';
import { EstablishmentPhotoManager } from '@/components/EstablishmentPhotoManager';
import { Card, LinkButton, LoadingCard, PageHeader } from '@/components/ui';

export default function EstablishmentPhotosPage() {
  const { id } = useParams<{ id: string }>();
  const { establishments, loading, reload } = useEstablishments();

  if (loading) return <LoadingCard label="Chargement de l'établissement..." />;

  const establishment = establishments.find((e) => e.id === id);

  if (!establishment) {
    return (
      <>
        <PageHeader
          title="Gestion des photos"
          description="L'établissement demandé n'existe pas ou ne vous appartient pas."
        />
        <Card>
          <p>Établissement introuvable.</p>
          <LinkButton href="/establishment/onboarding">Retour</LinkButton>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Photos de l'établissement"
        description={`Gérez les photos pour l'établissement : ${establishment.name}`}
        actions={<LinkButton href="/establishment/onboarding" variant="light">Retour</LinkButton>}
      />

      <div style={{ maxWidth: 800 }}>
        <Card>
          <h2>{establishment.name}</h2>
          <p className="text-secondary" style={{ marginBottom: 24 }}>
            Ces photos seront visibles par les candidats lors de la consultation de vos missions. La photo marquée "Principale" sera affichée en premier.
          </p>

          <EstablishmentPhotoManager
            establishmentId={establishment.id}
            photos={establishment.photos}
            onChanged={reload}
          />
        </Card>
      </div>
    </>
  );
}
