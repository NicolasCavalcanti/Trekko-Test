import React from "react";
import Link from "next/link";
import { Suspense } from "react";

// shadcn/ui (assuma instaladas)
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

// Icons
import { Search, MapPin, Mountain, Users, CalendarDays, ChevronRight } from "@/components/icons";

// ====== Tipos ======
export type CMSHomeHero = {
  title: string;
  subtitle: string;
  ctaPrimary?: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  background?: { url: string; alt?: string };
};

export type TrailCard = {
  id: string;
  name: string;
  state: string; // UF
  city: string;
  distanceKm: number;
  elevationGain: number;
  level: string; // Fácil/Médio/Difícil
  durationH: number;
  waterPoints: boolean;
  camping: boolean;
  photos?: { url: string; alt?: string }[];
  expeditionsCount?: number; // derivado no backend
};

export type ExpeditionCard = {
  id: string;
  title: string;
  trail: { id: string; name: string; state: string; city: string };
  startDate: string;
  endDate: string;
  pricePerHead: number;
  maxPeople: number;
  booked?: number;
  guide: { id: string; name: string; verified?: boolean };
};

// ====== Fetchers (Server) ======
async function fetchCMSHero(): Promise<CMSHomeHero | null> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/cms/home.hero?locale=pt-BR`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Espera: { payload: { title, subtitle, ... } }
    return json?.payload ?? null;
  } catch {
    return null;
  }
}

async function fetchHighlightTrails(): Promise<TrailCard[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/trails?status=published&sort=createdAt.asc&limit=12`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.items ?? [];
  } catch {
    return [];
  }
}

async function fetchUpcomingExpeditions(): Promise<ExpeditionCard[]> {
  try {
    const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || ""}/api/expeditions?status=published&dateFrom=today&dateTo=+60d&limit=8`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json?.items ?? [];
  } catch {
    return [];
  }
}

// ====== Util ======
function formatBRL(n: number) {
  try {
    return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(n);
  } catch {
    return `R$ ${n.toFixed(2)}`;
  }
}

function dateRangeLabel(startISO: string, endISO: string) {
  const s = new Date(startISO);
  const e = new Date(endISO);
  const sameMonth = s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear();
  const fmt = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" });
  const fmy = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  return sameMonth ? `${fmt.format(s)} – ${fmy.format(e)}` : `${fmy.format(s)} – ${fmy.format(e)}`;
}

// ====== Componentes de UI ======
function Hero({ hero }: { hero: CMSHomeHero | null }) {
  return (
    <section className="relative w-full overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-900 via-slate-900 to-slate-800 text-white shadow-xl">
      {/* Background image (dinâmico via CMS) */}
      {hero?.background?.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={hero.background.url}
          alt={hero.background.alt || "Paisagem de montanha"}
          className="absolute inset-0 h-full w-full object-cover opacity-30"
        />
      )}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col gap-6 px-6 py-16 md:flex-row md:items-center md:justify-between md:py-20">
        <div className="max-w-2xl">
          <h1 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {hero?.title || "Descubra trilhas reais, reserve expedições com guias verificados"}
          </h1>
          <p className="mt-4 text-slate-100/90 md:text-lg">
            {hero?.subtitle || "Conectamos você a parques e montanhas do Brasil com segurança, transparência e suporte."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {hero?.ctaPrimary ? (
              <Button asChild size="lg" className="rounded-2xl">
                <Link href={hero.ctaPrimary.href}>{hero.ctaPrimary.label}</Link>
              </Button>
            ) : (
              <Button asChild size="lg" className="rounded-2xl">
                <Link href="/trilhas">Explorar trilhas</Link>
              </Button>
            )}
            {hero?.ctaSecondary ? (
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/30 text-white hover:bg-white/10">
                <Link href={hero.ctaSecondary.href}>{hero.ctaSecondary.label}</Link>
              </Button>
            ) : (
              <Button asChild size="lg" variant="outline" className="rounded-2xl border-white/30 text-white hover:bg-white/10">
                <Link href="/guias">Organizar expedições</Link>
              </Button>
            )}
          </div>
        </div>

        <div className="mt-8 w-full max-w-xl md:mt-0">
          <SearchBox />
        </div>
      </div>
    </section>
  );
}

function SearchBox() {
  // Componente client-side em implementação real (autocomplete). Aqui apenas formulário SSR amigável.
  return (
    <form action="/trilhas" className="rounded-2xl border border-white/10 bg-white/10 p-3 backdrop-blur">
      <div className="flex items-center gap-3 rounded-xl bg-white p-2">
        <Search className="h-5 w-5 text-slate-500" />
        <Input name="q" placeholder="Busque por trilha, estado, cidade ou guia" className="border-0 focus-visible:ring-0" />
        <Button type="submit" className="rounded-xl">Buscar</Button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <Badge variant="secondary" className="justify-center">Água no caminho</Badge>
        <Badge variant="secondary" className="justify-center">Camping</Badge>
        <Badge variant="secondary" className="justify-center">Até 10 km</Badge>
        <Badge variant="secondary" className="justify-center">Nível: Médio</Badge>
      </div>
    </form>
  );
}

function TrailCardItem({ t }: { t: TrailCard }) {
  const photo = t.photos?.[0]?.url;
  return (
    <Card className="group overflow-hidden rounded-2xl transition hover:shadow-xl">
      <div className="relative aspect-[16/10] w-full overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo || "/images/placeholder-trail.jpg"}
          alt={t.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
        />
        <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-xs font-medium">
          <MapPin className="h-3.5 w-3.5" /> {t.city}, {t.state}
        </div>
      </div>
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1 text-base font-semibold">{t.name}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1"><Mountain className="h-4 w-4" /> {t.elevationGain} m</span>
          <span className="inline-flex items-center gap-1"><Users className="h-4 w-4" /> {t.level}</span>
          <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {t.durationH} h</span>
        </div>
        <div className="flex flex-wrap gap-2 pt-1">
          {t.waterPoints && <Badge variant="secondary">Água</Badge>}
          {t.camping && <Badge variant="secondary">Camping</Badge>}
          {typeof t.expeditionsCount === "number" && (
            <Badge>{t.expeditionsCount} expedição(ões)</Badge>
          )}
        </div>
        <div className="pt-2">
          <Button asChild variant="link" className="p-0">
            <Link href={`/trilhas/${t.id}`} className="inline-flex items-center gap-1">
              Ver detalhes <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExpeditionCardItem({ e }: { e: ExpeditionCard }) {
  const booked = e.booked ?? 0;
  const left = Math.max(e.maxPeople - booked, 0);
  return (
    <Card className="overflow-hidden rounded-2xl transition hover:shadow-xl">
      <CardHeader className="pb-2">
        <CardTitle className="line-clamp-1 text-base font-semibold">{e.title}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-2 pb-4 text-sm text-slate-600">
        <div className="flex flex-wrap items-center gap-2 text-slate-700">
          <MapPin className="h-4 w-4" /> {e.trail.city}, {e.trail.state} • {e.trail.name}
        </div>
        <div className="text-slate-700">{dateRangeLabel(e.startDate, e.endDate)}</div>
        <div className="flex items-center justify-between pt-1">
          <span className="font-semibold">{formatBRL(e.pricePerHead)} / pessoa</span>
          <Badge variant={left > 0 ? "default" : "secondary"}>{left > 0 ? `${left} vagas` : "Esgotado"}</Badge>
        </div>
        <div className="pt-2">
          <Button asChild variant="link" className="p-0">
            <Link href={`/expedicoes/${e.id}`} className="inline-flex items-center gap-1">
              Reservar <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionHeader({ title, subtitle, href }: { title: string; subtitle?: string; href?: string }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold md:text-2xl">{title}</h2>
        {subtitle && <p className="text-sm text-slate-600">{subtitle}</p>}
      </div>
      {href && (
        <Button asChild variant="outline" className="rounded-xl">
          <Link href={href}>Ver tudo</Link>
        </Button>
      )}
    </div>
  );
}

function GridSkeleton({ rows = 1, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-${cols}`}>
      {Array.from({ length: rows * cols }).map((_, i) => (
        <Card key={i} className="rounded-2xl">
          <Skeleton className="h-40 w-full" />
          <div className="space-y-2 p-4">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-8 w-24" />
          </div>
        </Card>
      ))}
    </div>
  );
}

