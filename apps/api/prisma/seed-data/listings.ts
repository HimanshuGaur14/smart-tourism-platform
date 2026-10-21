import type { ListingType } from '@smart-tourism/contracts';

/**
 * Illustrative marketplace listings so the marketplace can be demonstrated.
 * They are NOT real businesses: every one is stored with isSample = true, owned by a
 * placeholder account that cannot log in, and labelled "Sample listing" in the UI.
 */
export const sampleListings: Array<{
  slug: string;
  type: ListingType;
  title: string;
  summary: string;
  description: string;
  destinationSlug: string;
  priceInfo?: string;
}> = [
  {
    slug: 'sample-netarhat-village-homestay',
    type: 'HOMESTAY',
    title: 'Village homestay near Netarhat',
    summary: 'Two simple rooms in a family home, with home-cooked meals.',
    description:
      'An example of how a homestay could be listed: two rooms with shared bathroom in a family home, vegetarian and non-vegetarian meals on request, and walks to nearby viewpoints with the hosts.',
    destinationSlug: 'netarhat',
    priceInfo: 'Example only: price on enquiry',
  },
  {
    slug: 'sample-betla-forest-guide',
    type: 'GUIDE',
    title: 'Naturalist walks around Betla',
    summary: 'Birding and forest-edge walks with a local naturalist.',
    description:
      'An example guide listing: morning birding walks outside the core zone and visits to the Palamu forts, led by a guide from a nearby village. Park safaris are booked separately through official channels.',
    destinationSlug: 'betla-national-park',
  },
  {
    slug: 'sample-maluti-terracotta-walk',
    type: 'CULTURAL_EXPERIENCE',
    title: 'Terracotta temple heritage walk, Maluti',
    summary: 'A slow walk through the temple cluster with stories of the panels.',
    description:
      'An example cultural experience: a two-hour walk through the temple cluster, looking at the terracotta panels and talking about conservation challenges.',
    destinationSlug: 'maluti',
  },
  {
    slug: 'sample-majuli-mask-workshop',
    type: 'ARTISAN',
    title: 'Mask-making demonstration, Majuli',
    summary: 'See how bamboo, clay and cloth masks are made for satra performances.',
    description:
      'An example artisan listing: a demonstration of traditional mask-making used in satra theatre, with masks available to buy directly from the makers.',
    destinationSlug: 'majuli',
  },
  {
    slug: 'sample-kutch-embroidery',
    type: 'HANDICRAFT',
    title: 'Kutchi embroidery collective',
    summary: 'Hand embroidery and mirror work from village artisans.',
    description:
      'An example handicraft listing: cushion covers, stoles and wall hangings with traditional Kutchi embroidery, sold directly by the artisans who make them.',
    destinationSlug: 'white-rann-dhordo',
  },
  {
    slug: 'sample-ziro-apatani-homestay',
    type: 'HOMESTAY',
    title: 'Apatani family homestay, Ziro',
    summary: 'Stay in a traditional house beside the rice fields.',
    description:
      'An example homestay listing: a room in a traditional bamboo house, with meals and an introduction to the valley’s rice-and-fish farming.',
    destinationSlug: 'ziro-valley',
  },
  {
    slug: 'sample-hampi-cycling-guide',
    type: 'GUIDE',
    title: 'Hampi by bicycle with a local guide',
    summary: 'A half-day ride through the ruins at an easy pace.',
    description:
      'An example guide listing: a half-day bicycle route through the sacred and royal centres of Hampi with a guide who grew up nearby.',
    destinationSlug: 'hampi',
  },
  {
    slug: 'sample-varanasi-weaving-visit',
    type: 'CULTURAL_EXPERIENCE',
    title: 'Banarasi handloom workshop visit',
    summary: 'Watch silk being woven on a pit loom and meet the weavers.',
    description:
      'An example cultural experience: a visit to a family handloom workshop, with time to talk to the weavers about designs and fair pricing.',
    destinationSlug: 'varanasi',
  },
];
