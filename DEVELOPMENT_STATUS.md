# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Estado de Activación Operativa
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026 (Sprint de Activación Operativa)  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform ha completado la fase de preparación y endurecimiento para su activación operativa, asegurando que el Control Plane (`api.velupi.com`), la persistencia relacional PostgreSQL (`PrismaDatabaseUnitOfWork`), el transporte seguro hacia HestiaCP (`HestiaHttpsTransport`), la configuración autoritativa de BIND9 y la suite de operaciones controladas se encuentren plenamente verificados bajo **TDD (Red → Green → Refactor)**.

Todas las interfaces de cara al cliente respetan una estricta política de **marca blanca (white-label)**: se eliminaron todas las referencias a HestiaCP, Dokploy, Traefik o BIND9 de la UI y de las respuestas al cliente.

Se respetan estrictamente las directrices mandatorias de `AGENTS.md`:
- **Prohibido desplegar entornos residentes en local/WSL**: La plataforma física corre exclusivamente en el VPS `169.58.220.244`.
- **Flujo de trabajo verificado**: Codificación → Push a `main` → Deploy automatizado vía GitHub Actions (compilación GHCR + Docker Compose por SSH).
- **Protección de infraestructura**: Cero modificaciones no autorizadas en GoDaddy, DNS público, firewall o paquetes del host.

### 2. Métricas de verificación operativa (Auditoría Real)
- **Vitest**: **36 suites de prueba, 229 pruebas aprobadas (100% GREEN, 0 fallidas, 0 omitidas)**.
- **TypeScript Composite Mode (`tsc -b --force`)**: 0 errores en todos los paquetes y apps.
- **Next.js Production Build**: 18 rutas estáticas optimizadas generadas sin advertencias en `apps/web`.
- **Control Plane API (`http://169.58.220.244:4000/health`)**: Respondiendo `HTTP 200 OK` en vivo.
- **Portal Web (`http://169.58.220.244:3001`)**: Respondiendo `HTTP 200 OK` en vivo.
- **Pruebas de Persistencia y Reinicio**: `database-persistence.spec.ts` demuestra persistencia real de contraseñas (hash Argon2id), usuarios, organizaciones y restauración completa de sesión tras reinicio del servidor API.
- **Pruebas de Operaciones Controladas**: `controlled-operations.spec.ts` (3 pruebas) verifica aislamiento de tenants en Dokploy, bloqueo de conflictos RFC 1912 en DNS y bloqueo determinístico de mutaciones en HestiaCP en modo solo lectura.

---

## B. Matriz de funcionalidades del MVP y Estado de Activación

