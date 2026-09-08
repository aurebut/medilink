export type GuideSource = { label: string; url: string };
export type GuideImage = {
  src: string;
  alt: string;
  credit: string;
  creditUrl?: string;
};
export type GuideSection = {
  id: string;
  title: string;
  paragraphs: string[];
  checklist?: string[];
  template?: string;
  sources?: GuideSource[];
  links?: GuideSource[];
  table?: { caption: string; headers: string[]; rows: string[][] };
};
export type Guide = {
  slug: string;
  title: string;
  seoTitle: string;
  shortTitle: string;
  topic: 'Débuter' | 'Choisir une mission' | 'Conditions et contrat' | 'Vie du cabinet';
  description: string;
  audience: 'Médecins remplaçants' | 'Cabinets médicaux' | 'Médecins et cabinets';
  published: string;
  updated: string;
  image: GuideImage;
  intro: string;
  takeaway: string;
  sections: GuideSection[];
  faq?: { question: string; answer: string }[];
  related: string[];
  cta: { label: string; href: string; text: string };
};
