import type { Profile } from './types';

export function isFeminine(profile?: Pick<Profile, 'candidateGender'> | null) {
  return profile?.candidateGender === 'FEMININE';
}

export function candidateNoun(profile?: Pick<Profile, 'candidateGender'> | null) {
  return isFeminine(profile) ? 'candidate' : 'candidat';
}

export function candidateWithArticle(profile?: Pick<Profile, 'candidateGender'> | null) {
  return isFeminine(profile) ? 'la candidate' : 'le candidat';
}

export function candidateContractedArticle(profile?: Pick<Profile, 'candidateGender'> | null) {
  return isFeminine(profile) ? 'a la candidate' : 'au candidat';
}

export function candidateHas(profile?: Pick<Profile, 'candidateGender'> | null) {
  return `${candidateWithArticle(profile)} a`;
}
