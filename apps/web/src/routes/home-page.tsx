import { ArrowRight, CalendarRange, Hammer, Music, Users } from 'lucide-react';
import { Link } from 'react-router';
import {
  ButtonLink,
  Card,
  CardBody,
  Container,
  ForecastSourceBadge,
  Section,
  SmartImage,
} from '../components/ui';
import { categoryMeta } from '../features/destinations/categories';
import { CategoryTiles } from '../features/destinations/category-tiles';
import { DestinationRail } from '../features/destinations/destination-rail';
import { DestinationSearchForm } from '../features/destinations/destination-search-form';
import { useDocumentTitle } from '../hooks/use-document-title';
import { illustrations } from '../lib/images';

const seasons = [
  {
    name: 'Winter',
    months: 'October to February',
    text: 'Clear skies for heritage sites, deserts and wildlife safaris across the plains.',
    category: 'heritage',
  },
  {
    name: 'Summer',
    months: 'March to June',
    text: 'Head uphill: high valleys and hill towns are at their most accessible.',
    category: 'mountains',
  },
  {
    name: 'Monsoon',
    months: 'July to September',
    text: 'Waterfalls and forests at their fullest. Check local advisories before travelling.',
    category: 'waterfalls',
  },
] as const;

export function HomePage() {
  useDocumentTitle(undefined);
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-charcoal-100 bg-ivory-100">
        <Container className="grid items-center gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
          <div>
            <p className="eyebrow">Travel India, thoughtfully</p>
            <h1 className="mt-4 text-4xl leading-[1.08] sm:text-6xl">
              Find the India you haven’t seen yet.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-charcoal-600">
              Discover waterfalls, tribal heritage, forests and forgotten capitals across the
              country. Plan your route, meet local hosts, and pick quieter days to visit.
            </p>
            <DestinationSearchForm className="mt-8 max-w-xl" />
            <ul className="mt-5 flex flex-wrap gap-2" aria-label="Popular categories">
              {categoryMeta.slice(0, 5).map((category) => (
                <li key={category.slug}>
                  <Link
                    to={`/explore?category=${category.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-charcoal-200 bg-white px-3 py-1.5 text-sm text-charcoal-700 hover:border-forest-300 hover:text-forest-800"
                  >
                    <category.icon className="size-4" aria-hidden />
                    {category.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <SmartImage
              image={illustrations.hillsAtDawn}
              className="aspect-[4/3] w-full rounded-xl border border-charcoal-100"
              fetchPriority="high"
            />
          </div>
        </Container>
      </section>

      {/* Categories */}
      <Section
        eyebrow="Browse by interest"
        title="Every kind of journey"
        description="Start with what you love and we will show you where to find it."
      >
        <CategoryTiles />
      </Section>

      {/* Featured destinations */}
      <Section
        className="bg-white"
        eyebrow="Featured"
        title="Destinations across India"
        description="From well-known valleys to lesser-visited plateaus and ancient ports."
        actions={
          <ButtonLink to="/explore" variant="secondary">
            Explore all <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      >
        <DestinationRail kind="featured" limit={8} />
      </Section>

      {/* Hidden gems */}
      <Section
        eyebrow="Hidden gems"
        title="Lesser-known places worth the detour"
        description="Quieter destinations where your visit matters more to local communities."
        actions={
          <ButtonLink to="/explore?hiddenGem=true" variant="secondary">
            See all hidden gems <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        }
      >
        <DestinationRail kind="hidden-gems" limit={4} />
      </Section>

      {/* Seasonal discovery */}
      <Section
        eyebrow="When to go"
        title="Seasonal discovery"
        description="India’s seasons change what is worth seeing. A rough guide to get you started."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {seasons.map((season) => (
            <Card key={season.name}>
              <CardBody className="flex h-full flex-col">
                <CalendarRange className="size-5 text-terracotta-500" aria-hidden />
                <h3 className="mt-3 text-xl">{season.name}</h3>
                <p className="text-sm font-medium text-charcoal-500">{season.months}</p>
                <p className="mt-3 flex-1 text-charcoal-700">{season.text}</p>
                <Link
                  to={`/explore?category=${season.category}`}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-forest-700 hover:text-forest-900"
                >
                  See {season.category} <ArrowRight className="size-4" aria-hidden />
                </Link>
              </CardBody>
            </Card>
          ))}
        </div>
      </Section>

      {/* Crowd-aware travel */}
      <section className="bg-forest-800 py-16 text-forest-100 sm:py-20">
        <Container className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="eyebrow text-terracotta-200">Crowd-aware travel</p>
            <h2 className="mt-2 text-3xl text-ivory-50 sm:text-4xl">
              Go when it’s calmer, for you and for the place.
            </h2>
            <p className="mt-4 text-forest-200">
              We are building visitor-trend forecasts so you can choose quieter dates and
              lesser-known alternatives. Until the forecasting model is connected, any numbers you
              see are illustrative and are always labelled that way.
            </p>
            <ButtonLink to="/intelligence" variant="accent" className="mt-6">
              Open tourism intelligence
            </ButtonLink>
          </div>
          <div className="rounded-xl border border-forest-700 bg-forest-900/60 p-6">
            <p className="text-sm font-medium text-ivory-50">How forecasts are labelled</p>
            <ul className="mt-4 space-y-4 text-sm">
              <li className="flex items-start gap-3">
                <ForecastSourceBadge source="DEMO" />
                <span>Illustrative values for demonstration. Not real visitor data.</span>
              </li>
              <li className="flex items-start gap-3">
                <ForecastSourceBadge source="MODEL" />
                <span>Produced by the connected forecasting model, with its version shown.</span>
              </li>
              <li className="flex items-start gap-3">
                <ForecastSourceBadge source="UNAVAILABLE" />
                <span>
                  No forecast could be produced. We never fill the gap with made-up numbers.
                </span>
              </li>
            </ul>
          </div>
        </Container>
      </section>

      {/* Local experiences */}
      <Section
        eyebrow="Local marketplace"
        title="Stay with locals, buy from makers"
        description="Homestays, guides, artisans and cultural experiences listed directly by the people who run them."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              icon: Users,
              title: 'Homestays & guides',
              text: 'Stay in village homes and walk with people who know the trails.',
            },
            {
              icon: Hammer,
              title: 'Artisans & handicrafts',
              text: 'Find weavers, potters and metalworkers and enquire directly.',
            },
            {
              icon: Music,
              title: 'Cultural experiences',
              text: 'Cooking, music, festivals and craft workshops hosted locally.',
            },
          ].map(({ icon: Icon, title, text }) => (
            <Card key={title}>
              <CardBody>
                <Icon className="size-5 text-forest-600" aria-hidden />
                <h3 className="mt-3 text-lg">{title}</h3>
                <p className="mt-2 text-charcoal-600">{text}</p>
              </CardBody>
            </Card>
          ))}
        </div>
        <ButtonLink to="/marketplace" className="mt-8">
          Browse the marketplace
        </ButtonLink>
      </Section>
    </>
  );
}