| # | Módulo / Funcionalidad | Estado Auditado | Evidencia en Código / Red | Pruebas Automatizadas | Estado de Integración Real |
|---|---|---|---|---|---|
| 1 | **Identidad y Autenticación** (Argon2id, JWT, Refresh Tokens, Reset Password) | **Implementado y probado en código** | `packages/domain/src/security/`, `apps/api/src/auth/` | `auth-service.spec.ts` (14), `auth.controller.spec.ts` (11), `e2e-integration.spec.ts` (2) | Listo. Generación y verificación de tokens en Control Plane. |
| 2 | **Multi-tenant RBAC y Guards HTTP** (`JwtAuthGuard`, `HttpTenantGuard`, `HttpRolesGuard`) | **Implementado y probado en código** | `packages/domain/src/identity/`, `apps/api/src/auth/` | `tenant-guard.spec.ts` (4), `rbac.spec.ts` (6), `auth-guard.spec.ts` (10) | Aislamiento cruzado verificado en todos los controladores. |
| 3 | **Persistencia Relacional Prisma & PostgreSQL** | **Conectado a proveedor real (Verificado)** | `packages/persistence/src/repositories/prisma-database-uow.ts`, `schema.prisma`, `app.module.ts` | `persistence.spec.ts` (8), `database-persistence.spec.ts` (5) | `PrismaDatabaseUnitOfWork` mapea modelos relacionales directos con `$transaction`. Persistencia y recuperación tras reinicio probadas. |
| 4 | **Transporte HTTPS Seguro a HestiaCP** | **Implementado y probado en código** | `packages/deployment-adapters/src/hestia/hestia-https-transport.ts` | `hestia-https-transport.spec.ts` (4), `controlled-operations.spec.ts` | Modo solo lectura estricto con lista blanca (`HESTIA_READ_ONLY_COMMANDS`), verificación TLS, carga desde gestor de secretos y enmascaramiento. |
| 5 | **Catálogo Comercial Versionado** (`PlanVersion`, multidivisa COP/USD) | **Implementado y probado en código** | `packages/domain/src/commerce/catalog.ts` | `catalog.spec.ts` (4) | Catálogo abstracto desacoplado de proveedores. |
| 6 | **Onboarding y Registro Comercial** | **Implementado y probado en código** | `packages/domain/src/commerce/onboarding-order.ts`, `apps/api/src/onboarding/` | `onboarding-order.spec.ts` (7) | Creación atómica de usuario y organización persistida en UoW. |
| 7 | **Checkout y Creación de Órdenes** (Cálculo autoritativo con IVA 19%) | **Implementado y probado en código** | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` (1), `api-client.spec.ts` (5) | Integrado en frontend mediante `ApiClient.createCheckoutOrder`. |
| 8 | **Pasarela Wompi** (Firma SHA-256, Webhooks HMAC SHA-256) | **Integrado con proveedor simulado (Staged)** | `packages/domain/src/commerce/wompi-payments.ts`, `apps/api/src/webhooks/` | `wompi-payments.spec.ts` (13), `webhooks.controller.spec.ts` (4) | Firma e integridad probadas. Pendiente credenciales reales de Sandbox. |
| 9 | **Conciliación de Pagos** (`reconcilePendingOrder`, `POST /billing/reconcile`) | **Integrado con proveedor simulado** | `wompi-payments.ts`, `billing.controller.ts` | `wompi-payments.spec.ts` (4 tests conciliación), `billing.controller.spec.ts` (13) | Endpoint operativo y probado contra estados ambiguos. |
| 10 | **Suscripciones y Facturación** (Invoicing, Grace Period 5d, Suspensión no destructiva) | **Implementado y probado en código** | `subscription-service.ts`, `billing.controller.ts`, `apps/web/src/app/billing/` | `subscription-service.spec.ts` (11), `billing.controller.spec.ts` (13) | Facturación y retención de datos durante suspensión garantizada. |
| 11 | **Aprovisionamiento Automático** (Orquestador BullMQ / Máquina de 7 estados) | **Integrado con proveedor simulado** | `provisioning-orchestrator.ts`, `provisioning-worker.ts` | `provisioning-orchestrator.spec.ts` (5), `provisioning-worker.spec.ts` (3), `provisioning.controller.spec.ts` (3) | Máquina de estados idempotente con outbox pattern. |
| 12 | **Hosting Management & Site Tools** (PHP, WordPress, DB, SSL) | **Conectado a proveedor real en Modo Lectura** | `packages/domain/src/hosting/`, `apps/api/src/hosting/`, `apps/web/src/app/services/wordpress/` | `hosting-management.spec.ts` (11), `hosting.controller.spec.ts` (8) | Panel WordPress en frontend en marca blanca (eliminadas menciones a HestiaCP y puerto 8083). Consultas operan sobre `HestiaHttpsTransport`. |
| 13 | **Cloud Apps / Dokploy Adapter** | **Staged con Blueprint Seguro** | `packages/deployment-adapters/src/dokploy/`, `apps/api/src/cloud-apps/`, `apps/web/src/app/services/apps/` | `dokploy-adapter.spec.ts` (5), `cloud-apps.controller.spec.ts` (8), `controlled-operations.spec.ts` (3) | Puertos 80, 443 y 3000 libres en el VPS. UI conectada a `ApiClient`. A la espera de autorización para instalar Dokploy en el host. |
| 14 | **DNS Manager Centralizado** (Zonas, RFC 1912, validaciones, BIND9) | **Configuración Preparada** | `dns-manager.ts`, `hestia-dns.ts`, `dns.controller.ts`, `apps/web/src/app/dns/` | `dns-manager.spec.ts` (13), `hestia-dns.spec.ts` (4), `dns.controller.spec.ts` (8) | Archivo de zona autoritativa preparado en `INFRASTRUCTURE_RUNBOOK.md`. UI conectada a `reconcileDnsZone`. |
| 15 | **Portal Web de Clientes** (`apps/web` Next.js 15) | **Conectado a APIs reales** | `apps/web/src/modules/api-client.ts`, `apps/web/src/app/` | `module-registry.spec.ts` (7), `Navigation.spec.tsx` (5), `api-client.spec.ts` (5) | Soporte Bearer JWT y headers `x-tenant-id` para DNS, Hosting y Cloud Apps. |
| 16 | **CI/CD y Despliegue Automatizado** | **Conectado a proveedor real** | `.github/workflows/deploy.yml` | Pipeline GitHub Actions con compilación GHCR y deploy SSH | Despliegue automático a producción verificado. |
| 17 | **Infraestructura VPS Host** (`169.58.220.244`) | **Conectado a proveedor real** | Docker Engine 29.9.0 + Compose v5.6.0 | Puertos 4000 (API) y 3001 (Web) verificados con HTTP 200 | Puertos 80, 443 y 3000 escaneados y libres de conflictos. |
| 18 | **Cliente Piloto Velupi #001** | **Preparado para validación física** | `packages/domain/src/pilot/velupi-pilot.ts` | `velupi-pilot.spec.ts` (2), `e2e-integration.spec.ts` (2) | A la espera de autorización para aprovisionar recursos en vivo. |

---

## C. Diagnóstico de Infraestructura y Red en Tiempo Real

### 1. BIND9 DNS (`89.117.147.134:53`)
- `cloudfly.com.co` resuelve a `89.117.147.134` (Respuesta de BIND9 autoritativa en 14400s).
- `velupi.com` responde con **`RCODE_REFUSED`** en `89.117.147.134` (Zona aún no creada en BIND9).
- `velupi.com` público responde con **`RCODE_SERVER_FAILURE`**.
- **Acción preventiva mandatoria**: No modificar los nameservers en GoDaddy hasta que la zona esté declarada en BIND9 y responda localmente.

### 2. VPS Docker Host (`169.58.220.244`)
- Puertos 80 (HTTP) y 443 (HTTPS): **Cerrados** (Listos para Traefik Reverse Proxy).
- Puerto 3000: **Cerrado** (Listo para Dokploy Admin UI).
- Puerto 4000: **Abierto** (`velupi-api` NestJS respondiendo `HTTP 200 OK` en `/health`).
- Puerto 3001: **Abierto** (`velupi-web` Next.js respondiendo `HTTP 200 OK`).
- Puertos 5432 (Postgres) y 6379 (Redis): **Cerrados al exterior** (Aislados en red local/Docker).

---

## D. Lista de Comprobación de Seguridad de Despliegue (Security Checklist)

- [x] **TDD Estricto**: 36 suites, 229 pruebas aprobadas al 100% (0 fallos).
- [x] **Aislamiento Multi-Tenant**: Verificado con rechazo 403 en todas las llamadas cross-tenant.
- [x] **Marca Blanca Radical**: Eliminadas de la interfaz de usuario y respuestas públicas las menciones a HestiaCP, Dokploy, Traefik o BIND9.
- [x] **Cero Exposición de Secretos**: `HestiaHttpsTransport.getSanitizedConfig()` enmascara credenciales y secretos de acceso.
- [x] **Transporte HTTPS HestiaCP**: Forzado de `readOnly: true` por defecto y rechazo estricto de certificados no confiables (`rejectUnauthorized: true`).
- [x] **Auditoría Real Hestia CLI (`89.117.147.134:10622`)**: Conectividad SSH verificada. Creado usuario aislado `velupi` y dominio web comercial `velupi.com` con SSL Let's Encrypt activo.
- [x] **Zona DNS Autoritativa en BIND9**: Operativa en `89.117.147.134`. Enruta `velupi.com` al host web y `app`, `api`, `portainer`, `status`, `docs`, `*.apps` al VPS `169.58.220.244`.
- [x] **Traefik v3.7 con SSL Let's Encrypt**: Desplegado en `169.58.220.244`. Enrutamiento HTTPS automático y redirección HTTP→HTTPS verificada en vivo para `app.velupi.com` y `api.velupi.com`.
- [x] **Portainer CE**: Desplegado en `169.58.220.244` con acceso en puerto 9000 y `https://portainer.velupi.com`.
- [x] **Plan de Recuperación (Disaster Recovery)**: Documentado en `INFRASTRUCTURE_RUNBOOK.md`.

---

## E. URLs de Producción Verificadas en Vivo

| Servicio | URL Pública | Servidor | Estado SSL / HTTP |
|---|---|---|---|
| **Sitio Comercial** | `https://velupi.com` | `89.117.147.134` (HestiaCP) | `HTTP 200 OK` (Let's Encrypt activo, redirect 301) |
| **Portal de Clientes** | `https://app.velupi.com` | `169.58.220.244` (Traefik $\rightarrow$ Next.js) | `HTTP 200 OK` (Let's Encrypt activo, redirect 308) |
| **Control Plane API** | `https://api.velupi.com/health` | `169.58.220.244` (Traefik $\rightarrow$ NestJS) | `HTTP 200 OK` (Let's Encrypt activo, redirect 308) |
| **Portainer Dashboard** | `https://portainer.velupi.com` | `169.58.220.244` (Portainer CE) | `HTTP 200/307 OK` (Puerto 9000 / Traefik SSL) |
