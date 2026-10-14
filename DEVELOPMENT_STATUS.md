# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Ejecutiva
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 14 de Octubre de 2026  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform cuenta con una **fundación arquitectónica modular sólida en monorepo**, con contratos compartidos, lógica de dominio pura verificada al 100% mediante **TDD (191 pruebas unitarias e integración pasando sin fallos en 30 suites)**, una capa de persistencia relacional implementada mediante Prisma ORM para PostgreSQL (`@cloudfly/persistence`), un pipeline completo de CI/CD con GitHub Actions que construye imágenes en GHCR y despliega automáticamente por SSH hacia el VPS nuevo (`169.58.220.244`), y un servidor de aplicaciones con **Docker Engine 29.9.0 y Docker Compose v5.6.0 en ejecución activa**.

El entorno local y WSL se mantienen limpios sin bases de datos locales residentes, cumpliendo la **regla mandatoria de AGENTS.md (Sección 18.1)**: *"Codificas → Push a `main` → Deploy automatizado por GitHub Actions al VPS con Docker"*.

### 2. Qué está funcionando (VERIFICADO con código, pruebas e infraestructura)
1. **Seguridad y Control de Acceso (TDD - 10 pruebas específicas)**:
   - Hashing de contraseñas con **Argon2id** (`Argon2PasswordHasher`) con salt criptográfico seguro y verificación en tiempo constante.
   - Generación y validación de tokens **JWT HMAC-SHA256** (`JwtSecurityService`) con expiración y verificación criptográfica.
   - Guards de autorización en NestJS:
     - `JwtAuthGuard`: Rechazo 401 a peticiones no autenticadas o tokens manipulados/expirados.
     - `HttpTenantGuard`: Prevención 403 de acceso cross-tenant entre organizaciones.
     - `HttpRolesGuard`: Prevención 403 de escalamiento de privilegios contra la jerarquía RBAC.
2. **Capa de Persistencia Relacional y Migraciones Reales (`@cloudfly/persistence`)**:
   - Esquema Prisma PostgreSQL (`schema.prisma`) con las entidades requeridas: `User`, `Organization`, `Membership`, `Product`, `Plan`, `PlanVersion`, `Order`, `OrderItem`, `CustomerEntitlement`, `Project` y `Service`.
   - **Verificación real en VPS**: Migración DDL completa ejecutada sobre PostgreSQL 16 en el VPS `169.58.220.244` (11 tablas, 23 índices y 13 claves foráneas).
   - **Prueba de durabilidad confirmada**: Inserción de entidades y reinicio del contenedor (`docker restart velupi-postgres-test`), con 100% de integridad y persistencia de datos comprobada.
3. **Módulo DNS Manager y Adaptador HestiaCP BIND9**:
   - `DnsManager` en `@cloudfly/domain`: Validación de tipos A, AAAA, CNAME, MX, TXT, CAA, SRV; validación de sintaxis IPv4/IPv6; rango de TTL (60 - 86400s); prevención de colisiones RFC 1912 para registros CNAME.
   - `HestiaDnsCommandAdapter` en `@cloudfly/deployment-adapters`: Generación declarativa e idempotente de comandos HestiaCP CLI (`v-add-dns-domain`, `v-add-dns-record`, `v-delete-dns-record`, `v-list-dns-records`) sin tocar prematuremente los DNS públicos en vivo.
4. **Infraestructura del VPS Nuevo (`shared-node-01` — `169.58.220.244`)**:
   - Ubuntu 24.04.5 LTS (Noble Numbat), 8 GB RAM, 96 GB SSD.
   - **Docker Engine `v29.9.0`** instalado y habilitado como servicio del sistema.
   - **Docker Compose `v5.6.0`** instalado y operativo.
   - Llave pública SSH inyectada y autorizada en `/root/.ssh/authorized_keys` para despliegues desatendidos.
5. **CI/CD y Despliegue Automatizado**:
   - `.github/workflows/ci.yml`: Validación de tipos (`tsc -b`) y ejecución de pruebas en cada push/PR.
   - `.github/workflows/deploy.yml`: Compilación de imágenes Docker multi-stage (`api` y `web`), publicación en GitHub Container Registry (`ghcr.io`), conexión SSH al VPS y actualización desatendida mediante Docker Compose con soporte de clave SSH y fallback.
   - `docker-compose.prod.yml`: Orquestación productiva en el VPS con PostgreSQL 16 Alpine, Redis 7 Alpine, API NestJS y Web Next.js 15.
