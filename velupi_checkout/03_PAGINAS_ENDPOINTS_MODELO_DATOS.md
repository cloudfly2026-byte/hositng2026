# Velupi UC-NEW-001 — Páginas, endpoints y modelo de datos

**Documento de diseño propuesto**. No implica que las rutas/tablas ya existan. Verificar código y Prisma actuales antes de migrar.

## Páginas y componentes

| Aplicación | Ruta | Propósito / componentes | Acceso |
|---|---|---|---|
| WordPress | `/planes`, `/hosting-wordpress`, `/cloud-apps` | Cards de planes, moneda/período, CTA Seleccionar plan → app | Público |
| Next.js | `/cart?plan=...&cycle=...` | Selector período, features, extras, descuento, impuestos, renovaciones, botón continuar | Público; draft |
| Next.js | `/register?returnTo=...` | Email/password, Google, GitHub, link login, consentimiento separado | Público |
| Next.js | `/login?returnTo=...` | Login, Google, GitHub, recordar contraseña | Público |
| Next.js | `/verify-email`, `/forgot-password`, `/reset-password` | Confirmación email / recuperación | Público con token |
| Next.js | `/checkout?cartId=...` | Facturación, resumen final, condiciones, botón pagar vía Wompi | Autenticado |
| Next.js | `/checkout/return` | Retorno no autoritativo de Wompi: consultar pedido | Público o sesión según política |
| Next.js | `/orders/[orderId]` | Pago pendiente/confirmado/error, progreso de provisión | Titular/tenant |
| Next.js | `/billing` | Órdenes, suscripciones y facturas | Autenticado |
| Next.js | `/` (dashboard) | Servicios activados, estado y cuotas | Autenticado |

UI: Next.js 15 + MUI; carrito, registro y checkout tienen presentación comercial enfocada, pero comparten marca y diseño de Velupi. Evitar forzar todo el sidebar del panel durante el pago; ofrecer encabezado comercial simplificado y navegación accesible.

## Endpoints NestJS (propuestos; reutilizar existentes)

| Método | Ruta | Auth | Propósito |
|---|---|---|---|
| GET | `/catalog/plans/:slug?cycle=...` | Público | Oferta publicada y versión |
| POST | `/cart` | Opcional | Crear draft; devuelve ID opaco + expiración |
| GET | `/cart/:cartId` | Token/propiedad | Leer carrito y recalcular cotización |
| PATCH | `/cart/:cartId` | Token/propiedad | Período, extras, cupón |
| POST | `/cart/:cartId/claim` | JWT | Asociar draft a usuario y org después del login |
| POST | `/auth/register` | Público | Usuario email/password, token verificación |
| POST | `/auth/login` | Público | Sesión segura |
| GET | `/auth/oauth/google/start` | Público | Estado PKCE/redirect externo |
| GET | `/auth/oauth/google/callback` | Público | Validación/código, sesión y retorno |
| GET | `/auth/oauth/github/start` | Público | Estado OAuth/redirect externo |
| GET | `/auth/oauth/github/callback` | Público | Validación y retorno |
| POST | `/auth/verify-email` | Token | Confirmar email |
| POST | `/auth/refresh` | Sesión | Rotación |
| POST | `/auth/revoke` | JWT | Cierre de sesión |
| GET | `/auth/me` | JWT | Usuario y organizaciones |
| POST | `/checkout/order` | JWT + org | Congelar precio y crear orden idempotente |
| POST | `/checkout/payment-session` | JWT + org | Iniciar pago Wompi hospedado |
| POST | `/webhooks/wompi` | Firma proveedor | Registrar evento y actualizar estado |
| GET | `/orders/:orderId` | JWT + org | Estado del pedido |
| GET | `/provisioning/jobs/:jobId` | JWT + org | Progreso del job |
| GET | `/billing/subscriptions` | JWT + org | Suscripciones |
| GET | `/billing/invoices` | JWT + org | Facturas |

**Atención:** callbacks OAuth y algunas URLs deben usar método y codificación definidos por el proveedor y su librería. La tabla es un contrato objetivo sujeto a esa verificación.

## Modelo de datos (Prisma/PostgreSQL)

**Existentes reportados en DB:** `User`, `Organization`, `Membership`, `Product`, `Plan`, `PlanVersion`, `Order`, `OrderItem`, `CustomerEntitlement`, `Project`, `Service` (11 tablas). Revisar nombres de tablas y relaciones reales antes de migrar. El código de `Subscription`, `Invoice`, `AuditEvent` y jobs no garantiza que existan sus tablas en SQL.

