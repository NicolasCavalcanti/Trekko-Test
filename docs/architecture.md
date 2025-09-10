# Arquitetura do Trekko

## 1. Arquitetura Geral

| Camada | Tecnologia sugerida | Observações |
| --- | --- | --- |
| Frontend | Next.js/React | SSR para SEO, roteamento por página, internacionalização futura. |
| Backend API | Node.js + Express/Nest | Organização em módulos (users, trails, expeditions…). |
| Banco de Dados | PostgreSQL via Prisma ORM | Suporte a relacionamentos e migrates. |
| Autenticação | JWT (JSON Web Token) via Passport.js/NextAuth | Roles: visitante, trekker, guia, admin. |
| Armazenamento de mídia | AWS S3/GCP Storage | Upload de fotos de trilhas, guias, etc. |
| Filas/Background Jobs | BullMQ/Redis | Envio de e-mails, reconciliações. |
| CMS | Headless CMS (Strapi, Sanity) ou módulo interno | Posts, páginas estáticas, FAQs. |
| Deploy | Docker + Kubernetes ou Vercel/Render | CI/CD com GitHub Actions. |
| Observabilidade | Logs estruturados (Winston), métricas (Prometheus) | Alertas via Grafana/Datadog. |

## 2. Organização de Repositório (monorepo sugerido)

```
/app
  /web            # Next.js (UI)
  /api            # Node/Nest (serviços REST/GraphQL)
  /cms            # (opcional) código do CMS headless
  /scripts        # migrações, seeds, jobs
  /infra          # Dockerfiles, kubernetes, terraform
```

## 3. Modelos de Dados (Prisma)

```prisma
model User {
  id         Int       @id @default(autoincrement())
  name       String
  email      String     @unique
  password   String
  role       Role       @default(TREKKER)
  phone      String?
  language   String?
  status     UserStatus @default(ACTIVE)
  guideProfile GuideProfile?
  bookings   Booking[]
  reviews    Review[]   @relation("AuthorReviews")
}

model GuideProfile {
  id          Int    @id @default(autoincrement())
  user        User   @relation(fields: [userId], references: [id])
  userId      Int    @unique
  cadasturId  String
  bio         String?
  regions     String[]
  languages   String[]
  rating      Float   @default(0)
  verified    Boolean @default(false)
  expeditions Expedition[]
}

model Trail {
  id            Int      @id @default(autoincrement())
  name          String
  state         String
  city          String
  biome         String?
  distanceKm    Float
  elevationGain Int?
  level         String
  duration      Int      // horas
  water         Boolean  @default(false)
  camping       Boolean  @default(false)
  park          String?
  status        TrailStatus @default(DRAFT)
  expeditions   Expedition[]
  reviews       Review[] @relation("TrailReviews")
  media         Media[]
}

model Expedition {
  id         Int      @id @default(autoincrement())
  trail      Trail    @relation(fields: [trailId], references: [id])
  trailId    Int
  guide      GuideProfile @relation(fields: [guideId], references: [id])
  guideId    Int
  title      String
  description String?
  dates      DateTime[]
  pricePP    Decimal
  seatsMax   Int
  policies   String?
  status     ExpeditionStatus @default(DRAFT)
  bookings   Booking[]
  reviews    Review[] @relation("ExpeditionReviews")
}

model Booking {
  id           Int      @id @default(autoincrement())
  expedition   Expedition @relation(fields: [expeditionId], references: [id])
  expeditionId Int
  trekker      User      @relation(fields: [trekkerId], references: [id])
  trekkerId    Int
  qtyPeople    Int
  totalValue   Decimal
  status       BookingStatus @default(PENDING)
  payments     Payment[]
}

model Payment {
  id        Int      @id @default(autoincrement())
  booking   Booking  @relation(fields: [bookingId], references: [id])
  bookingId Int
  method    PaymentMethod
  value     Decimal
  fee       Decimal
  split     Decimal
  status    PaymentStatus
  gatewayId String?
}

model Review {
  id          Int    @id @default(autoincrement())
  author      User   @relation("AuthorReviews", fields: [authorId], references: [id])
  authorId    Int
  targetType  ReviewTarget
  targetId    Int
  rating      Int
  text        String?
  status      ReviewStatus @default(PENDING)
}

enum Role { TREKKER GUIDE ADMIN }
enum UserStatus { ACTIVE BLOCKED }
enum TrailStatus { DRAFT PUBLISHED ARCHIVED }
enum ExpeditionStatus { DRAFT PUBLISHED FULL CANCELLED }
enum BookingStatus { PENDING PAID CANCELLED REFUNDED }
enum PaymentMethod { CARD PIX }
enum PaymentStatus { INITIATED PAID FAILED REFUNDED }
enum ReviewTarget { TRAIL GUIDE EXPEDITION }
enum ReviewStatus { PENDING APPROVED REJECTED }
```