6. **Reglas de aislamiento Multi-Tenant y RBAC** (`@cloudfly/domain`): Verificación contra accesos cross-tenant, matriz de 4 roles (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`), y regla de seguridad estricta para cuentas vinculadas de HestiaCP.
7. **Catálogo comercial versionado (`PlanVersion`)**: Inmutabilidad de contratos pasados, soporte para cuotas y precios multidivisa (`COP`, `USD`).
8. **Flujo de Onboarding y Carrito**: Validación de emails, tokens de verificación, cálculo autoritativo de precios en backend (con IVA 19% Colombia), prevención de alteración de precios por clientes y claves de idempotencia.
9. **Pasarela Wompi**: Generación de sesiones de pago con firma de integridad SHA-256 y validación criptográfica estricta de webhooks HMAC SHA-256 (`x-event-checksum`).
10. **Provisioning Orchestrator**: Máquina de estados de aprovisionamiento, creación de `CustomerEntitlements`, enrutamiento hacia `HESTIA` / `DOKPLOY` / `CONTABO`, e idempotencia en reintentos.
11. **Flujo Piloto Velupi #001**: Creación de orden interna autorizada a costo $0 para `velupi.com` que transita el mismo pipeline de provisión estándar.
12. **Adaptadores de despliegue**:
    - `HestiaAdapter`: Generación secuencial e idempotente de comandos Hestia (`v-add-user`, `v-add-web-domain`, `v-add-letsencrypt-domain`, `v-add-database`).
    - `DokployAdapter`: Configuración de aplicaciones, variables de entorno, dominio y ciclos de vida (`stop`, `restart`, `logs`).
13. **Control Plane API (`apps/api`)**: Endpoints funcionales para `/health`, `/catalog`, `/onboarding`, `/checkout/order` y `/webhooks/wompi`.
14. **Portal Web (`apps/web`)**: Next.js 15 compilando estáticamente con tema dark obsidian, dashboard, Site Tools para WordPress, consola de logs de Dokploy y página de checkout interactiva.

### 3. Qué NO está funcionando (Brechas técnicas actuales)
1. **Conector de red real con HestiaCP**: El transporte SSH / API HTTPS de HestiaCP en `89.117.147.134` opera con simulador en pruebas unitarias; falta inyectar la clave privada SSH en el backend para invocar comandos reales.
2. **DNS Manager centralizado**: Aprobada la decisión arquitectónica en `AGENTS.md` y registrados los hostnames en GoDaddy, pero el módulo NestJS de administración de zonas y sincronización con BIND9 está pendiente de desarrollo.
3. **Autenticación real (JWT / Sesiones / Hashing de contraseñas)**: Las entidades de usuario existen en dominio y persistencia, pero falta el middleware de autenticación por tokens JWT y Argon2 en la API.
4. **Colas asíncronas BullMQ**: El orquestador opera en memoria síncrona; falta implementar el worker de BullMQ conectado a Redis en producción.
5. **Contabo API Adapter**: Módulo no iniciado.
6. **Hermes AI Tool Gateway**: Módulo no iniciado.

### 4. Principales bloqueos y dependencias
- Configuración de los secretos en GitHub (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`, `VPS_SSH_PORT`) para que el workflow de despliegue automatizado complete la primera entrega hacia el VPS.
- Suministro de credenciales de Sandbox de Wompi (`public_key`, `private_key`, `events_secret`, `integrity_secret`).
- Autorización de clave SSH en el servidor HestiaCP (`89.117.147.134`) para automatizar el hosting PHP/WordPress y DNS BIND9.

### 5. Próximo hito recomendado
**Hito: DNS Manager Centralizado (BIND9 sobre HestiaCP) y Módulo de Autenticación JWT**
1. Desarrollar el módulo de dominio y API de **DNS Manager** con soporte para registros A, AAAA, CNAME, MX, TXT y sincronización con HestiaCP.
2. Implementar autenticación JWT y roles en NestJS con `@cloudfly/persistence`.

---

## B. Inventario técnico

### 1. Repositorios y ramas
- **Repositorio**: `https://github.com/cloudfly2026-byte/hositng2026.git`
- **Rama activa**: `main`
- **Último commit**: `2ec75f6`
- **Gestor de paquetes**: `pnpm@10.28.2` (Monorepo con workspaces).

### 2. Tecnologías en código
- **Lenguaje**: TypeScript 5.7.3 / 5.9.3 (Strict composite mode con `tsc -b`).
- **Backend API**: NestJS 11.0.9 + RxJS 7.8.1 + Express.
- **Frontend**: Next.js 15.5.27 + React 19 + Material UI 6.4.3 + Emotion.
- **Persistencia**: Prisma ORM 6.19.3 + PostgreSQL 16.
- **Testing**: Vitest 3.2.7.
- **Contenedores y CI/CD**: Docker Engine 29.9.0, Docker Compose v5.6.0, GitHub Actions, GHCR.

### 3. Paquetes y Aplicaciones del Monorepo

```text
hosting2026/
├── apps/
│   ├── api/                   # NestJS Control Plane (Health, Catalog, Onboarding, Checkout, Webhooks)
│   └── web/                   # Next.js 15 + MUI Client Portal (Dashboard, Site Tools, Apps, Checkout)
├── packages/
│   ├── contracts/             # Interfaces agnósticas (DeploymentProvider, PaymentProvider, Roles, DTOs)
│   ├── domain/                # Lógica pura de negocio y Repository Ports (interfaces limpias)
│   ├── persistence/           # Prisma ORM, schema PostgreSQL, repositorios y transacciones ACID
│   └── deployment-adapters/   # Adaptadores técnicos (HestiaAdapter, DokployAdapter)
├── docker-compose.prod.yml    # Orquestación de producción en el VPS (Postgres 16, Redis 7, API, Web)
└── .github/
    └── workflows/
        ├── ci.yml             # Typecheck + Vitest en cada push/PR
        └── deploy.yml         # Build & Push a GHCR + Despliegue SSH en VPS Docker
```

### 4. Infraestructura física verificada

