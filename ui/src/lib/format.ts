export const slugToName = (slug: string) =>
  slug.split('_').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
