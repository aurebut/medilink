const exactNotificationText: Record<string, string> = {
  'Mission recommandee': 'Mission recommandée',
  'Statut candidature mis a jour': 'Statut candidature mis à jour',
  'Document valide': 'Document validé',
  'Document refuse': 'Document refusé',
  'Proposition finale envoyee': 'Proposition finale envoyée',
  'Proposition acceptee, paiement requis': 'Proposition acceptée, paiement requis',
  'Proposition refusee': 'Proposition refusée',
  'Paiement securise': 'Paiement sécurisé',
  'Mission terminee': 'Mission terminée',
  'Paiement libere': 'Paiement libéré',
  'Factures generees': 'Factures générées',
  'Mise a jour de la mission': 'Mise à jour de la mission',
};

export function formatNotificationText(value: string) {
  return (exactNotificationText[value] || value)
    .replace(/\ba postule\b/g, 'a postulé')
    .replace(/\ba votre profil\b/g, 'à votre profil')
    .replace(/\ba ete valide\b/g, 'a été validé')
    .replace(/\ba ete refuse\b/g, 'a été refusé')
    .replace(/\bVous avez recu\b/g, 'Vous avez reçu')
    .replace(/\benvoyee\b/g, 'envoyée')
    .replace(/\bconsultee\b/g, 'consultée')
    .replace(/\bacceptee\b/g, 'acceptée')
    .replace(/\brefusee\b/g, 'refusée')
    .replace(/\bretiree\b/g, 'retirée')
    .replace(/\bannulee\b/g, 'annulée')
    .replace(/\bdiplome\b/g, 'diplôme')
    .replace(/\bpiece d'identite\b/g, "pièce d'identité")
    .replace(/\bpiece jointe\b/g, 'pièce jointe');
}