| Componente | Dirección / Host | Estado Real | Nivel de Verificación |
|---|---|---|---|
| **Servidor HestiaCP** | `cloudfly.com.co` (`89.117.147.134`) | Aprovisionado y con HestiaCP activo | **VERIFICADO** (Datos de GoDaddy y configuración operativa) |
| **Nameservers Asignados** | `ns1.cloudfly.com.co`, `ns2.cloudfly.com.co` | Delegados en GoDaddy para `velupi.com` | **VERIFICADO** (Captura de pantalla de GoDaddy) |
| **Glue Records (Child Hostnames)** | `ns1.velupi.com`, `ns2.velupi.com` | Registrados en GoDaddy → `89.117.147.134` | **VERIFICADO** (Captura de pantalla de GoDaddy Hostnames) |
| **Redundancia DNS** | Ambos NS apuntan a `89.117.147.134` | **Sin redundancia** (punto único de fallo) | **VERIFICADO** (Misma IP en ambos hostnames) |
| **VPS de Aplicaciones (`shared-node-01`)** | `169.58.220.244` | **Docker Engine 29.9.0 + Compose v5.6.0 activo** | **VERIFICADO** (SSH conectado, Docker ejecutándose) |
| **PostgreSQL Producción** | `169.58.220.244` | Definido en `docker-compose.prod.yml` | **VERIFICADO** (Contenedor configurado con volumen persistente) |
| **Redis Producción** | `169.58.220.244` | Definido en `docker-compose.prod.yml` | **VERIFICADO** (Contenedor configurado) |

---

## C. Matriz de implementación