## 4. Backend (Exemplo com NestJS)

Módulos:

- auth – JWT, RBAC, registro/login.
- trails – CRUD, filtros, mídia.
- guides – criação/verificação Cadastur.
- expeditions – publicar, datas, vagas.
- bookings – reserva, cancelamento.
- payments – integração com gateway (Pix, cartão).
- reviews – moderação.
- cms – posts/páginas.
- admin – endpoints restritos (painel).

Endpoint exemplificativo:

```ts
// trails.controller.ts
@Get()
async list(@Query() query: TrailFilterDto) {
  return this.trailsService.list(query);
}

// trails.service.ts
async list(filter: TrailFilterDto) {
  return this.prisma.trail.findMany({
    where: {
      state: filter.state,
      city: filter.city,
      level: filter.level,
      distanceKm: { gte: filter.minDistance, lte: filter.maxDistance },
    },
  });
}
```

## 5. Frontend (Next.js)

Páginas Públicas: home, buscar trilhas, detalhes da trilha, perfil de guia, expedições, blog, sobre, suporte.

Área do Trekker: dashboard, reservas, favoritos, perfil.

Área do Guia: dashboard, criar/editar expedições, calendário, financeiro.

Admin (separado ou com admin prefix): gerenciamento de usuários, trilhas, expedições, pagamentos, conteúdo.

Exemplo de página de listagem de trilhas:

```tsx
// app/trails/page.tsx
export default async function TrailsPage({ searchParams }) {
  const query = new URLSearchParams(searchParams).toString();
  const res = await fetch(`${process.env.API_URL}/trails?${query}`, { cache: 'no-store' });
  const trails = await res.json();

  return (
    <div>
      <h1>Explorar Trilhas</h1>
      <Filters />
      <ul>
        {trails.map(t => (
          <li key={t.id}>
            <Link href={`/trails/${t.id}`}>{t.name}</Link> - {t.city}/{t.state}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

## 6. Autenticação e RBAC

- Registro/login via e-mail/senha (futuro: OAuth).
- JWT armazenado em cookies (HTTP-only).
- Middleware de verificação de roles (ex.: `@Roles('GUIDE')`).
- Guia só publica expedições se `verified = true`.

## 7. Fluxos Principais

- Descoberta → Reserva: página da trilha → expedições → data → login → checkout → pagamento → confirmação.
- Guia cria expedição: dashboard → organizar expedições → selecionar trilha → definir detalhes → publicar.
- Pós-reserva: emails/push (D-3/D-1), chat, check-in, avaliação.

## 8. Integrações

| Serviço | Propósito |
| --- | --- |
| Cadastur API | Validação periódica dos guias |
| Gateway de Pagamento (ex. Iugu, Pagar.me, Stripe) | Pix/cartão, split de repasses |
| Mapas (Mapbox, OpenStreetMap) | Tiles, altimetria, pontos de apoio |
| E-mail/Push (SendGrid, Firebase) | Confirmações, lembretes, NPS |
| Analytics (GA4, Meta Pixel) | Eventos de conversão |
| Antifraude (Clearsale, Serasa) | Score básico no checkout |

## 9. Painel Administrativo

- CRUD de trilhas/guias/expedições.
- Moderação de reviews, denúncias.
- Relatórios financeiros.
- Configurações (comissões, banners, conteúdos destacados).

## 10. Regras de Negócio

- Comissão por reserva (percentual + taxa fixa).
- Janelas de cancelamento:
  - ≥15 dias: 100%
  - 7–14 dias: 50%
  - ≤3 dias: 0%
- Expedição fica lotada ao alcançar `vagas_max`.
- Avaliação só disponível para quem participou.
- Guia só publica expedição se verificado.

## 11. Não Funcionais

- LCP < 2.5 s, lazy load de imagens.
- WCAG 2.1 AA (teclado, contraste, ARIA).
- Segurança: HTTPS, criptografia em repouso, LGPD (consentimento, exclusão).
- Logs estruturados e métricas de performance.
