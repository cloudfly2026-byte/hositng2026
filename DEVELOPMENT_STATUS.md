# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Estado de Integración Real
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026 (Sprint de Integración Real)  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform ha avanzado desde una arquitectura modular probada en código hacia una **plataforma lista para integraciones reales seguras y controladas**, manteniendo una estricta política de marca blanca (white-label) que oculta a los clientes finales los paneles y motores internos de infraestructura (HestiaCP, Dokploy, Traefik).

Toda la base de código cumple rigurosamente con **TDD (Red → Green → Refactor)**, alcanzando **35 suites de prueba y 224 pruebas unitarias, de integración y E2E aprobadas al 100% (0 fallidas, 0 omitidas)**.

Se respetan estrictamente las directrices mandatorias de `AGENTS.md`:
- **Prohibido desplegar entornos residentes en local/WSL**: La plataforma física corre exclusivamente en el VPS `169.58.220.244`.
- **Flujo de trabajo verificado**: Codificación → Push a `main` → Deploy automatizado vía GitHub Actions (compilación GHCR + Docker Compose por SSH).
- **Protección de infraestructura**: No se modifican zonas DNS públicas ni se instalan paquetes de sistema host sin autorización explícita.

### 2. Métricas de verificación operativa (Auditoría Real)
- **Vitest**: **35 suites de prueba, 224 pruebas aprobadas (100% GREEN, 0 fallidas, 0 omitidas)**.
- **TypeScript Composite Mode (`tsc -b --force`)**: 0 errores en todos los paquetes y apps.
- **Next.js Production Build**: 18 rutas estáticas optimizadas generadas sin advertencias en `apps/web`.
- **Control Plane API (`http://169.58.220.244:4000/health`)**: Respondiendo `HTTP 200 OK`.
- **Portal Web (`http://169.58.220.244:3001`)**: Respondiendo `HTTP 200 OK`.
- **Pruebas E2E Transversales**: Suite `apps/api/src/e2e-integration.spec.ts` validando el ciclo completo Auth → Hosting → DNS → Cloud Apps con aislamiento multi-tenant estricto.

---

## B. Matriz de funcionalidades del MVP y Estado de Integración

A continuación se detalla el estado técnico auditado de cada componente:
- **Implementado y probado en código**: Lógica completa, tipada y con tests unitarios/integración pasando.
- **Integrado con proveedor simulado**: Funciona con adapters/mocks en memoria validados rigurosamente.
- **Conectado a proveedor real**: Enlace de red y protocolo operativo contra el host/servicio físico externo.
- **Verificado extremo a extremo**: Flujo completo transversal comprobado en vivo con datos reales.
- **Pendiente o bloqueado**: Módulo no iniciado o detenido por dependencias externas.

