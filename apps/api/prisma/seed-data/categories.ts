import type { DestinationCategorySlug } from '@smart-tourism/contracts';

export const categories: Array<{
  slug: DestinationCategorySlug;
  name: string;
  description: string;
}> = [
  { slug: 'nature', name: 'Nature', description: 'Forests, valleys, lakes and quiet landscapes.' },
  {
    slug: 'wildlife',
    name: 'Wildlife',
    description: 'National parks, tiger reserves and wetlands.',
  },
  {
    slug: 'waterfalls',
    name: 'Waterfalls',
    description: 'Falls that are at their fullest after the monsoon.',
  },
  {
    slug: 'heritage',
    name: 'Heritage',
    description: 'Archaeological sites, forts, temples and old capitals.',
  },
  {
    slug: 'spirituality',
    name: 'Spirituality',
    description: 'Pilgrimage centres, monasteries and sacred sites.',
  },
  {
    slug: 'culture',
    name: 'Culture',
    description: 'Living traditions, crafts, festivals and tribal heritage.',
  },
  { slug: 'adventure', name: 'Adventure', description: 'Treks, high passes and outdoor journeys.' },
  { slug: 'beaches', name: 'Beaches', description: 'Coastlines and islands.' },
  {
    slug: 'mountains',
    name: 'Mountains',
    description: 'Hill stations, high valleys and Himalayan lakes.',
  },
];