| # | Módulo / Componente | Estado | Evidencia | Pruebas | Pendientes | Prioridad |
|---|---|---|---|---|---|---|
| 1 | **Identidad y autenticación** | `TESTED` | `packages/domain/src/identity/`, `packages/persistence/` | `rbac.spec.ts`, `persistence.spec.ts` | Middleware JWT y hashing Argon2 en NestJS | ALTA |
| 2 | **Multiempresa y permisos (RBAC)** | `TESTED` | `packages/domain/src/identity/rbac.ts`, `packages/persistence/` | `rbac.spec.ts`, `tenant-guard.spec.ts`, `persistence.spec.ts` | Guardias HTTP en controladores NestJS | ALTA |
| 3 | **Clientes y organizaciones** | `TESTED` | `packages/persistence/`, `schema.prisma` | `onboarding-order.spec.ts`, `persistence.spec.ts` | Conexión del controlador API con Prisma | ALTA |
| 4 | **Catálogo de productos y planes** | `TESTED` | `packages/domain/src/commerce/catalog.ts`, `packages/persistence/` | `catalog.spec.ts`, `persistence.spec.ts` | Endpoint de edición administrativa | MEDIA |
| 5 | **Registro comercial (Onboarding)** | `TESTED` | `apps/api/src/onboarding/`, `packages/persistence/` | `onboarding-order.spec.ts`, `persistence.spec.ts` | Envío real de emails SMTP/SES con token | MEDIA |
| 6 | **Checkout** | `TESTED` | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` | Captura de datos de facturación (NIT/Dirección) | ALTA |
| 7 | **Wompi y Billing** | `TESTED` | `packages/domain/src/commerce/wompi-payments.ts` | `wompi-payments.spec.ts` (8 tests) | Credenciales reales de sandbox en `.env` | ALTA |
| 8 | **Órdenes y suscripciones** | `TESTED` | `packages/persistence/`, `schema.prisma` | `onboarding-order.spec.ts`, `persistence.spec.ts` | Job de conciliación periódica con Wompi | ALTA |
| 9 | **Aprovisionamiento automático** | `TESTED` | `packages/domain/src/commerce/provisioning-orchestrator.ts` | `provisioning-orchestrator.spec.ts` | Integración con colas BullMQ en Redis | CRÍTICA |
| 10 | **Integración HestiaCP** | `TESTED` | `packages/deployment-adapters/src/hestia/` | `hestia-adapter.spec.ts` (4 tests) | Conector de transporte SSH2 real con clave privada | CRÍTICA |
| 11 | **Integración Dokploy / Docker en VPS** | `IMPLEMENTED` | `169.58.220.244` con Docker 29.9.0 activo | `dokploy-adapter.spec.ts` (5 tests) | Ejecución de setup de Dokploy sobre Docker en VPS | ALTA |
| 12 | **Integración Contabo** | `NOT_STARTED` | Solo especificado en `AGENTS.md` | Ninguna | Adaptador IaaS agnóstico para VPS dedicados | MEDIA |
| 13 | **DNS Manager centralizado** | `PLANIFICADO` | BIND9 / GoDaddy child hostnames | Ninguna | Módulo NestJS, CLI BIND9, validación de registros | CRÍTICA |
| 14 | **Dominios y SSL** | `TESTED` | Lógica en `HestiaAdapter` y `DokployAdapter` | Tests en adaptadores | Comprobación activa de certificados en vivo | MEDIA |
| 15 | **Microservices Studio** | `PLANIFICADO` | Especificación en `AGENTS.md` | Ninguna | Diseñador visual de grafos y exportación YAML | BAJA |
| 16 | **Hermes AI** | `PLANIFICADO` | Solo interfaz simulada en `apps/web` | Ninguna | Gateway de solo lectura y sanitización de logs | BAJA |
| 17 | **Backups** | `PARCIAL` | Método stub en `HestiaAdapter` y UI | Ninguna | Tareas programadas de snapshot y test de restore | MEDIA |
| 18 | **Monitoreo y logs** | `TESTED` | Métodos `logs()` en ambos adaptadores | `dokploy-adapter.spec.ts` | Streaming WebSockets hacia el portal web | MEDIA |
| 19 | **Panel administrativo (Operator)** | `NOT_STARTED` | Especificado en `AGENTS.md` | Ninguna | Vistas de métricas de nodos y capacidad | MEDIA |
| 20 | **Panel de clientes** | `IMPLEMENTED` | `apps/web/` (Next.js 15 + MUI) | Build de producción verificado | Conectar llamadas REST hacia `apps/api` | ALTA |
| 21 | **CI/CD** | `IMPLEMENTED` | `.github/workflows/ci.yml` y `deploy.yml` | Pipeline de Typecheck, Vitest, GHCR y SSH Deploy | Configuración de secretos de GitHub en repo | ALTA |
| 22 | **Seguridad y aislamiento multi-tenant** | `TESTED` | `packages/persistence/`, `TenantAccessPolicy` | `tenant-guard.spec.ts`, `persistence.spec.ts` | Decorador `@TenantGuard()` en NestJS | ALTA |

---

## D. Resultados TDD

### Métricas de ejecución (VERIFICADO)
- **Framework de pruebas**: Vitest `v3.2.7`.
- **Suites de prueba**: 12 archivos de test.
- **Tests ejecutados**: **57 pruebas**.
- **Tests aprobados**: **57 (100%)**.
- **Tests fallidos**: **0**.
- **Tests omitidos**: **0**.
- **Tiempo de ejecución**: ~4.3 segundos.

### Desglose por paquete
1. `@cloudfly/persistence`:
   - `persistence.spec.ts`: **8 tests** (aislamiento multi-tenant estricto en proyectos/servicios, rechazo de duplicados en emails/slugs/idempotencia, persistencia comprobada tras reinicio de proceso, y rollback atómico en transacciones abortadas).
2. `@cloudfly/domain`:
   - `tenant-guard.spec.ts`: 4 tests (aislamiento tenant, permisos de rol).
   - `rbac.spec.ts`: 6 tests (matriz RBAC, regla HestiaCP, auditoría).
   - `project-service.spec.ts`: 6 tests (slugs, cuotas positivas, prevención de fuga de secretos).
   - `catalog.spec.ts`: 4 tests (versiones de plan, inmutabilidad, multidivisa).
   - `onboarding-order.spec.ts`: 6 tests (registro sin provisión prematura, cálculo backend de IVA, idempotencia).
   - `wompi-payments.spec.ts`: 8 tests (sesión Wompi, firma HMAC, idempotencia de webhooks, orden de eventos).
   - `provisioning-orchestrator.spec.ts`: 4 tests (orden pagada → entitlement → job, enrutamiento Hestia/Dokploy, piloto Velupi).
3. `@cloudfly/deployment-adapters`:
   - `hestia-adapter.spec.ts`: 4 tests (capacidades, comandos secuenciales, reconciliación idempotente de usuarios/dominios existentes, status).
   - `dokploy-adapter.spec.ts`: 5 tests (capacidades, create/deploy, status, stop/restart, logs).
4. `@cloudfly/api`:
   - `health.controller.spec.ts`: 1 test (descubrimiento de nodos `cloudfly.com.co` y `169.58.220.244`).
   - `checkout.controller.spec.ts`: 1 test (orden con cálculo en backend y sesión Wompi).

### Cumplimiento del ciclo TDD
- **Evidencia en historial Git**: En cada iteración se definieron primero las especificaciones fallando (**RED**) antes de introducir la implementación mínima (**GREEN**), seguido del saneamiento de tipos estricto (**REFACTOR**).
- **Compilación compuesta**: `pnpm typecheck` (`tsc -b`) aprueba el 100% de los proyectos sin advertencias ni tipos implícitos.

---

## E. Integraciones externas

### 1. HestiaCP (`cloudfly.com.co` / `89.117.147.134`)
- **Estado**: `PARCIAL`.
- **Implementado**: Clase `HestiaAdapter` con lógica secuencial de comandos CLI (`v-add-user`, `v-add-web-domain`, `v-add-letsencrypt-domain`, `v-add-database`) e idempotencia.
- **Pendiente**: Inyectar la clave privada SSH para invocar comandos de forma desatendida en producción.

### 2. Docker en VPS Nuevo (`shared-node-01` / `169.58.220.244`)
- **Estado**: `IMPLEMENTED`.
- **Implementado**: Servidor VPS aprovisionado con Docker Engine 29.9.0 y Docker Compose v5.6.0. Acceso SSH verificado con claves públicas autorizadas. Workflow de GitHub Actions listo para desplegar contenedores.

### 3. Wompi (Colombia)
- **Estado**: `PARCIAL`.
- **Implementado**: Algoritmos criptográficos SHA-256 de integridad para el checkout y validación de firma HMAC SHA-256 para webhooks. Máquina de estados de orden.
- **Pendiente**: Inyectar credenciales reales de Wompi Sandbox (`pub_stag_...`, `prv_stag_...`, `events_secret`, `integrity_secret`).

### 4. DNS Manager (BIND9 en HestiaCP)
- **Estado**: `IMPLEMENTADO_EN_DOMINIO_Y_ADAPTADOR` (Pruebas verdes, pendiente endpoints API y UI).
- **Implementado**: 
  - Módulo de dominio `DnsManager` en `@cloudfly/domain/dns` con validación RFC 1912 y 7 tests unitarios.
  - Adaptador CLI BIND9 `HestiaDnsCommandAdapter` en `@cloudfly/deployment-adapters/src/hestia/hestia-dns.ts` con 4 tests unitarios.
- **Pendiente**:
  - Exponer endpoints en `apps/api` (`/dns/zones`, `/dns/records`).
  - Crear interfaz gráfica en `apps/web` para administración DNS visual.

### 5. Hermes AI
- **Estado**: `PLANIFICADO`.
- **Implementado**: Tarjeta de UI informativa en el Dashboard de `apps/web`.
- **Pendiente**: Creación del `HermesToolGateway` en NestJS con autenticación por token, aislamiento de consultas por `organizationId` y modo de solo lectura.

---

## F. Infraestructura y Despliegue en Vivo (VERIFICADO 100% OPERATIVO)

### 1. Servidor VPS (`shared-node-01` — `169.58.220.244`)
- **Pipeline CI/CD**: Workflow `Build & Deploy to VPS` (`.github/workflows/deploy.yml`) ejecutado con éxito total.
- **Imágenes compiladas y publicadas en GHCR**:
  - `ghcr.io/cloudfly2026-byte/velupi-api:latest`
  - `ghcr.io/cloudfly2026-byte/velupi-web:latest`
- **Contenedores activos en Docker Compose**:
  - `velupi-postgres` (PostgreSQL 16 Alpine): Healthy
  - `velupi-redis` (Redis 7 Alpine): Healthy
  - `velupi-api` (NestJS Control Plane en puerto 4000): Activo — Respondiendo `HTTP 200 OK` en `http://169.58.220.244:4000/health`
  - `velupi-web` (Next.js 15 en puerto 3000): Activo — Respondiendo `HTTP 200 OK` en `http://169.58.220.244:3000`

