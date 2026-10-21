import type { DestinationCategorySlug } from '@smart-tourism/contracts';

/**
 * Seed destinations.
 *
 * Facts were written from general reference knowledge and cross-checked against the
 * listed Wikipedia articles where possible. Coordinates are approximate (to ~0.01°) and
 * every record ships with `coordinatesVerified: false` until someone checks it against
 * the cited source; the UI labels such locations as approximate.
 *
 * No photos are seeded: image URLs must be verified (and licences recorded) before use.
 */
export interface SeedDestination {
  slug: string;
  name: string;
  state: string;
  district: string;
  category: DestinationCategorySlug;
  shortDescription: string;
  description: string;
  latitude: number;
  longitude: number;
  tags: string[];
  bestTimeToVisit?: string;
  responsibleTips: string[];
  sourceUrls: string[];
  featured?: boolean;
  hiddenGem?: boolean;
}

const wiki = (title: string) => `https://en.wikipedia.org/wiki/${title}`;

const LEAVE_NO_TRACE = 'Carry your waste back out; many sites have no collection.';
const LOCAL_GUIDES = 'Hire local guides and stay in locally run accommodation where you can.';
const QUIET_WILDLIFE = 'Keep noise down and never feed or approach wild animals.';
const ASK_PHOTOS = 'Ask before photographing people, homes and rituals.';
const DRESS_MODESTLY = 'Dress modestly and follow footwear rules at places of worship.';
const MONUMENTS = 'Do not climb on, touch or scratch ancient structures.';
const MONSOON_SAFETY =
  'Stay behind barriers near falls; rocks are slippery and water levels rise quickly.';
const PERMITS = 'Check current permit requirements before you travel.';
const ALTITUDE = 'Acclimatise gradually; high altitude sickness is a real risk.';