| Entidad | Campos centrales sugeridos | Restricciones |
|---|---|---|
| `CartDraft` | id UUID, anonymousTokenHash, userId?, organizationId?, currency, expiresAt, status, createdAt | Token opaco, expiración, único propietario, nunca precio cliente confiable |
| `CartItem` | id, cartId, planVersionId, billingCycle, quantity, extras JSONB | FK, restricciones de quantity, FK de plan existente |
| `OAuthIdentity` | id, userId, provider, providerSubject, emailAtLogin?, createdAt | Unique `(provider, providerSubject)`; no auto-merge por email |
| `AuthSession` / `RefreshToken` | id, userId, tokenHash, rotatedFrom?, revokedAt?, expiresAt | Un solo uso, invalidación total por reset |
| `EmailVerificationToken` | id, userId, tokenHash, expiresAt, consumedAt | Tokens hasheados y de uso único |
| `BillingProfile` | id, organizationId, type, legalName, country, taxId?, addressJson, contactEmail | Tenant FK, cifrado o minimización PII |
| `PaymentAttempt` | id, orderId, provider, reference, providerTransactionId?, status, amountMinor, currency | Idempotencia, unique referencia externa cuando exista |
| `PaymentEvent` | id, providerEventId, paymentAttemptId, checksumVerified, receivedAt, payloadSanitized | Deduplicación, sin PII innecesaria |
| `Subscription` | id, organizationId, planVersionId, status, cycle, renewAt, graceEndsAt? | FKs, control de estados |
| `Invoice` | id, organizationId, orderId, number, amountMinor, currency, status | Número único por serie/ámbito, impuestos |
| `ProvisioningJob` | id, orderId, organizationId, jobKey, status, attempts, errorCode? | Unique `jobKey`, no doble aprovisionamiento |
| `OutboxEvent` | id, aggregateId, type, payload, createdAt, dispatchedAt? | Entrega al menos una vez + consumidor idempotente |
| `AuditEvent` | id, actorId, organizationId, action, resourceId, timestamp, metadataSanitized | Append-only, retención adecuada |

No introducir todas las tablas de una vez si ya existen equivalentes; ejecutar migraciones incrementales y rollback probados. **Nunca** persistir contraseñas sin hash, tokens sin protección ni PAN/CVV.

## Estados y relaciones mínimas

- `CartDraft`: `ACTIVE → CLAIMED → CHECKED_OUT` o `EXPIRED`.
- `Order`: `DRAFT → PENDING_PAYMENT → PAID / FAILED` y estado independiente de aprovisionamiento.
- `PaymentAttempt`: `CREATED → PENDING → APPROVED / DECLINED / ERROR`; webhook no autoriza duplicaciones.
- `ProvisioningJob`: `QUEUED → RUNNING → ACTIVE` o `FAILED` con reintentos/compensación.
- `Subscription`: `ACTIVE → GRACE_PERIOD → SUSPENDED → ACTIVE` o `CANCELLED`.
- No usar estado de la redirección del checkout como señal definitiva de pago.

## Hitos y pruebas

1. **Hito M1 (UX + carrito)**: CTA WordPress preparado, cart responsive, draft y persistencia del período. Pruebas de URLs, precio y caducidad.
2. **Hito M2 (auth)**: email + Google/GitHub vía proveedor autorizado, retorno y fusión segura; pruebas OAuth callback/CSRF/usuario existente.
3. **Hito M3 (checkout)**: datos fiscales, Wompi Sandbox y orden idempotente; pruebas de firma y pagos duplicados.
4. **Hito M4 (provisioning)**: BullMQ real, backend hosting y DNS, dashboard; pruebas sincrónicas/asíncronas y recuperación.
5. **Hito M5 (E2E autorizado)**: crear recursos únicamente en subdominio controlado de pruebas, SSL verificable y acceso desde portal.

## Dependencias y decisiones abiertas

- Credenciales/client IDs de Google, GitHub y URLs de callback; configuración de dominios y políticas de cookies/cross-site.
- Credenciales Wompi Sandbox y decisión de checkout hospedado vs widget oficial.
- Esquema real de Prisma y migraciones de facturación, carrito, sesiones y eventos.
- Catálogo/precios/duración/renovaciones vigentes y política comercial (sin copiar promociones de capturas).
- Política de cuenta para personas vs empresas y datos fiscales exigidos por mercado.
- Validación de que la clave HestiaCP expuesta históricamente está revocada.
- Autorización antes de publicar cambios WordPress, DNS, servidores o efectuar operaciones pagadas.