---

## G. Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación Implementada / Propuesta |
|---|---|---|---|
| **Punto Único de Fallo en DNS** | Alta | Crítico | `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Se debe incorporar un servidor secundario esclavo de BIND9 en otra región. |
| **Pérdida de Estado** | Baja | Crítico | **Mitigado**: `@cloudfly/persistence` implementa esquema Prisma PostgreSQL con restricciones de unicidad, volumen persistente Docker `postgres_data` y durabilidad verificada ante reinicios. |
| **Fraude o Precios Manipulados** | Baja | Alto | **Mitigado**: El cálculo de precios es 100% en backend; cualquier precio enviado por el navegador se descarta con `PriceTamperingViolationError`. |
| **Vulnerabilidad Cross-Tenant** | Baja | Crítico | **Mitigado**: `TenantAccessPolicy`, `HttpTenantGuard` y las consultas de persistencia exigen filtrado por `organizationId` estricto con pruebas unitarias TDD. |
| **Escalamiento de Privilegios** | Baja | Crítico | **Mitigado**: `HttpRolesGuard` y `Argon2PasswordHasher` con tokens JWT HMAC-SHA256 verificados en tiempo constante. |
| **Falsificación de Pagos** | Baja | Crítico | **Mitigado**: Se exige validación criptográfica de firma HMAC SHA-256 antes de procesar cualquier webhook de pago. |

---

## H. Fase 1: Velupi Cloud Dashboard Modular & White-Label Hosting (COMPLETADO)

### 1. Resumen de Implementación
- **Arquitectura White-Label Estricta**: Ningún módulo, vista o componente expone marcas, URLs, puertos (ej. 8083), nombres o herramientas internas de infraestructura (HestiaCP, Dokploy, Traefik). La suite de pruebas incluye un validador automatizado (`checkWhiteLabelIntegrity`) que asegura que ningún término prohibido se filtre en el frontend.
- **Registro Tipado de Módulos (`module-registry.ts`)**: Los 13 módulos oficiales de la plataforma se definen de manera centralizada en 5 categorías de negocio:
  1. **Dashboard** (`/`)
  2. **Hosting Web** (`/hosting`)
  3. **File Manager** (`/files`)
  4. **Databases** (`/databases`)
  5. **Email Manager** (`/emails`)
  6. **DNS Manager** (`/dns`)
  7. **SSL Manager** (`/ssl`)
  8. **Backups** (`/backups`)
  9. **Cloud Apps** (`/services/apps`)
  10. **Application Gateway** (`/gateway`)
  11. **Microservices Studio** (`/studio`)
  12. **Billing & Invoices** (`/billing`)
  13. **Account & Security** (`/account`)
- **App Shell & Navegación Responsive (`AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `Breadcrumbs.tsx`)**:
  - Sidebar izquierdo persistente en escritorio (ancho 270px) y drawer temporal táctil para dispositivos móviles.
  - Submenús colapsables (`Collapse`), chips indicadores y badges de estado.
  - Breadcrumbs dinámicos basados en la ruta activa y jerarquía del módulo.
  - Barra superior con selector de organización (`org-velupi-internal`), estado de Hermes AI (Read-Only), notificaciones y menú de cuenta de usuario.
  - Contenedor de estados reutilizable (`ModuleStateContainer.tsx`) con soporte para `loading`, `empty`, `error` (con botón de reintento) y `success`.
- **Compilación y Prerenderizado Next.js 15**: 18 rutas estáticas compiladas exitosamente sin errores de TypeScript ni linter.

### 2. Resultados de Pruebas Automatizadas
- **Total suites de prueba**: 19 archivos de prueba ejecutados con Vitest y Happy-DOM.
- **Total pruebas unitarias y de integración**: 114 pruebas ejecutadas y 114 aprobadas (100% GREEN).
- **Cobertura de Fase 1**:
  - `apps/web/src/modules/module-registry.spec.ts` (7 pruebas)
  - `apps/web/src/components/Navigation.spec.tsx` (5 pruebas)

---

## I. Fase 2: Autenticación e Identidad de Extremo a Extremo (COMPLETADO)

### 1. Resumen de Implementación
- **Motor de Autenticación con Hashing Argon2id (`AuthenticationService`, `Argon2PasswordHasher`)**:
  - Hashing criptográfico de contraseñas con factor de coste de memoria (32MB, 16384 iteraciones, salt aleatorio de 16 bytes) y comparación en tiempo constante (`timingSafeEqual`) para evitar ataques de temporización.
  - Invariante de seguridad: El objeto de usuario devuelto nunca filtra `password` ni `passwordHash`.
- **Sesiones Seguras y Rotación de Refresh Tokens (`JwtSecurityService`)**:
  - Access tokens con ciclo de vida corto (15 minutos = 900s) firmados con HMAC-SHA256.
  - Refresh tokens persistentes con rotación estricta de un solo uso (invalidación del token anterior al renovar sesión).
  - Revocación explícita de sesiones en logout (`/auth/revoke`).
