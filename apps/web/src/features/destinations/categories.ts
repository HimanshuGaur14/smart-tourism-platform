import type { DestinationCategorySlug } from '@smart-tourism/contracts';
import {
  Drama,
  Droplets,
  Flower2,
  Landmark,
  MountainSnow,
  PawPrint,
  Tent,
  Trees,
  Waves,
  type LucideIcon,
} from 'lucide-react';

export interface CategoryMeta {
  slug: DestinationCategorySlug;
  label: string;
  blurb: string;
  icon: LucideIcon;
}

/**
 * UI presentation for the shared category vocabulary. The category records
 * themselves are served by the API from Phase 2; this only adds icons and copy.
 */
export const categoryMeta: CategoryMeta[] = [
  { slug: 'nature', label: 'Nature', blurb: 'Forests, valleys and quiet trails', icon: Trees },
  { slug: 'wildlife', label: 'Wildlife', blurb: 'National parks and sanctuaries', icon: PawPrint },
  { slug: 'waterfalls', label: 'Waterfalls', blurb: 'Best seen after the monsoon', icon: Droplets },
  { slug: 'heritage', label: 'Heritage', blurb: 'Forts, ruins and ancient cities', icon: Landmark },
  {
    slug: 'spirituality',
    label: 'Spirituality',
    blurb: 'Temples, monasteries and ghats',
    icon: Flower2,
  },
  {
    slug: 'culture',
    label: 'Culture',
    blurb: 'Crafts, festivals and tribal heritage',
    icon: Drama,
  },
  { slug: 'adventure', label: 'Adventure', blurb: 'Treks, camps and river runs', icon: Tent },
  { slug: 'beaches', label: 'Beaches', blurb: 'Coastlines beyond the obvious', icon: Waves },
  {
    slug: 'mountains',
    label: 'Mountains',
    blurb: 'High passes and hill towns',
    icon: MountainSnow,
  },
];