| # | Módulo / Funcionalidad | Estado Auditado | Evidencia en Código / Red | Pruebas Automatizadas | Estado de Integración Real |
|---|---|---|---|---|---|
| 1 | **Identidad y Autenticación** (Argon2id, JWT, Refresh Tokens, Reset Password) | **Implementado y probado en código** | `packages/domain/src/security/`, `apps/api/src/auth/` | `auth-service.spec.ts` (14), `auth.controller.spec.ts` (11), `e2e-integration.spec.ts` (2) | Listo. Generación y verificación de tokens en Control Plane. |
| 2 | **Multi-tenant RBAC y Guards HTTP** (`JwtAuthGuard`, `HttpTenantGuard`, `HttpRolesGuard`) | **Implementado y probado en código** | `packages/domain/src/identity/`, `apps/api/src/auth/` | `tenant-guard.spec.ts` (4), `rbac.spec.ts` (6), `auth-guard.spec.ts` (10) | Aislamiento cruzado verificado en todos los controladores. |
| 3 | **Persistencia Relacional Prisma & PostgreSQL** | **Conectado a proveedor real (Preparado)** | `packages/persistence/src/repositories/prisma-database-uow.ts`, `schema.prisma`, `app.module.ts` | `persistence.spec.ts` (8), `database-persistence.spec.ts` (4) | `PrismaDatabaseUnitOfWork` mapea modelos relacionales directos con `$transaction`. Inyectado en `AppModule` con fallback seguro. |
| 4 | **Transporte HTTPS Seguro a HestiaCP** | **Implementado y probado en código** | `packages/deployment-adapters/src/hestia/hestia-https-transport.ts` | `hestia-https-transport.spec.ts` (3) | Modo solo lectura estricto con lista blanca (`HESTIA_READ_ONLY_COMMANDS`), verificación TLS y timeout configurable. |
| 5 | **Catálogo Comercial Versionado** (`PlanVersion`, multidivisa COP/USD) | **Implementado y probado en código** | `packages/domain/src/commerce/catalog.ts` | `catalog.spec.ts` (4) | Catálogo abstracto desacoplado de proveedores. |
| 6 | **Onboarding y Registro Comercial** | **Implementado y probado en código** | `packages/domain/src/commerce/onboarding-order.ts`, `apps/api/src/onboarding/` | `onboarding-order.spec.ts` (7) | Creación atómica de usuario y organización. |
| 7 | **Checkout y Creación de Órdenes** (Cálculo autoritativo con IVA 19%) | **Implementado y probado en código** | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` (1), `api-client.spec.ts` (5) | Integrado en frontend mediante `ApiClient.createCheckoutOrder`. |
| 8 | **Pasarela Wompi** (Firma SHA-256, Webhooks HMAC SHA-256) | **Integrado con proveedor simulado** | `packages/domain/src/commerce/wompi-payments.ts`, `apps/api/src/webhooks/` | `wompi-payments.spec.ts` (13), `webhooks.controller.spec.ts` (4) | Firma e integridad probadas. Pendiente credenciales reales de Sandbox. |
| 9 | **Conciliación de Pagos** (`reconcilePendingOrder`, `POST /billing/reconcile`) | **Integrado con proveedor simulado** | `wompi-payments.ts`, `billing.controller.ts` | `wompi-payments.spec.ts` (4 tests conciliación), `billing.controller.spec.ts` (13) | Endpoint operativo y probado contra estados ambiguos. |
| 10 | **Suscripciones y Facturación** (Invoicing, Grace Period 5d, Suspensión no destructiva) | **Implementado y probado en código** | `subscription-service.ts`, `billing.controller.ts`, `apps/web/src/app/billing/` | `subscription-service.spec.ts` (11), `billing.controller.spec.ts` (13) | Facturación y retención de datos durante suspensión garantizada. |
| 11 | **Aprovisionamiento Automático** (Orquestador BullMQ / Máquina de 7 estados) | **Integrado con proveedor simulado** | `provisioning-orchestrator.ts`, `provisioning-worker.ts` | `provisioning-orchestrator.spec.ts` (5), `provisioning-worker.spec.ts` (3), `provisioning.controller.spec.ts` (3) | Máquina de estados idempotente con outbox pattern. |
| 12 | **Hosting Management & Site Tools** (PHP, WordPress, DB, SSL) | **Implementado y probado en código** | `packages/domain/src/hosting/`, `apps/api/src/hosting/`, `apps/web/src/app/services/wordpress/` | `hosting-management.spec.ts` (11), `hosting.controller.spec.ts` (8) | Panel WordPress en frontend convertido a marca blanca (eliminadas menciones a HestiaCP y enlaces al puerto 8083). |
| 13 | **Cloud Apps / Dokploy Adapter** | **Implementado y probado en código** | `packages/deployment-adapters/src/dokploy/`, `apps/api/src/cloud-apps/`, `apps/web/src/app/services/apps/` | `dokploy-adapter.spec.ts` (5), `cloud-apps.controller.spec.ts` (8) | Controlador y UI conectados a métodos reales (`restartCloudApp`, `stopCloudApp`). |
| 14 | **DNS Manager Centralizado** (Zonas, RFC 1912, validaciones, BIND9) | **Implementado y probado en código** | `dns-manager.ts`, `hestia-dns.ts`, `dns.controller.ts`, `apps/web/src/app/dns/` | `dns-manager.spec.ts` (13), `hestia-dns.spec.ts` (4), `dns.controller.spec.ts` (8) | Botón "Reconciliar DNS" conectado a `ApiClient.reconcileDnsZone`. Etiqueta de UI convertida a "DNS Autoritativo Cloud". |
| 15 | **Portal Web de Clientes** (`apps/web` Next.js 15) | **Conectado a APIs reales** | `apps/web/src/modules/api-client.ts`, `apps/web/src/app/` | `module-registry.spec.ts` (7), `Navigation.spec.tsx` (5), `api-client.spec.ts` (5) | Soporte Bearer JWT y headers `x-tenant-id` para DNS, Hosting y Cloud Apps. |
| 16 | **CI/CD y Despliegue Automatizado** | **Conectado a proveedor real** | `.github/workflows/deploy.yml` | Pipeline GitHub Actions con compilación GHCR y deploy SSH | Despliegue automático a producción verificado. |
| 17 | **Infraestructura VPS Host** (`169.58.220.244`) | **Conectado a proveedor real** | Docker Engine 29.9.0 + Compose v5.6.0 | Puertos 4000 (API) y 3001 (Web) verificados con HTTP 200 | Puertos 80, 443 y 3000 escaneados y libres de conflictos. |
| 18 | **Cliente Piloto Velupi #001** | **Preparado para validación física** | `packages/domain/src/pilot/velupi-pilot.ts` | `velupi-pilot.spec.ts` (2), `e2e-integration.spec.ts` (2) | A la espera de autorización para aprovisionar recursos en vivo. |

---

## C. Resultados de la Auditoría Técnica y Diagnóstico de Red

### 1. Diagnóstico del Servidor DNS BIND9 (`89.117.147.134`)
- **Estado de servicio**: El puerto 53 (UDP/TCP) está abierto y BIND9 responde correctamente para zonas alojadas (ejemplo: `cloudfly.com.co` resuelve a `89.117.147.134`).
- **Estado de la zona `velupi.com`**:
  - `Resolve-DnsName -Name velupi.com -Server 89.117.147.134` responde con **`RCODE_REFUSED`**.
  - BIND9 rechaza consultas porque la zona `velupi.com` aún no ha sido declarada en el servidor.
- **Acción preventiva mandatoria**: **No modificar los nameservers en GoDaddy** hacia `ns1/ns2.velupi.com` ni `ns1/ns2.cloudfly.com.co` hasta que la zona `velupi.com` esté declarada y activa en BIND9 con los siguientes registros preparados:
  - `velupi.com. IN A 89.117.147.134` (Sitio comercial)
  - `api.velupi.com. IN A 169.58.220.244` (API Control Plane)
  - `app.velupi.com. IN A 169.58.220.244` (Portal de clientes)
  - `ns1.velupi.com. IN A 89.117.147.134` (Glue record NS1)
  - `ns2.velupi.com. IN A 89.117.147.134` (Glue record NS2)
  - `mail.velupi.com. IN A 89.117.147.134`
  - `velupi.com. IN MX 10 mail.velupi.com.`

### 2. Inspección del VPS de Docker (`169.58.220.244`)
- **Escaneo de puertos auditado en vivo**:
  - Puerto 22 (SSH): **ABIERTO**.
  - Puerto 80 (HTTP Traefik): **CERRADO** (Disponible sin conflictos).
  - Puerto 443 (HTTPS Traefik): **CERRADO** (Disponible sin conflictos).
  - Puerto 3000 (Dokploy Admin): **CERRADO** (Disponible sin conflictos).
  - Puerto 3001 (`velupi-web` Next.js): **ABIERTO** (`HTTP 200 OK`).
  - Puerto 4000 (`velupi-api` NestJS): **ABIERTO** (`HTTP 200 OK` en `/health`).
  - Puerto 5432 (PostgreSQL): **CERRADO** (Aislado de forma segura en la red interna de Docker).
  - Puerto 6379 (Redis): **CERRADO** (Aislado de forma segura en la red interna de Docker).
- **Riesgos y conflictos evaluados**: Ningún servicio host está ocupando los puertos 80, 443 o 3000. Traefik y Dokploy pueden desplegarse de manera limpia una vez autorizado por el usuario.

### 3. Transporte HTTPS HestiaCP (`89.117.147.134:8083`)
- **Implementación**: Se desarrolló `HestiaHttpsTransport` con:
  - Validación TLS estricta (`rejectUnauthorized: true`).
  - Control de tiempo de espera (`timeoutMs: 10000`) con `AbortController`.
  - Modo seguro de solo lectura (`readOnly: true` por defecto), que bloquea cualquier comando de mutación no autorizado con `HestiaReadOnlyViolationError`.
  - Lista blanca estricta de comandos de lectura (`v-list-web-domains`, `v-list-databases`, `v-list-dns-records`, etc.).

### 4. Conexión Real y Marca Blanca en Frontend (`app.velupi.com`)
- **ApiClient (`apps/web/src/modules/api-client.ts`)**:
  - Implementación completa de métodos para DNS (`listDnsZones`, `reconcileDnsZone`), Hosting (`listHostingSites`), y Cloud Apps (`listCloudApps`, `restartCloudApp`, `stopCloudApp`, `getCloudAppLogs`), con soporte para cabecera de aislamiento `x-tenant-id`.
- **White-Label estricto**:
  - Se eliminaron del frontend las referencias a `HestiaCP` y los enlaces directos al puerto `8083`.
  - Se renombraron las insignias técnicas internas (ejemplo: "Autoritativo BIND9" → "DNS Autoritativo Cloud").
  - Se reemplazaron las llamadas simuladas con `setTimeout` por invocaciones a `defaultApiClient` con manejo de errores y estados de carga.

---

## D. Pruebas Automatizadas y Cobertura

### Desglose de Pruebas (35 suites, 224 pruebas):
1. `packages/domain/src/dns/dns-manager.spec.ts`: 13 pruebas
2. `packages/domain/src/hosting/hosting-management.spec.ts`: 11 pruebas
3. `packages/persistence/src/database-persistence.spec.ts`: 4 pruebas (Mapeo real Prisma UoW)
4. `apps/web/src/modules/module-registry.spec.ts`: 7 pruebas
5. `packages/deployment-adapters/src/dokploy/dokploy-adapter.spec.ts`: 5 pruebas
6. `packages/domain/src/security/auth-service.spec.ts`: 14 pruebas
7. `apps/api/src/e2e-integration.spec.ts`: 2 pruebas (E2E transversal)
8. `apps/api/src/auth/auth-guard.spec.ts`: 10 pruebas
9. `packages/domain/src/commerce/subscription-service.spec.ts`: 11 pruebas
10. `apps/api/src/billing/billing.controller.spec.ts`: 13 pruebas
11. `apps/api/src/auth/auth.controller.spec.ts`: 11 pruebas
12. `apps/api/src/hosting/hosting.controller.spec.ts`: 8 pruebas
13. `packages/domain/src/cloud-apps/cloud-apps.spec.ts`: 7 pruebas
14. `packages/persistence/src/persistence.spec.ts`: 8 pruebas
15. `packages/domain/src/commerce/onboarding-order.spec.ts`: 7 pruebas
16. `apps/api/src/webhooks/webhooks.controller.spec.ts`: 4 pruebas
17. `packages/domain/src/pilot/velupi-pilot.spec.ts`: 2 pruebas
18. `apps/api/src/dns/dns.controller.spec.ts`: 8 pruebas
19. `packages/domain/src/commerce/catalog.spec.ts`: 4 pruebas
20. `packages/deployment-adapters/src/hestia/hestia-https-transport.spec.ts`: 3 pruebas
21. `apps/api/src/cloud-apps/cloud-apps.controller.spec.ts`: 8 pruebas
22. `packages/domain/src/commerce/wompi-payments.spec.ts`: 13 pruebas
23. `packages/domain/src/commerce/provisioning-worker.spec.ts`: 3 pruebas
24. `packages/domain/src/identity/rbac.spec.ts`: 6 pruebas
25. `packages/domain/src/commerce/provisioning-orchestrator.spec.ts`: 5 pruebas
26. `packages/deployment-adapters/src/hestia/hestia-adapter.spec.ts`: 4 pruebas
27. `packages/domain/src/projects/project-service.spec.ts`: 6 pruebas
28. `apps/web/src/modules/api-client.spec.ts`: 5 pruebas
29. `packages/deployment-adapters/src/hestia/hestia-dns.spec.ts`: 4 pruebas
30. `apps/api/src/dashboard/dashboard.controller.spec.ts`: 4 pruebas
31. `packages/domain/src/identity/tenant-guard.spec.ts`: 4 pruebas
32. `apps/api/src/provisioning/provisioning.controller.spec.ts`: 3 pruebas
33. `apps/api/src/checkout/checkout.controller.spec.ts`: 1 prueba
34. `apps/api/src/health/health.controller.spec.ts`: 1 prueba
35. `apps/web/src/components/Navigation.spec.tsx`: 5 pruebas

---

## E. Bloqueos Actuales y Autorizaciones Requeridas

1. **Creación de la zona `velupi.com` en BIND9 / HestiaCP (`89.117.147.134`)**:
   - *Bloqueo*: La zona no existe y retorna `RCODE_REFUSED`.
   - *Requerimiento*: Autorización para ejecutar el comando seguro de creación de zona en HestiaCP (`v-add-dns-domain admin velupi.com 89.117.147.134 ns1.velupi.com ns2.velupi.com`).
2. **Instalación de Dokploy y Traefik en el VPS (`169.58.220.244`)**:
   - *Bloqueo*: Los puertos 80, 443 y 3000 están cerrados y el runtime Dokploy no está instalado en el host.
   - *Requerimiento*: Autorización para ejecutar el script oficial de bootstrap de Dokploy en el VPS vía SSH.
3. **Credenciales de Wompi Sandbox**:
   - *Bloqueo*: Las pruebas usan claves simuladas (`prv_stag_...`, `pub_stag_...`).
   - *Requerimiento*: Claves oficiales de integración Wompi Sandbox para validación con transacciones de prueba reales.
4. **Validación del Piloto Velupi #001 en Vivo**:
   - *Bloqueo*: El piloto se encuentra probado y validado en suites E2E, pero no ha tocado recursos físicos en vivo por restricciones de seguridad.
   - *Requerimiento*: Confirmación explícita del usuario tras crear la zona BIND9 y levantar Dokploy.