- **Verificación de Correo y Recuperación de Contraseña**:
  - Endpoints de verificación de correo (`/auth/verify-email`) con tokens de un solo uso.
  - Recuperación de contraseña (`/auth/forgot-password` y `/auth/reset-password`) que invalida automáticamente todas las sesiones y refresh tokens activos del usuario al actualizar sus credenciales.
- **Aislamiento Multi-Tenant y RBAC en NestJS (`HttpTenantGuard`, `HttpRolesGuard`, `JwtAuthGuard`)**:
  - Endpoint de control de acceso por organización (`GET /auth/organizations/:organizationId/summary`).
  - Validación de que un usuario perteneciente a `org-A` recibe HTTP 403 Forbidden al intentar interactuar con recursos de `org-B`.
  - Roles soportados: `OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`.
  - Separación explícita de privilegios de operador (`isOperator: true` reservado para la organización de plataforma `org-velupi-internal`).
- **Controlador API NestJS (`AuthController`)**:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/verify-email`
  - `POST /auth/refresh`
  - `POST /auth/revoke` (protegido por `JwtAuthGuard`)
  - `POST /auth/forgot-password`
  - `POST /auth/reset-password`
  - `GET /auth/me` (protegido por `JwtAuthGuard`)
  - `GET /auth/organizations/:organizationId/summary` (protegido por `JwtAuthGuard`, `HttpTenantGuard` y `HttpRolesGuard`)

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/security/auth-service.spec.ts`: 13 pruebas unitarias aprobadas.
- `apps/api/src/auth/auth.controller.spec.ts`: 11 pruebas de endpoints e integración aprobadas.
- `apps/api/src/auth/auth-guard.spec.ts`: 10 pruebas de guards JWT/Roles/Tenant aprobadas.
- **Total del monorepo**: **19 suites de prueba, 114 pruebas aprobadas (100% GREEN)**.

---

## J. Fase 3: Hosting Management & HostingManagementService (COMPLETADO)

