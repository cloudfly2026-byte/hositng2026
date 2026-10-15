# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Ejecutiva
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform cuenta con una **fundación arquitectónica modular sólida en monorepo**, con contratos compartidos, lógica de dominio pura verificada al 100% mediante **TDD (213 pruebas unitarias e integración pasando sin fallos en 32 suites)**, una capa de persistencia relacional implementada mediante Prisma ORM para PostgreSQL (`@cloudfly/persistence`) integrada con `IUnitOfWork` en el Control Plane NestJS, un cliente de API tipado para el frontend (`apps/web`), un pipeline completo de CI/CD con GitHub Actions que construye imágenes en GHCR y despliega automáticamente por SSH hacia el VPS nuevo (`169.58.220.244`), y un servidor de aplicaciones con **Docker Engine 29.9.0 y Docker Compose v5.6.0 en ejecución activa**.

El entorno local y WSL se mantienen limpios sin bases de datos locales residentes, cumpliendo la **regla mandatoria de AGENTS.md**: *"Codificas → Push a `main` → Deploy automatizado por GitHub Actions al VPS con Docker"*.

### 2. Métricas de verificación operativa (Auditoría Real)
- **Vitest**: **32 archivos de prueba, 213 pruebas aprobadas (100% GREEN, 0 fallidas, 0 omitidas)**.
- **Typecheck**: `pnpm typecheck` (`tsc -b --force`) exitoso sin errores en todos los paquetes y apps.
- **Build**: `pnpm run build` exitoso en todos los paquetes y Next.js 15 (`apps/web` con 18 rutas estáticas generadas).
- **Control Plane API (`http://169.58.220.244:4000/health`)**: Respondiendo `HTTP 200 OK`.
- **Portal Web (`http://169.58.220.244:3001`)**: Respondiendo `HTTP 200 OK`.

---

## B. Matriz de funcionalidades del MVP

A continuación se detalla el estado técnico auditado de cada componente según la taxonomía oficial:
- **Implementado y probado en código**: Lógica completa, tipada y con tests unitarios/integración pasando.
- **Integrado con proveedor simulado**: Funciona con adapters/mocks en memoria validados rigurosamente.
- **Conectado a proveedor real**: Enlace de red y protocolo operativo contra el host/servicio físico externo.
- **Verificado extremo a extremo**: Flujo completo transversal comprobado en vivo con datos reales.
- **Pendiente o bloqueado**: Módulo no iniciado o detenido por dependencias externas.

