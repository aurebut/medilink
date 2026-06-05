import type { Profile } from './types';

export function isFeminine(profile?: Pick<Profile, 'candidateGender'> | null) {
  return profile?.candidateGender === 'FEMININE';
}

export function gendered(profile: Pick<Profile, 'candidateGender'> | null | undefined, masculine: string, feminine: string) {
  return isFeminine(profile) ? feminine : masculine;
}

export function candidateNoun(profile?: Pick<Profile, 'candidateGender'> | null) {
  return gendered(profile, 'candidat', 'candidate');
}

export function candidateNounCapitalized(profile?: Pick<Profile, 'candidateGender'> | null) {
  return gendered(profile, 'Candidat', 'Candidate');
}

export function candidateAreaLabel(profile?: Pick<Profile, 'candidateGender'> | null) {
  return `Espace ${candidateNoun(profile)}`;
}

export function candidateWithArticle(profile?: Pick<Profile, 'candidateGender'> | null) {
  return gendered(profile, 'le candidat', 'la candidate');
}

export function candidateContractedArticle(profile?: Pick<Profile, 'candidateGender'> | null) {
  return gendered(profile, 'au candidat', 'à la candidate');
}

export function candidateHas(profile?: Pick<Profile, 'candidateGender'> | null) {
  return `${candidateWithArticle(profile)} a`;
}

export function candidateIs(profile?: Pick<Profile, 'candidateGender'> | null) {
  return `${candidateWithArticle(profile)} est`;
}