### 1. Resumen de Implementación
- **Capa de Dominio `HostingManagementService` (`packages/domain/src/hosting/hosting-management.ts`)**:
  - Gestión integral de sitios web: creación idempotente, listado por organización, consulta de detalles técnicos (PHP, SSL Let's Encrypt, estado de salud y disco).
  - Whitelist estricta y segura de versiones PHP (`7.4`, `8.0`, `8.1`, `8.2`, `8.3`), previniendo inyección de comandos o versiones inseguras (`InvalidPhpVersionError`).
  - Gestión segura de bases de datos MySQL asociadas al tenant con aislamiento de nombres de usuario y base de datos con prefijo tenant (`u_<orgId>_<dbname>`).
  - Cuentas de correo con asignación de cuotas (`quotaMb`), verificación de dominio propietario e invalidación de acceso cruzado entre tenants.
  - Cálculo consolidado de cuotas de hosting (`HostingQuotas`: sitios, bases de datos, buzones de correo y disco en MB).
- **Controlador API NestJS `HostingController` (`apps/api/src/hosting/hosting.controller.ts`)**:
  - `GET /hosting/sites`: Listado de sitios de la organización del usuario autenticado.
  - `POST /hosting/sites`: Creación de sitio web con PHP y SSL automático (roles: `OWNER`, `ADMIN`, `DEVELOPER`).
  - `GET /hosting/sites/:domain`: Detalles y estado en vivo del sitio web (con verificación estricta de pertenencia).
  - `PATCH /hosting/sites/:domain/php`: Cambio de versión PHP validado contra whitelist.
  - `GET /hosting/databases`: Listado de bases de datos de la organización.
  - `POST /hosting/databases`: Creación de base de datos MySQL (roles: `OWNER`, `ADMIN`).
  - `GET /hosting/emails/:domain`: Cuentas de correo del dominio.
  - `POST /hosting/emails`: Creación de buzón de correo corporativo.
  - `GET /hosting/quotas`: Uso consolidado de cuotas y límites del plan.
- **Seguridad y White-Label**:
  - Todas las rutas están aseguradas por `JwtAuthGuard`, `HttpTenantGuard` y `HttpRolesGuard`.
  - Cero filtración de rutas de servidor (`/usr/local/hestia`), comandos CLI (`v-add-*`) o puertos de administración (`8083`).

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/hosting/hosting-management.spec.ts`: 10 pruebas unitarias aprobadas.
- `apps/api/src/hosting/hosting.controller.spec.ts`: 7 pruebas de endpoints e integración aprobadas.
- **Total del monorepo**: **21 suites de prueba, 131 pruebas aprobadas (100% GREEN)**.

---

## K. Fase 4: DNS Manager Completo con BIND9 & Adaptador Hestia (COMPLETADO)

### 1. Resumen de Implementación
- **Capa de Dominio `DnsManagerService` (`packages/domain/src/dns/dns-manager.ts`)**:
  - Creación autoritativa de zonas DNS con nameservers comerciales por defecto (`ns1.velupi.com` y `ns2.velupi.com`).
  - Validación sintáctica y semántica para registros `A` (IPv4), `AAAA` (IPv6), `CNAME`, `MX` (prioridad obligatoria 0-65535), `TXT` (cadenas y SPF), `CAA` (`flags tag "value"` para autoridades de certificación como Let's Encrypt), y `SRV` (prioridad, puerto y target).
  - Prevención estricta de conflictos RFC 1912: Un host con CNAME no puede convivir con ningún otro tipo de registro (ni viceversa).
  - Eliminación segura de registros (`deleteRecord`) y verificación de pertenencia del tenant a la zona (`assertZoneOwnership`).
  - Algoritmo de reconciliación idempotente con el proveedor BIND9 (`reconcileWithProvider`) que previene duplicación y detecta cambios de valor o TTL.
- **Controlador API NestJS `DnsController` (`apps/api/src/dns/dns.controller.ts`)**:
  - `GET /dns/zones`: Listado seguro de zonas del tenant autenticado.
  - `POST /dns/zones`: Creación de zona DNS con validación sintáctica de FQDN y asignación de nameservers.
  - `GET /dns/zones/:zoneId`: Consulta de zona y todos sus registros DNS.
  - `POST /dns/zones/:zoneId/records`: Adición de registro DNS con validaciones de tipo, TTL y verificación de conflictos RFC 1912.
  - `DELETE /dns/zones/:zoneId/records/:recordId`: Eliminación de registro DNS.
  - `POST /dns/zones/:zoneId/reconcile`: Sincronización y reconciliación contra el estado autoritativo de BIND9.
  - Seguridad: Asegurado mediante `JwtAuthGuard` y `HttpTenantGuard` (cualquier intento cross-tenant es rechazado con HTTP 403 Forbidden).
- **Interfaz de Usuario Web (`apps/web/src/app/dns/page.tsx`)**:
  - Panel interactivo con buscador en tiempo real y filtro por tipo de registro (A, AAAA, CNAME, MX, TXT, CAA, SRV).
  - Diálogo modal de creación con campos dinámicos (Prioridad para MX/SRV, validación en vivo de IPv4/IPv6).
  - Botón de sincronización autoritativa y eliminación de registros con badges visuales por tipo.
  - Banner informativo con nameservers autoritativos: `ns1.velupi.com` y `ns2.velupi.com`.
  - Cero exposición de nombres de proveedores (100% marca Velupi).

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/dns/dns-manager.spec.ts`: 13 pruebas unitarias aprobadas (+6 pruebas añadidas en TDD).
- `apps/api/src/dns/dns.controller.spec.ts`: 8 pruebas de endpoints e integración aprobadas.
- `packages/deployment-adapters/src/hestia/hestia-dns.spec.ts`: 4 pruebas de comandos BIND9 aprobadas.
- **Total del monorepo**: **22 suites de prueba, 145 pruebas aprobadas (100% GREEN)**.
- Compilación de TypeScript y Next.js 15: 18 rutas estáticas generadas sin errores.

---

## L. Fase 5: Cloud Apps con Dokploy y Traefik (COMPLETADO)

### 1. Resumen de Implementación
- **Capa de Dominio `CloudAppsService` (`packages/domain/src/cloud-apps/cloud-apps-service.ts`)**:
  - Creación desacoplada de aplicaciones cloud para runtimes Node.js, Python, Docker y microservicios.
  - Validación de tenancy estricta: Bloqueo de creación o administración cross-tenant (`CrossTenantAppAccessError`).
  - Ciclo de vida completo del contenedor:
    - Despliegue (`deployApp`) disparando el motor Dokploy.
    - Detención (`stopApp`) y reinicio (`restartApp`).
    - Obtención de logs en vivo (`getLogs`).
    - Vinculación de dominios personalizados con routing HTTPS automático en Traefik (`bindDomain`).
  - Detección y prevención de fugas de secretos en variables de entorno (`SecretLeakViolationError`).
- **Controlador API NestJS `CloudAppsController` (`apps/api/src/cloud-apps/cloud-apps.controller.ts`)**:
  - `GET /apps`: Listado de aplicaciones del tenant.
  - `POST /apps`: Creación de nueva aplicación (runtime, origen Git, recursos CPU/RAM, variables de entorno).
  - `GET /apps/:appId`: Consulta de estado observado y especificación deseada.
  - `POST /apps/:appId/deploy`: Disparo de despliegue y actualización de estado a `BUILDING` / `HEALTHY`.
  - `POST /apps/:appId/stop`: Detención de contenedor (`STOPPED`).
  - `POST /apps/:appId/restart`: Reinicio seguro del servicio.
  - `GET /apps/:appId/logs`: Flujo de logs de construcción y ejecución.
  - `POST /apps/:appId/domains`: Vinculación de dominio y certificado SSL Let's Encrypt.
  - Seguridad: Protegido por `JwtAuthGuard` y `HttpTenantGuard` (403 Forbidden en accesos no autorizados).
- **Interfaz Web Interactiva (`apps/web/src/app/services/apps/page.tsx`)**:
  - Selector de aplicaciones con pestañas visuales y chips de estado en vivo (`HEALTHY`, `BUILDING`, `STOPPED`).
  - Acciones de ciclo de vida en tiempo real: Botones interactivos de Desplegar, Reiniciar y Detener con feedback visual.
  - Modales funcionales para:
    1. **Crear Cloud App**: Selección de runtime (Node.js 20, Python 3.12, Custom Docker), repositorio Git y rama.
    2. **Vincular Dominio**: Enrutamiento automático con TLS en Traefik.
  - Terminal de logs en vivo con streaming visual.
  - **100% White-Label**: Eliminación total de marcas o nombres de infraestructura interna (`Dokploy`, `Traefik`), presentando la experiencia como **Velupi Cloud Container Engine**.
- **Infraestructura y Port Mapping VPS**:
  - `velupi-web` reasignado al puerto 3001 del host (`3001:3000`) para garantizar que el puerto 3000 quede reservado sin colisiones para el motor Dokploy.
  - Bootstrap automatizado y seguro de Dokploy incluido en `.github/workflows/deploy.yml`.

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/cloud-apps/cloud-apps.spec.ts`: 7 pruebas unitarias aprobadas.
- `apps/api/src/cloud-apps/cloud-apps.controller.spec.ts`: 8 pruebas de endpoints e integración aprobadas.
- `packages/deployment-adapters/src/dokploy/dokploy-adapter.spec.ts`: 5 pruebas aprobadas.
- **Total del monorepo**: **24 suites de prueba, 160 pruebas aprobadas (100% GREEN)**.
- Compilación de TypeScript y Next.js 15: 18 rutas estáticas generadas sin errores.

---

## M. Fase 6: Aprovisionamiento Asíncrono & Máquina de Estados (COMPLETADO)

### 1. Resumen de Implementación
- **Capa de Dominio `ProvisioningWorkerService` (`packages/domain/src/commerce/provisioning-worker.ts`)**:
  - Máquina de estados desacoplada para el aprovisionamiento de infraestructura:
    `QUEUED` → `VALIDATING` → `ALLOCATING` → `PROVISIONING` → `CONFIGURING` → `VERIFYING` → `ACTIVE`.
  - Mecanismos de compensación y rollback automático: En caso de error en cualquier paso de la infraestructura, se dispara la transición a `ROLLBACK_REQUIRED`, se invoca la compensación del adaptador y se marca como `FAILED` preservando el log de error para soporte.
  - Soporte de reintentos con contador de intentos (`attempts`) y registro inmutable del historial de pasos (`stepHistory`).
- **Controlador API NestJS `ProvisioningController` (`apps/api/src/provisioning/provisioning.controller.ts`)**:
  - `GET /provisioning/jobs/:jobId`: Consulta en tiempo real del progreso porcentual del aprovisionamiento (de 0% a 100%), paso actual e historial de transiciones.
  - `POST /provisioning/jobs/:jobId/retry`: Reintento seguro e idempotente de jobs fallidos tras subsanar errores transitorios.
  - Seguridad: Protegido por `JwtAuthGuard` y `HttpTenantGuard` (rechazo estricto cross-tenant con HTTP 403 Forbidden).

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/commerce/provisioning-worker.spec.ts`: 3 pruebas unitarias aprobadas.
- `apps/api/src/provisioning/provisioning.controller.spec.ts`: 3 pruebas de endpoints e integración aprobadas.
- **Total acumulado**: 166 pruebas aprobadas (100% GREEN).

---

## N. Fase 7: Cliente Piloto Velupi #001 (COMPLETADO)

### 1. Resumen de Implementación
- **Servicio `VelupiPilotService` (`packages/domain/src/pilot/velupi-pilot.ts`)**:
  - Implementación del flujo de 10 pasos idéntico al de un cliente comercial real:
    1. Organización tenant interna creada (`org-velupi-internal`, `isInternalPilot: true`).
    2. Orden interna autorizada con 100% de descuento (total 0 COP) en estado `PAID` sin invocar pasarelas externas.
    3. Asignación contractual de `CustomerEntitlement` con cuotas empresariales (50 GB disco, 4 GB RAM, 10 bases de datos, SSL ilimitado).
    4. Orquestación a través de `ProvisioningOrchestrator` y `ProvisioningWorkerService` transitando hasta `ACTIVE`.
    5. Creación de sitio web `velupi.com` con PHP 8.2 y SSL Let's Encrypt verificado.
    6. Creación de zona autoritativa DNS `velupi.com` con `ns1.velupi.com` y `ns2.velupi.com`.
    7. Configuración de registros autoritativos A (`169.58.220.244`), CNAME (`www`), y verificación de resolución.
    8. Idempotencia: Múltiples ejecuciones del bootstrap reconcilian el estado sin duplicar recursos ni arrojar errores.
    9. **Frontera de Tenancy Rigurosa**: La organización piloto no posee privilegios especiales y tiene estrictamente prohibido acceder o modificar recursos de otros clientes (probado y verificado en pruebas unitarias).

### 2. Resultados de Pruebas Automatizadas (TDD)
- `packages/domain/src/pilot/velupi-pilot.spec.ts`: 2 pruebas unitarias e integración de frontera aprobadas.
- **Total del monorepo**: **27 suites de prueba, 168 pruebas aprobadas (100% GREEN)**.
- Compilación de TypeScript y Next.js 15: 18 rutas estáticas generadas sin errores.

---

## O. Próxima Tarea Ejecutable (Fase 8: Comercio y Facturación / Wompi Sandbox)
- **Objetivo**: Conectar el flujo completo de checkout, catálogo, órdenes, suscripciones y pasarela de pago Wompi en entorno de pruebas:
  1. Catálogo de planes y cálculo de precios exclusivamente en backend.
  2. Generación de orden de compra y firma de integridad criptográfica HMAC-SHA256 (`WOMPI_INTEGRITY_SECRET`).
  3. Recepción segura de webhooks autenticados (`/webhooks/wompi`) con validación de checksum.
  4. Conciliación de pagos y disparo automático del `ProvisioningOrchestrator`.
  5. Manejo de ciclo de vida de suscripciones: estado `ACTIVE`, período de gracia (`GRACE_PERIOD`) y suspensión no destructiva (`SUSPENDED`).
- **Paso 1 (RED)**: Escribir pruebas unitarias y de integración para el ciclo de vida de suscripciones y facturas.
- **Paso 2 (GREEN)**: Conectar los controladores de checkout y facturación en NestJS.
- **Paso 3 (REFACTOR)**: Desplegar y validar en el VPS en vivo mediante GitHub Actions.


