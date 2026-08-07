import { ApiError } from './api';

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : '';
}

export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function userFacingError(
  error: unknown,
  fallback = 'Une erreur est survenue. Réessayez dans quelques instants.',
) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return 'Votre session a expiré. Reconnectez-vous pour continuer.';
    }
    if (error.status === 403) {
      return 'Votre rôle ne permet pas d’effectuer cette action.';
    }
    if (error.status >= 500) {
      return 'Le service est momentanément indisponible. Réessayez dans quelques instants.';
    }
    return error.message || fallback;
  }

  const message = error instanceof Error ? error.message : '';
  if (
    /failed to fetch|networkerror|network request failed|load failed/i.test(
      message,
    )
  ) {
    return 'Impossible de joindre le service. Vérifiez votre connexion puis réessayez.';
  }

  return message || fallback;
}