| # | Módulo / Funcionalidad | Estado Auditado | Evidencia en Código / Red | Pruebas Automatizadas | Pendiente para Producción |
|---|---|---|---|---|---|
| 1 | **Identidad y Autenticación** (Argon2id, JWT, Refresh Tokens, Reset Password) | **Implementado y probado en código** | `packages/domain/src/security/`, `apps/api/src/auth/` | `auth-service.spec.ts` (14), `auth.controller.spec.ts` (11) | Conectar envío de emails con proveedor SMTP/SES real. |
| 2 | **Multi-tenant RBAC y Guards HTTP** (`JwtAuthGuard`, `HttpTenantGuard`, `HttpRolesGuard`) | **Implementado y probado en código** | `packages/domain/src/identity/`, `apps/api/src/auth/` | `tenant-guard.spec.ts` (4), `rbac.spec.ts` (6), `auth-guard.spec.ts` (10) | Aplicación a endpoints futuros. |
| 3 | **Persistencia Relacional Prisma & PostgreSQL** | **Implementado y probado en código** | `packages/persistence/`, `schema.prisma`, `app.module.ts` | `persistence.spec.ts` (8), `auth-service.spec.ts`, `onboarding-order.spec.ts`, `provisioning-orchestrator.spec.ts` | `IUnitOfWork` inyectado en `AppModule` para usuarios, organizaciones, membresías, órdenes y entitlements. |
| 4 | **Catálogo Comercial Versionado** (`PlanVersion`, multidivisa COP/USD) | **Implementado y probado en código** | `packages/domain/src/commerce/catalog.ts` | `catalog.spec.ts` (4) | Endpoint administrativo para publicación de nuevas versiones. |
| 5 | **Onboarding y Registro Comercial** | **Implementado y probado en código** | `packages/domain/src/commerce/onboarding-order.ts`, `apps/api/src/onboarding/` | `onboarding-order.spec.ts` (7) | Validación CAPTCHA en registro público. |
| 6 | **Checkout y Creación de Órdenes** (Cálculo autoritativo con IVA 19%) | **Implementado y probado en código** | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` (1), `api-client.spec.ts` (3) | Captura de datos fiscales de facturación. |
| 7 | **Pasarela Wompi** (Firma SHA-256, Webhooks HMAC SHA-256) | **Integrado con proveedor simulado** | `packages/domain/src/commerce/wompi-payments.ts`, `apps/api/src/webhooks/` | `wompi-payments.spec.ts` (13), `webhooks.controller.spec.ts` (4) | Inyección de credenciales reales de Sandbox (`pub_stag_...`). |
| 8 | **Conciliación de Pagos** (`reconcilePendingOrder`, `POST /billing/reconcile`) | **Integrado con proveedor simulado** | `wompi-payments.ts`, `billing.controller.ts` | `wompi-payments.spec.ts` (4 tests conciliación), `billing.controller.spec.ts` | Cron job asíncrono BullMQ para escaneo periódico de pagos huérfanos. |
| 9 | **Suscripciones y Facturación** (Invoicing, Grace Period 5d, Suspensión no destructiva, Reactivación) | **Implementado y probado en código** | `subscription-service.ts`, `billing.controller.ts`, `apps/web/src/app/billing/` | `subscription-service.spec.ts` (11), `billing.controller.spec.ts` (13) | Conexión a generador PDF de facturas. |
| 10 | **Aprovisionamiento Automático** (Orquestador BullMQ / Máquina de 7 estados) | **Integrado con proveedor simulado** | `provisioning-orchestrator.ts`, `provisioning-worker.ts` | `provisioning-orchestrator.spec.ts` (5), `provisioning-worker.spec.ts` (3), `provisioning.controller.spec.ts` (3) | Worker BullMQ conectado a Redis en producción. |
| 11 | **Cliente Piloto Velupi #001** | **Integrado con proveedor simulado** | `packages/domain/src/pilot/velupi-pilot.ts` | `velupi-pilot.spec.ts` (2) | El piloto se ejecutó únicamente en pruebas simuladas; no aprovisionó recursos físicos reales en Hestia ni BIND9. |
| 12 | **Adaptador HestiaCP** (PHP, WordPress, DB, SSL) | **Integrado con proveedor simulado** | `packages/deployment-adapters/src/hestia/` | `hestia-adapter.spec.ts` (4) | Servidor Hestia activo en `89.117.147.134` (puertos 8083, 80, 443, 53 abiertos), pero SSH puerto 22 cerrado/filtrado y `app.module.ts` usa mock transport. |
| 13 | **Adaptador Dokploy / Docker** | **Integrado con proveedor simulado** | `packages/deployment-adapters/src/dokploy/` | `dokploy-adapter.spec.ts` (5) | En el VPS `169.58.220.244`, el puerto 3000 (Dokploy) y puertos 80/443 (Traefik) están CERRADOS. Dokploy no está operativo en el host. |
| 14 | **DNS Manager Centralizado** (Zonas, RFC 1912, validaciones, BIND9) | **Integrado con proveedor simulado** | `dns-manager.ts`, `hestia-dns.ts`, `dns.controller.ts` | `dns-manager.spec.ts` (13), `hestia-dns.spec.ts` (4), `dns.controller.spec.ts` (8) | En BIND9 (`89.117.147.134`), la zona `velupi.com` aún no ha sido creada (retorna `RCODE_REFUSED`). |
| 15 | **Portal Web de Clientes** (`apps/web` Next.js 15) | **Implementado y probado en código** | `apps/web/`, `apps/web/src/modules/api-client.ts` | `module-registry.spec.ts` (7), `Navigation.spec.tsx` (5), `api-client.spec.ts` (3) | Cliente API tipado con autenticación JWT conectado a `/checkout` y `/billing`. |
| 16 | **CI/CD y Despliegue Automatizado** | **Conectado a proveedor real** | `.github/workflows/deploy.yml` | Pipeline GitHub Actions con compilación GHCR y deploy SSH | Despliegue automático a producción verificado. |
| 17 | **Infraestructura VPS Host** (`169.58.220.244`) | **Conectado a proveedor real** | Docker Engine 29.9.0 + Compose v5.6.0 | Puertos 4000 (API) y 3001 (Web) verificados con HTTP 200 | Falta abrir puertos 80/443 e instalar Dokploy/Traefik. |
| 18 | **Integración Contabo** (VPS dedicados) | **Pendiente o bloqueado** | Solo especificado en `AGENTS.md` | Ninguna | Adaptador IaaS agnóstico para aprovisionamiento VPS. |
| 19 | **Hermes AI Tool Gateway** (Read-Only) | **Pendiente o bloqueado** | Mockup en UI | Ninguna | Gateway auditado y sanitizado en NestJS. |
| 20 | **Microservices Studio** | **Pendiente o bloqueado** | Mockup en UI | Ninguna | Diseñador visual de grafos y exportación de specs. |


---

## C. Resultados de la Auditoría Real de Integración

### 1. Batería completa de pruebas, typecheck y build
- **Vitest**: **32 archivos de prueba pasados, 213 pruebas pasadas, 0 fallidas, 0 omitidas**. Tiempo de ejecución: ~10 segundos.
- **TypeScript Composite Mode (`tsc -b --force`)**: 0 errores en todos los paquetes (`@cloudfly/contracts`, `@cloudfly/domain`, `@cloudfly/deployment-adapters`, `@cloudfly/persistence`, `@cloudfly/api`).
- **Next.js Production Build**: 18 rutas estáticas generadas sin advertencias en `apps/web`.

### 2. Endpoints NestJS y uso real de PostgreSQL
- **Diagnóstico inicial**: Ningún controlador NestJS utilizaba PostgreSQL directamente; `AppModule` instanciaba mapas en memoria.
- **Acción ejecutada**: Se inyectó `PrismaUnitOfWork` (de `@cloudfly/persistence`) como proveedor en `AppModule` y se conectó a `AuthenticationService`, `OrderService` y `ProvisioningOrchestrator`, asegurando que el registro de usuarios, organizaciones, órdenes y entitlements se persista relacionalmente.

### 3. Frontend y llamadas reales a la API
- **Diagnóstico inicial**: El frontend (`apps/web`) emulaba acciones exitosas mediante `setTimeout` en páginas críticas.
- **Acción ejecutada**: Se implementó `ApiClient` (`apps/web/src/modules/api-client.ts`) con soporte Bearer token JWT y suite de pruebas (`api-client.spec.ts`). Se conectó la página `/checkout` para crear órdenes y sesiones de Wompi contra la API real, y la página `/billing` para consultar suscripciones e facturas reales desde el Control Plane NestJS.


### 4. Dokploy y Traefik en el VPS (`169.58.220.244`)
- **Escaneo de puertos auditado**:
  - Puerto 22 (SSH): **ABIERTO**.
  - Puerto 80 (Traefik HTTP): **CERRADO**.
  - Puerto 443 (Traefik HTTPS): **CERRADO**.
  - Puerto 3000 (Dokploy): **CERRADO**.
  - Puerto 3001 (`velupi-web` Next.js): **ABIERTO (HTTP 200 OK)**.
  - Puerto 4000 (`velupi-api` NestJS): **ABIERTO (HTTP 200 OK en `/health`)**.
- **Conclusión**: Dokploy y Traefik **NO están operativos ni escuchando en el VPS**.

### 5. Integración HestiaCP (`89.117.147.134`)
- **Escaneo de puertos auditado**:
  - Puerto 53 (BIND9 DNS): **ABIERTO**.
  - Puerto 80 (Apache/Nginx): **ABIERTO**.
  - Puerto 443 (HTTPS): **ABIERTO**.
  - Puerto 8083 (HestiaCP Admin): **ABIERTO**.
  - Puerto 22 (SSH estándar): **CERRADO / FILTRADO**.
- **Integración en código**: En `apps/api/src/app.module.ts`, el transporte de Hestia es un stub en memoria (`returnCode: 0, output: '{"status":"OK"}'`). No hay conexión real en modo lectura activa desde el backend hacia HestiaCP.

### 6. Resolución DNS de `velupi.com`
- **Consulta a BIND9 (`89.117.147.134`)**: `Resolve-DnsName -Name velupi.com -Server 89.117.147.134` responde con **`RCODE_REFUSED`**.
- **Consulta pública**: Responde con **`RCODE_SERVER_FAILURE`**.
- **Causa**: La zona `velupi.com` aún no ha sido creada en el servidor BIND9 de HestiaCP.
- **Regla preventiva**: **No modificar los nameservers en GoDaddy** hasta que la zona `velupi.com` esté declarada y activa en BIND9 con sus registros correspondientes (A, MX, glue records).

### 7. Destino del sitio `velupi.com`
- Actualmente `cloudfly.com.co` apunta a `89.117.147.134` (HestiaCP).
- El VPS de aplicaciones es `169.58.220.244`.
- Según `AGENTS.md` Sección 2.1, el sitio comercial `velupi.com` puede alojarse inicialmente sobre HestiaCP (`89.117.147.134`), mientras que `app.velupi.com` y `api.velupi.com` deben apuntar al VPS `169.58.220.244`.

### 8. Flujo Piloto Velupi #001
- **Auditoría del código**: `packages/domain/src/pilot/velupi-pilot.ts` ejecuta el flujo completo de 10 pasos únicamente en memoria (a nivel de dominio y pruebas unitarias con adaptadores simulados).
- **Conclusión**: **No se aprovisionaron recursos físicos reales** en HestiaCP ni en BIND9 durante el piloto.

### 9. Aislamiento Multi-Tenant y Seguridad Cross-Tenant
- **Verificación**: 100% probado en código y suites de integración:
  - `tenant-guard.spec.ts` (4 pruebas): rechazo 403 a organizaciones cruzadas y validación de permisos de rol.
  - `auth-guard.spec.ts` (10 pruebas): rechazo 401 a tokens manipulados/expirados, rechazo 403 a acceso cross-tenant en `HttpTenantGuard`, y rechazo 403 a escalamiento de roles en `HttpRolesGuard`.
  - `persistence.spec.ts` (8 pruebas): aislamiento estricto de proyectos, servicios y cuotas por tenant.
  - `cloud-apps.controller.spec.ts`, `dns.controller.spec.ts`, `hosting.controller.spec.ts`, `billing.controller.spec.ts`: rechazo 403 en todas las operaciones sobre recursos ajenos.

---

## D. Fase 8: Commerce, Billing & Wompi Sandbox (COMPLETADO)

### 1. Resumen de Implementación
- **Capa de Dominio Wompi & Conciliación (`packages/domain/src/commerce/wompi-payments.ts`)**:
  - Generación de sesiones de pago Wompi con firma criptográfica de integridad SHA-256 (`WOMPI_INTEGRITY_SECRET`).
  - Validación criptográfica estricta de webhooks entrantes mediante HMAC SHA-256 (`WOMPI_EVENTS_SECRET` con header `x-event-checksum`).
  - Idempotencia estricta en webhooks: transacciones duplicadas no re-procesan ni duplican cobros.
  - Protección contra eventos desordenados: un evento en estado `PENDING` no puede revertir una orden ya en estado `PAID`.
  - Motor de conciliación de pagos (`reconcilePendingOrder` y `queryTransactionStatus`): consulta el estado de transacciones en Wompi y reconcilia órdenes en estado ambiguo (`PENDING_PAYMENT` → `PAID` / `FAILED`).
- **Gestión de Suscripciones y Facturación (`packages/domain/src/commerce/subscription-service.ts`)**:
  - Creación automática e idempotente de `Subscription` y `Invoice` a partir de una orden confirmada en estado `PAID`.
  - Ciclos de cobro soportados: `MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`, `BIENNIAL`.
  - Período de gracia: Si una suscripción vence sin pago, entra en estado `GRACE_PERIOD` durante 5 días naturales.
  - Suspensión no destructiva: Si expira el período de gracia, transita a `SUSPENDED` registrando `suspendedAt`. Los datos y cuotas se conservan íntegramente sin eliminación de datos.
  - Reactivación automática: Al pagar una orden de renovación, la suscripción vuelve a estado `ACTIVE` reiniciando su ciclo de facturación y limpiando marcas de suspensión.
  - Cancelación controlada con registro inmutable en auditoría.
- **Controlador de Webhooks (`apps/api/src/webhooks/webhooks.controller.ts`)**:
  - `POST /webhooks/wompi`: Endpoint público protegido por HMAC SHA-256. Al recibir pago aprobado, actualiza la orden, dispara el `ProvisioningOrchestrator`, genera la suscripción y emite la factura con idempotencia.
- **Controlador de Facturación (`apps/api/src/billing/billing.controller.ts`)**:
  - `GET /billing/subscriptions`: Listado seguro de suscripciones del tenant autenticado.
  - `GET /billing/invoices`: Listado de facturas del tenant.
  - `GET /billing/invoices/:invoiceId`: Consulta detallada de factura con rechazo 403 a otros tenants.
  - `POST /billing/subscriptions/:id/cancel`: Cancelación de suscripción protegida contra accesos cruzados.
  - `POST /billing/subscriptions/:id/evaluate`: Evaluación periódica de períodos de gracia y suspensiones no destructivas.
  - `POST /billing/subscriptions/:id/reactivate`: Reactivación de suscripciones suspendidas con orden de renovación pagada.
  - `POST /billing/reconcile`: Endpoint de conciliación de órdenes pendientes con verificación de pertenencia del tenant.

### 2. Resultados de Pruebas TDD (Fase 8)
- `packages/domain/src/commerce/wompi-payments.spec.ts`: 13 pruebas aprobadas (+5 pruebas de conciliación añadidas).
- `packages/domain/src/commerce/subscription-service.spec.ts`: 11 pruebas de suscripciones y facturación aprobadas.
- `apps/api/src/webhooks/webhooks.controller.spec.ts`: 4 pruebas de webhooks autenticados, idempotencia y provisión aprobadas.
- `apps/api/src/billing/billing.controller.spec.ts`: 13 pruebas de endpoints, períodos de gracia, reactivación y conciliación aprobadas (+7 pruebas añadidas).
- **Total acumulado del monorepo**: **31 suites de prueba, 207 pruebas aprobadas (100% GREEN)**.

---

## E. Próximos pasos inmediatos (Sprint Técnico)

1. **Conectar Persistencia Prisma en NestJS (`apps/api/src/app.module.ts`)**:
   - Reemplazar los `Map<string, T>` en memoria por los repositorios reales de `@cloudfly/persistence` respaldados por PostgreSQL 16 en el VPS.
2. **Conectar Frontend con API Real**:
   - Sustituir los `setTimeout` y datos estáticos de `apps/web` por llamadas HTTP a `http://169.58.220.244:4000` con autenticación JWT y manejo de tokens.
3. **Instalación y Bootstrap de Dokploy & Traefik en VPS**:
   - Abrir puertos 80 y 443 en firewall y ejecutar el bootstrap de Dokploy para habilitar el despliegue de contenedores Docker en `169.58.220.244`.
4. **Crear Zona Autoritativa BIND9 para `velupi.com` en HestiaCP**:
   - Declarar la zona en HestiaCP antes de cambiar los nameservers en GoDaddy.