export const destinations: SeedDestination[] = [
  // ---------- Jharkhand ----------
  {
    slug: 'netarhat',
    name: 'Netarhat',
    state: 'Jharkhand',
    district: 'Latehar',
    category: 'mountains',
    shortDescription:
      'A quiet hill station on the Chota Nagpur Plateau, known for its sunrise and sunset viewpoints.',
    description:
      'Netarhat sits at roughly 1,100 m on the Chota Nagpur Plateau, surrounded by sal and pine forest. Visitors come for the sunrise views and for the sunset at Magnolia Point, and for walks through the surrounding forest and tribal villages. It is far quieter than better-known hill stations.',
    latitude: 23.47,
    longitude: 84.27,
    tags: ['hill station', 'sunrise', 'forest', 'plateau'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [LOCAL_GUIDES, LEAVE_NO_TRACE, ASK_PHOTOS],
    sourceUrls: [wiki('Netarhat')],
    featured: true,
    hiddenGem: true,
  },
  {
    slug: 'maluti',
    name: 'Maluti',
    state: 'Jharkhand',
    district: 'Dumka',
    category: 'heritage',
    shortDescription: 'A village of terracotta temples, many decorated with scenes from the epics.',
    description:
      'Maluti is a small village with a remarkable cluster of terracotta temples, mostly built between the 17th and 19th centuries under local rulers. Many temple facades carry terracotta panels showing scenes from the Ramayana and Mahabharata. Several temples are fragile and under conservation.',
    latitude: 24.15,
    longitude: 87.72,
    tags: ['terracotta', 'temples', 'architecture', 'village'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [MONUMENTS, DRESS_MODESTLY, LOCAL_GUIDES],
    sourceUrls: [wiki('Maluti')],
    hiddenGem: true,
  },
  {
    slug: 'betla-national-park',
    name: 'Betla National Park',
    state: 'Jharkhand',
    district: 'Latehar',
    category: 'wildlife',
    shortDescription: 'Sal forests, elephants and gaur within the Palamau Tiger Reserve.',
    description:
      'Betla National Park lies within the Palamau Tiger Reserve, one of the early reserves under Project Tiger. The forests support elephants, gaur, deer and a wide variety of birds. The ruins of the old Palamu forts stand near the park.',
    latitude: 23.89,
    longitude: 84.19,
    tags: ['national park', 'elephants', 'safari', 'forts'],
    bestTimeToVisit: 'November to April',
    responsibleTips: [
      QUIET_WILDLIFE,
      'Use authorised safari vehicles and stay on marked routes.',
      LEAVE_NO_TRACE,
    ],
    sourceUrls: [wiki('Betla_National_Park'), wiki('Palamau_Tiger_Reserve')],
  },
  {
    slug: 'hundru-falls',
    name: 'Hundru Falls',
    state: 'Jharkhand',
    district: 'Ranchi',
    category: 'waterfalls',
    shortDescription: 'The Subarnarekha river drops off the plateau edge in a tall, wide fall.',
    description:
      'Hundru Falls is formed where the Subarnarekha river falls from the edge of the Ranchi plateau. It is among the highest falls in Jharkhand and is at its most powerful during and just after the monsoon. Steps lead down to the base.',
    latitude: 23.45,
    longitude: 85.65,
    tags: ['waterfall', 'river', 'monsoon', 'day trip'],
    bestTimeToVisit: 'July to October',
    responsibleTips: [MONSOON_SAFETY, LEAVE_NO_TRACE],
    sourceUrls: [wiki('Hundru_Falls')],
  },
  {
    slug: 'dassam-falls',
    name: 'Dassam Falls',
    state: 'Jharkhand',
    district: 'Ranchi',
    category: 'waterfalls',
    shortDescription: 'A broad fall on the Kanchi river, surrounded by forest.',
    description:
      'Dassam Falls is a natural cascade on the Kanchi river, a tributary of the Subarnarekha, near Ranchi. Water spreads over a rocky ledge into a deep pool. Strong currents make swimming dangerous.',
    latitude: 23.14,
    longitude: 85.47,
    tags: ['waterfall', 'river', 'forest', 'day trip'],
    bestTimeToVisit: 'July to November',
    responsibleTips: [MONSOON_SAFETY, 'Do not swim in the plunge pool.', LEAVE_NO_TRACE],
    sourceUrls: [wiki('Dassam_Falls')],
  },
  {
    slug: 'parasnath-hill',
    name: 'Parasnath Hill (Shikharji)',
    state: 'Jharkhand',
    district: 'Giridih',
    category: 'spirituality',
    shortDescription:
      'The highest peak in Jharkhand and one of the most sacred Jain pilgrimage sites.',
    description:
      'Parasnath Hill, known to Jains as Shikharji, is the highest point in Jharkhand. Jain tradition holds that most of the Tirthankaras attained moksha here, and pilgrims walk a long circuit to the temples on the summit, traditionally starting before dawn.',
    latitude: 23.96,
    longitude: 86.13,
    tags: ['jain', 'pilgrimage', 'trek', 'temples'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [
      DRESS_MODESTLY,
      'Respect pilgrim customs; avoid carrying non-vegetarian food on the hill.',
      LEAVE_NO_TRACE,
    ],
    sourceUrls: [wiki('Parasnath'), wiki('Shikharji')],
  },
  // ---------- North-east ----------
  {
    slug: 'ziro-valley',
    name: 'Ziro Valley',
    state: 'Arunachal Pradesh',
    district: 'Lower Subansiri',
    category: 'culture',
    shortDescription: 'Pine-ringed rice fields and the home of the Apatani people.',
    description:
      'Ziro Valley is home to the Apatani people, known for their integrated rice and fish farming and their traditional village layouts. The valley is on UNESCO’s tentative list for its cultural landscape and hosts an annual music festival in autumn.',
    latitude: 27.54,
    longitude: 93.83,
    tags: ['apatani', 'rice fields', 'festival', 'tribal heritage'],
    bestTimeToVisit: 'March to October',
    responsibleTips: [
      PERMITS + ' Indian visitors need an Inner Line Permit.',
      ASK_PHOTOS,
      LOCAL_GUIDES,
    ],
    sourceUrls: [wiki('Ziro'), wiki('Apatani_people')],
    featured: true,
  },
  {
    slug: 'majuli',
    name: 'Majuli',
    state: 'Assam',
    district: 'Majuli',
    category: 'culture',
    shortDescription:
      'A large river island in the Brahmaputra, centre of Assam’s Vaishnavite satras.',
    description:
      'Majuli is a river island in the Brahmaputra and the centre of the neo-Vaishnavite satra tradition founded by Srimanta Sankardeva. The satras keep alive dance, music and mask-making traditions. The island is reached by ferry and is affected by river erosion.',
    latitude: 26.95,
    longitude: 94.17,
    tags: ['river island', 'satra', 'mask making', 'brahmaputra'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [
      DRESS_MODESTLY,
      ASK_PHOTOS,
      'Buy masks and crafts directly from makers at the satras.',
    ],
    sourceUrls: [wiki('Majuli')],
    featured: true,
  },
  {
    slug: 'dzukou-valley',
    name: 'Dzukou Valley',
    state: 'Nagaland',
    district: 'Kohima',
    category: 'adventure',
    shortDescription: 'Rolling green hills reached by trek, on the Nagaland–Manipur border.',
    description:
      'Dzukou Valley is a high valley of rolling, grass-covered hills on the border of Nagaland and Manipur, reached on foot from villages near Kohima. It is known for seasonal wildflowers, including the Dzukou lily. Overnight stays are basic.',
    latitude: 25.56,
    longitude: 94.07,
    tags: ['trek', 'valley', 'wildflowers', 'camping'],
    bestTimeToVisit: 'June to September for flowers; October to March for clear skies',
    responsibleTips: [LEAVE_NO_TRACE, 'Do not light fires; the grasslands burn easily.', PERMITS],
    sourceUrls: [wiki('Dzükou_Valley')],
    hiddenGem: true,
  },
  {
    slug: 'khonoma',
    name: 'Khonoma',
    state: 'Nagaland',
    district: 'Kohima',
    category: 'culture',
    shortDescription: 'An Angami village known for community-led conservation and terraced fields.',
    description:
      'Khonoma is an Angami Naga village near Kohima, often described as India’s first green village after its community banned hunting and set up a conservation sanctuary. Terraced rice fields surround the village.',
    latitude: 25.65,
    longitude: 94.02,
    tags: ['angami', 'village', 'conservation', 'terraces'],
    bestTimeToVisit: 'October to May',
    responsibleTips: [LOCAL_GUIDES, ASK_PHOTOS, PERMITS],
    sourceUrls: [wiki('Khonoma')],
    hiddenGem: true,
  },
  {
    slug: 'kaziranga-national-park',
    name: 'Kaziranga National Park',
    state: 'Assam',
    district: 'Golaghat',
    category: 'wildlife',
    shortDescription:
      'Floodplain grasslands that hold most of the world’s greater one-horned rhinos.',
    description:
      'Kaziranga National Park, a UNESCO World Heritage Site, protects grasslands and wetlands on the Brahmaputra floodplain. It is home to a large share of the world’s greater one-horned rhinoceros, along with elephants, wild water buffalo and tigers. Parts of the park close in the monsoon.',
    latitude: 26.58,
    longitude: 93.17,
    tags: ['rhino', 'unesco', 'safari', 'grassland'],
    bestTimeToVisit: 'November to April',
    responsibleTips: [QUIET_WILDLIFE, 'Use authorised safari operators only.'],
    sourceUrls: [wiki('Kaziranga_National_Park')],
    featured: true,
  },
  {
    slug: 'mawlynnong',
    name: 'Mawlynnong',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    category: 'culture',
    shortDescription: 'A Khasi village famed for cleanliness, near a living root bridge.',
    description:
      'Mawlynnong is a Khasi village known for its community-maintained cleanliness and gardens. A living root bridge, grown from the roots of rubber fig trees, is a short walk away at Riwai.',
    latitude: 25.2,
    longitude: 91.92,
    tags: ['khasi', 'village', 'root bridge'],
    bestTimeToVisit: 'October to May',
    responsibleTips: ['Use the village bins and follow local cleanliness rules.', ASK_PHOTOS],
    sourceUrls: [wiki('Mawlynnong')],
  },
  {
    slug: 'nongriat-root-bridges',
    name: 'Nongriat Living Root Bridges',
    state: 'Meghalaya',
    district: 'East Khasi Hills',
    category: 'nature',
    shortDescription: 'A steep trek down to the famous double-decker living root bridge.',
    description:
      'Nongriat is a village below Cherrapunji (Sohra), reached by a long stairway trek. It is known for living root bridges trained by Khasi communities, including a double-decker bridge, and for natural pools along the trail.',
    latitude: 25.25,
    longitude: 91.67,
    tags: ['root bridge', 'trek', 'khasi', 'rainforest'],
    bestTimeToVisit: 'October to April',
    responsibleTips: ['Do not carve, pull or hang from the roots.', LEAVE_NO_TRACE, LOCAL_GUIDES],
    sourceUrls: [wiki('Living_root_bridge')],
    hiddenGem: true,
  },
  // ---------- Himalaya ----------
  {
    slug: 'tirthan-valley',
    name: 'Tirthan Valley',
    state: 'Himachal Pradesh',
    district: 'Kullu',
    category: 'nature',
    shortDescription: 'A trout river valley at the gateway to the Great Himalayan National Park.',
    description:
      'Tirthan Valley follows the Tirthan river, known for trout, and leads to the Great Himalayan National Park, a UNESCO World Heritage Site. Villages offer homestays and walks to waterfalls and forest trails.',
    latitude: 31.63,
    longitude: 77.45,
    tags: ['river', 'trout', 'homestays', 'national park'],
    bestTimeToVisit: 'March to June; September to November',
    responsibleTips: [
      LOCAL_GUIDES,
      'Fishing needs a permit and is catch-and-release in many stretches.',
      LEAVE_NO_TRACE,
    ],
    sourceUrls: [wiki('Tirthan_Valley'), wiki('Great_Himalayan_National_Park')],
    hiddenGem: true,
  },
  {
    slug: 'spiti-valley',
    name: 'Spiti Valley',
    state: 'Himachal Pradesh',
    district: 'Lahaul and Spiti',
    category: 'mountains',
    shortDescription: 'A cold desert valley of monasteries and high villages.',
    description:
      'Spiti is a high-altitude cold desert valley with a strong Tibetan Buddhist heritage. Key Monastery near Kaza and villages such as Kibber and Langza are popular stops. Roads can close in winter.',
    latitude: 32.23,
    longitude: 78.07,
    tags: ['monastery', 'cold desert', 'road trip', 'buddhism'],
    bestTimeToVisit: 'May to October',
    responsibleTips: [ALTITUDE, 'Refill water bottles instead of buying plastic.', DRESS_MODESTLY],
    sourceUrls: [wiki('Spiti_Valley')],
  },
  {
    slug: 'tso-moriri',
    name: 'Tso Moriri',
    state: 'Ladakh',
    district: 'Leh',
    category: 'mountains',
    shortDescription: 'A remote high-altitude lake in the Changthang plateau.',
    description:
      'Tso Moriri is a high-altitude lake in the Changthang region of Ladakh and a Ramsar wetland. Changpa herders graze their animals nearby, and the lake is important for breeding birds. The village of Korzok sits on its shore.',
    latitude: 32.9,
    longitude: 78.31,
    tags: ['lake', 'ramsar', 'changthang', 'high altitude'],
    bestTimeToVisit: 'June to September',
    responsibleTips: [ALTITUDE, PERMITS, 'Do not drive off-road; the wetland edges are fragile.'],
    sourceUrls: [wiki('Tso_Moriri')],
  },
  {
    slug: 'valley-of-flowers',
    name: 'Valley of Flowers',
    state: 'Uttarakhand',
    district: 'Chamoli',
    category: 'nature',
    shortDescription: 'An alpine meadow that bursts into bloom during the monsoon.',
    description:
      'The Valley of Flowers National Park is an alpine valley known for its meadows of wildflowers, together with Nanda Devi National Park forming a UNESCO World Heritage Site. It is reached by trek from Govindghat via Ghangaria and is open only in the warmer months.',
    latitude: 30.73,
    longitude: 79.6,
    tags: ['unesco', 'trek', 'wildflowers', 'alpine'],
    bestTimeToVisit: 'July to September',
    responsibleTips: [
      'Stay on the trail and never pick flowers.',
      LEAVE_NO_TRACE,
      'Camping inside the park is not allowed.',
    ],
    sourceUrls: [wiki('Valley_of_Flowers_National_Park')],
    featured: true,
  },
  {
    slug: 'chopta-tungnath',
    name: 'Chopta and Tungnath',
    state: 'Uttarakhand',
    district: 'Rudraprayag',
    category: 'adventure',
    shortDescription: 'Meadows and a short trek to one of the highest Shiva temples.',
    description:
      'Chopta is a meadow and forest area that is the starting point for the trek to Tungnath, among the highest Shiva temples in the world and one of the Panch Kedar, and further on to Chandrashila peak.',
    latitude: 30.49,
    longitude: 79.21,
    tags: ['trek', 'temple', 'meadow', 'snow'],
    bestTimeToVisit: 'April to June; September to November',
    responsibleTips: [LEAVE_NO_TRACE, DRESS_MODESTLY, ALTITUDE],
    sourceUrls: [wiki('Tungnath'), wiki('Chopta')],
  },
  // ---------- West and central ----------
  {
    slug: 'dholavira',
    name: 'Dholavira',
    state: 'Gujarat',
    district: 'Kachchh',
    category: 'heritage',
    shortDescription:
      'A Harappan city with remarkable water management, on Khadir island in the Rann.',
    description:
      'Dholavira is one of the largest known cities of the Harappan (Indus Valley) civilisation, inscribed as a UNESCO World Heritage Site in 2021. It is known for its stone-built reservoirs and planned layout. A small museum sits beside the site.',
    latitude: 23.89,
    longitude: 70.21,
    tags: ['harappan', 'unesco', 'archaeology', 'rann'],
    bestTimeToVisit: 'November to February',
    responsibleTips: [MONUMENTS, 'Carry water; facilities are limited.'],
    sourceUrls: [wiki('Dholavira')],
    featured: true,
  },
  {
    slug: 'white-rann-dhordo',
    name: 'White Rann at Dhordo',
    state: 'Gujarat',
    district: 'Kachchh',
    category: 'culture',
    shortDescription: 'The salt flats of the Great Rann and Kutch’s craft villages.',
    description:
      'Near Dhordo village, the Great Rann of Kutch dries into vast white salt flats in winter, when the Rann Utsav festival is held. Nearby villages are known for embroidery, mirror work and other Kutchi crafts.',
    latitude: 23.83,
    longitude: 69.65,
    tags: ['salt desert', 'crafts', 'festival', 'embroidery'],
    bestTimeToVisit: 'November to February',
    responsibleTips: [
      PERMITS,
      'Buy crafts directly from artisans and ask before photographing them.',
    ],
    sourceUrls: [wiki('Rann_of_Kutch'), wiki('Dhordo')],
  },
  {
    slug: 'mandu',
    name: 'Mandu',
    state: 'Madhya Pradesh',
    district: 'Dhar',
    category: 'heritage',
    shortDescription: 'A ruined hilltop capital of palaces, mosques and stepwells.',
    description:
      'Mandu (Mandav) was the capital of the Malwa sultanate. Its monuments, including the Jahaz Mahal, Hindola Mahal and Rani Roopmati’s Pavilion, are spread across a plateau above the Narmada plains. The site is especially green in the monsoon.',
    latitude: 22.36,
    longitude: 75.39,
    tags: ['palaces', 'malwa', 'architecture', 'monsoon'],
    bestTimeToVisit: 'July to March',
    responsibleTips: [MONUMENTS, LOCAL_GUIDES],
    sourceUrls: [wiki('Mandu,_Madhya_Pradesh')],
    hiddenGem: true,
  },
  {
    slug: 'bhimbetka',
    name: 'Bhimbetka Rock Shelters',
    state: 'Madhya Pradesh',
    district: 'Raisen',
    category: 'heritage',
    shortDescription: 'Rock shelters with paintings spanning thousands of years.',
    description:
      'The Rock Shelters of Bhimbetka are a UNESCO World Heritage Site with paintings that show early human life, animals and hunting, from prehistoric periods onward. The shelters sit in forested hills south of Bhopal.',
    latitude: 22.94,
    longitude: 77.61,
    tags: ['rock art', 'unesco', 'prehistory'],
    bestTimeToVisit: 'October to March',
    responsibleTips: ['Never touch the paintings; skin oils damage them.', MONUMENTS],
    sourceUrls: [wiki('Bhimbetka_rock_shelters')],
  },
  {
    slug: 'kanha-national-park',
    name: 'Kanha National Park',
    state: 'Madhya Pradesh',
    district: 'Mandla',
    category: 'wildlife',
    shortDescription: 'Sal forests and meadows, home of the hard-ground barasingha.',
    description:
      'Kanha National Park is a tiger reserve of sal forest and grassy meadows. It is known for its conservation of the hard-ground barasingha (swamp deer), which was brought back from near extinction here. Core zones close during the monsoon.',
    latitude: 22.33,
    longitude: 80.61,
    tags: ['tiger reserve', 'barasingha', 'safari'],
    bestTimeToVisit: 'October to June',
    responsibleTips: [QUIET_WILDLIFE, 'Book safaris through the official portal.'],
    sourceUrls: [wiki('Kanha_National_Park')],
  },
  {
    slug: 'lonar-lake',
    name: 'Lonar Lake',
    state: 'Maharashtra',
    district: 'Buldhana',
    category: 'nature',
    shortDescription: 'A saline lake inside a meteorite impact crater.',
    description:
      'Lonar Lake fills a crater formed by a meteorite impact in basalt rock. Its water is both saline and alkaline, and the lake is a Ramsar wetland. Old temples stand around the crater rim and floor.',
    latitude: 19.98,
    longitude: 76.51,
    tags: ['crater', 'lake', 'ramsar', 'geology'],
    bestTimeToVisit: 'October to February',
    responsibleTips: [LEAVE_NO_TRACE, 'Do not bathe in or disturb the lake water.'],
    sourceUrls: [wiki('Lonar_Lake')],
    hiddenGem: true,
  },
  // ---------- South ----------
  {
    slug: 'hampi',
    name: 'Hampi',
    state: 'Karnataka',
    district: 'Vijayanagara',
    category: 'heritage',
    shortDescription: 'The boulder-strewn ruins of the Vijayanagara capital.',
    description:
      'Hampi was the capital of the Vijayanagara Empire. Its temples, bazaars and royal structures, set among granite boulders along the Tungabhadra river, form a UNESCO World Heritage Site. The Virupaksha Temple is still in active worship.',
    latitude: 15.33,
    longitude: 76.46,
    tags: ['vijayanagara', 'unesco', 'ruins', 'boulders'],
    bestTimeToVisit: 'October to February',
    responsibleTips: [MONUMENTS, DRESS_MODESTLY, 'Hire bicycles or e-rickshaws to reduce traffic.'],
    sourceUrls: [wiki('Hampi')],
    featured: true,
  },
  {
    slug: 'gandikota',
    name: 'Gandikota',
    state: 'Andhra Pradesh',
    district: 'YSR Kadapa',
    category: 'heritage',
    shortDescription: 'A fort above a dramatic gorge cut by the Penna river.',
    description:
      'Gandikota is a fort village set above a deep gorge of the Penna (Pennar) river, often compared to a canyon. Inside the fort are a temple, a mosque and granaries. Sunrise over the gorge is the main draw.',
    latitude: 14.81,
    longitude: 78.29,
    tags: ['gorge', 'fort', 'camping', 'sunrise'],
    bestTimeToVisit: 'October to February',
    responsibleTips: ['Stay back from the gorge edge; there are few barriers.', LEAVE_NO_TRACE],
    sourceUrls: [wiki('Gandikota')],
    hiddenGem: true,
  },
  {
    slug: 'jog-falls',
    name: 'Jog Falls',
    state: 'Karnataka',
    district: 'Shivamogga',
    category: 'waterfalls',
    shortDescription: 'One of India’s highest plunge waterfalls, on the Sharavathi river.',
    description:
      'Jog Falls is created by the Sharavathi river dropping in four streams into a deep gorge in the Western Ghats. Its flow depends on monsoon rains and upstream dam releases, so it can be thin in the dry season.',
    latitude: 14.23,
    longitude: 74.81,
    tags: ['waterfall', 'western ghats', 'monsoon'],
    bestTimeToVisit: 'August to December',
    responsibleTips: [MONSOON_SAFETY, LEAVE_NO_TRACE],
    sourceUrls: [wiki('Jog_Falls')],
  },
  {
    slug: 'gokarna',
    name: 'Gokarna',
    state: 'Karnataka',
    district: 'Uttara Kannada',
    category: 'beaches',
    shortDescription: 'A temple town with a string of quiet beaches linked by coastal trails.',
    description:
      'Gokarna is a temple town, home to the Mahabaleshwar Temple, with several beaches nearby such as Om Beach, Kudle and Half Moon, connected by headland walks.',
    latitude: 14.55,
    longitude: 74.32,
    tags: ['beach', 'temple town', 'coastal trek'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [
      'Swim only where locals advise; currents can be strong.',
      DRESS_MODESTLY,
      LEAVE_NO_TRACE,
    ],
    sourceUrls: [wiki('Gokarna,_Karnataka')],
  },
  {
    slug: 'athirappilly-falls',
    name: 'Athirappilly Falls',
    state: 'Kerala',
    district: 'Thrissur',
    category: 'waterfalls',
    shortDescription: 'A wide waterfall on the Chalakudy river in forested hills.',
    description:
      'Athirappilly Falls is a broad waterfall on the Chalakudy river at the edge of the Sholayar forests, which support hornbills and other wildlife. It is at its fullest during and after the monsoon.',
    latitude: 10.29,
    longitude: 76.57,
    tags: ['waterfall', 'western ghats', 'hornbills'],
    bestTimeToVisit: 'June to January',
    responsibleTips: [MONSOON_SAFETY, 'Plastic is restricted in the forest area.'],
    sourceUrls: [wiki('Athirappilly_Falls')],
  },
  // ---------- East ----------
  {
    slug: 'chilika-lake',
    name: 'Chilika Lake',
    state: 'Odisha',
    district: 'Khordha',
    category: 'wildlife',
    shortDescription: 'A vast brackish lagoon with Irrawaddy dolphins and winter migratory birds.',
    description:
      'Chilika is a large brackish-water lagoon on Odisha’s coast and a Ramsar wetland. It is a major wintering ground for migratory birds, especially around Nalabana Island, and is home to Irrawaddy dolphins, often seen from boats near Satapada.',
    latitude: 19.72,
    longitude: 85.32,
    tags: ['lagoon', 'birds', 'dolphins', 'ramsar'],
    bestTimeToVisit: 'November to February',
    responsibleTips: ['Ask boat operators to keep their distance from dolphins.', QUIET_WILDLIFE],
    sourceUrls: [wiki('Chilika_Lake')],
  },
  {
    slug: 'konark',
    name: 'Konark Sun Temple',
    state: 'Odisha',
    district: 'Puri',
    category: 'heritage',
    shortDescription: 'A 13th-century temple built as the chariot of the Sun god.',
    description:
      'The Sun Temple at Konark, a UNESCO World Heritage Site, was built in the 13th century in the form of a huge chariot with carved stone wheels and horses. It is a high point of Kalinga architecture.',
    latitude: 19.89,
    longitude: 86.09,
    tags: ['temple', 'unesco', 'sculpture', 'kalinga'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [MONUMENTS, LOCAL_GUIDES],
    sourceUrls: [wiki('Konark_Sun_Temple')],
  },
  {
    slug: 'sundarbans',
    name: 'Sundarbans',
    state: 'West Bengal',
    district: 'South 24 Parganas',
    category: 'wildlife',
    shortDescription: 'Tidal mangrove forests and creeks, home to the Bengal tiger.',
    description:
      'The Sundarbans are the world’s largest mangrove forest, spread across the Ganges–Brahmaputra delta in India and Bangladesh. The Indian part is a tiger reserve and UNESCO World Heritage Site, explored by boat through tidal creeks.',
    latitude: 22.12,
    longitude: 88.83,
    tags: ['mangroves', 'tiger', 'unesco', 'boat safari'],
    bestTimeToVisit: 'November to March',
    responsibleTips: [
      QUIET_WILDLIFE,
      'Stay inside boats and fenced areas; tigers are present.',
      LOCAL_GUIDES,
    ],
    sourceUrls: [wiki('Sundarbans_National_Park')],
  },
  {
    slug: 'bodh-gaya',
    name: 'Bodh Gaya',
    state: 'Bihar',
    district: 'Gaya',
    category: 'spirituality',
    shortDescription: 'Where the Buddha attained enlightenment, at the Mahabodhi Temple.',
    description:
      'Bodh Gaya is the site where Siddhartha Gautama is said to have attained enlightenment under the Bodhi tree. The Mahabodhi Temple Complex is a UNESCO World Heritage Site, surrounded by monasteries built by Buddhist communities from many countries.',
    latitude: 24.7,
    longitude: 84.99,
    tags: ['buddhism', 'unesco', 'pilgrimage', 'monasteries'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [DRESS_MODESTLY, 'Keep silence near meditating pilgrims.'],
    sourceUrls: [wiki('Bodh_Gaya'), wiki('Mahabodhi_Temple')],
  },
  {
    slug: 'varanasi',
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    district: 'Varanasi',
    category: 'spirituality',
    shortDescription: 'One of the world’s oldest living cities, on the ghats of the Ganga.',
    description:
      'Varanasi stretches along a curve of the Ganga with dozens of ghats, used for bathing, rituals and cremations. The evening aarti at Dashashwamedh Ghat draws large crowds, and the old city is known for Banarasi silk weaving.',
    latitude: 25.32,
    longitude: 83.01,
    tags: ['ghats', 'ganga', 'aarti', 'silk'],
    bestTimeToVisit: 'October to March',
    responsibleTips: [
      'Do not photograph cremations at the burning ghats.',
      DRESS_MODESTLY,
      'Buy silk from weaver cooperatives.',
    ],
    sourceUrls: [wiki('Varanasi')],
  },
  // ---------- Islands ----------
  {
    slug: 'swaraj-dweep',
    name: 'Swaraj Dweep (Havelock Island)',
    state: 'Andaman and Nicobar Islands',
    district: 'South Andaman',
    category: 'beaches',
    shortDescription: 'White-sand beaches and coral reefs in the Andaman Sea.',
    description:
      'Swaraj Dweep, formerly Havelock Island, is reached by ferry from Sri Vijaya Puram (Port Blair). Radhanagar Beach is its best-known stretch of sand, and the surrounding reefs are popular for snorkelling and diving.',
    latitude: 11.97,
    longitude: 92.99,
    tags: ['island', 'coral reef', 'snorkelling', 'beach'],
    bestTimeToVisit: 'November to April',
    responsibleTips: ['Never touch or stand on coral; use reef-safe sunscreen.', LEAVE_NO_TRACE],
    sourceUrls: [wiki('Swaraj_Dweep')],
    featured: true,
  },
];
