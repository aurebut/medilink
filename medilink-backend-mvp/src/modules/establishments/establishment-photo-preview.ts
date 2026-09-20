import type { EstablishmentPhoto } from '@prisma/client';
import type { EstablishmentsService } from './establishments.service';

/** A compact preview for an establishment already visible through its parent relation. */
export const establishmentPhotoPreviewInclude = {
  where: { uploadedAt: { not: null } },
  orderBy: [
    { isPrimary: 'desc' as const },
    { orderIndex: 'asc' as const },
    { createdAt: 'asc' as const },
  ],
  take: 1,
};

export async function withSignedEstablishmentPhotoPreview<T extends { photos: EstablishmentPhoto[] }>(
  establishment: T,
  establishments: EstablishmentsService,
): Promise<T> {
  if (!establishment.photos.length) return establishment;
  const { photos } = await establishments.withSignedPhotoUrls(establishment);
  // The shared signer also computes a completion score. Preserve the parent
  // response's existing fields; this preview only adds the uploaded photo URL.
  return { ...establishment, photos };
}