// ====== Página (Server Component) ======
export default async function HomePage() {
  const [hero, trails, expeditions] = await Promise.all([
    fetchCMSHero(),
    fetchHighlightTrails(),
    fetchUpcomingExpeditions(),
  ]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-12">
      {/* HERO */}
      <Hero hero={hero} />

      {/* TRILHAS EM DESTAQUE (primeiras cadastradas ou lógica de destaque vinda do backend) */}
      <section className="mt-10 md:mt-14">
        <SectionHeader
          title="Trilhas em destaque"
          subtitle="Seleção dinâmica baseada no banco (ordem: criadas primeiro ou curadoria CMS)."
          href="/trilhas"
        />
        <Suspense fallback={<GridSkeleton rows={1} cols={4} />}>
          {trails.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {trails.map((t) => (
                <TrailCardItem key={t.id} t={t} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-8 text-center text-slate-600">Sem trilhas disponíveis no momento.</div>
          )}
        </Suspense>
      </section>

      {/* PRÓXIMAS EXPEDIÇÕES */}
      <section className="mt-12 md:mt-16">
        <SectionHeader
          title="Próximas expedições"
          subtitle="Listadas pelo período (próximos 60 dias), 100% do banco."
          href="/expedicoes"
        />
        <Suspense fallback={<GridSkeleton rows={1} cols={4} />}>
          {expeditions.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {expeditions.map((e) => (
                <ExpeditionCardItem key={e.id} e={e} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border p-8 text-center text-slate-600">Sem expedições publicadas no período.</div>
          )}
        </Suspense>
      </section>

      {/* CTA GUIAS VERIFICADOS */}
      <section className="mt-12 rounded-3xl border bg-gradient-to-br from-emerald-50 to-slate-50 p-8 md:mt-16 md:p-12">
        <div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <div>
            <h3 className="text-lg font-bold md:text-xl">É guia verificado no Cadastur?</h3>
            <p className="mt-1 text-slate-600">Publique expedições, gerencie vagas e receba pagamentos com transparência.</p>
          </div>
          <Button asChild size="lg" className="rounded-2xl">
            <Link href="/guias">Começar agora</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}

