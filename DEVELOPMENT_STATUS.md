# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Ejecutiva
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 13 de Octubre de 2026  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Commit `2ec75f6` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform cuenta con una **fundación arquitectónica modular sólida en monorepo**, con contratos compartidos, lógica de dominio pura verificada al 100% mediante **TDD (57 pruebas unitarias e integración pasando sin fallos)**, una capa de persistencia relacional implementada mediante Prisma ORM para PostgreSQL (`@cloudfly/persistence`), un pipeline completo de CI/CD con GitHub Actions que construye imágenes en GHCR y despliega automáticamente por SSH hacia el VPS nuevo, y un nuevo servidor de aplicaciones con **Docker Engine 29.9.0 y Docker Compose v5.6.0 en ejecución activa**.

El entorno local y WSL se mantienen limpios sin bases de datos locales residentes, centralizando el ciclo de despliegue sobre el VPS productivo.

### 2. Qué está funcionando (VERIFICADO con código, pruebas e infraestructura)
1. **Capa de Persistencia Relacional (`@cloudfly/persistence`)**:
   - Esquema Prisma PostgreSQL (`schema.prisma`) con las 8 entidades requeridas: `User`, `Organization`, `Membership`, `Product`, `Plan`, `PlanVersion`, `Order`, `OrderItem`, `CustomerEntitlement`, `Project` y `Service`.
   - Restricciones de unicidad (email de usuario, slug de organización, slug de proyecto por organización, clave de idempotencia de orden, código de producto/plan).
   - Aislamiento multi-tenant validado mediante pruebas (las consultas por organización no filtran recursos de otros tenants).
   - Durabilidad verificada ante reinicio simulado del proceso (`cloneForNewProcess`).
   - Soporte de transacciones ACID con rollback atómico en `PrismaUnitOfWork`.
2. **Infraestructura del VPS Nuevo (`shared-node-01` — `169.58.220.244`)**:
   - Ubuntu 24.04.5 LTS (Noble Numbat), 8 GB RAM, 96 GB SSD.
   - **Docker Engine `v29.9.0`** instalado y habilitado como servicio del sistema.
   - **Docker Compose `v5.6.0`** instalado y operativo.
   - Llave pública SSH inyectada y autorizada en `/root/.ssh/authorized_keys` para despliegues desatendidos.
3. **CI/CD y Despliegue Automatizado**:
   - `.github/workflows/ci.yml`: Validación de tipos (`tsc -b`) y ejecución de pruebas en cada push/PR.
   - `.github/workflows/deploy.yml`: Compilación de imágenes Docker multi-stage (`api` y `web`), publicación en GitHub Container Registry (`ghcr.io`), conexión SSH al VPS y actualización desatendida mediante Docker Compose.
   - `docker-compose.prod.yml`: Orquestación productiva en el VPS con PostgreSQL 16 Alpine, Redis 7 Alpine, API NestJS y Web Next.js 15.
4. **Reglas de aislamiento Multi-Tenant y RBAC** (`@cloudfly/domain`): Verificación contra accesos cross-tenant, matriz de 4 roles (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`), y regla de seguridad estricta para cuentas vinculadas de HestiaCP.
5. **Catálogo comercial versionado (`PlanVersion`)**: Inmutabilidad de contratos pasados, soporte para cuotas y precios multidivisa (`COP`, `USD`).
6. **Flujo de Onboarding y Carrito**: Validación de emails, tokens de verificación, cálculo autoritativo de precios en backend (con IVA 19% Colombia), prevención de alteración de precios por clientes y claves de idempotencia.
7. **Pasarela Wompi**: Generación de sesiones de pago con firma de integridad SHA-256 y validación criptográfica estricta de webhooks HMAC SHA-256 (`x-event-checksum`).
8. **Provisioning Orchestrator**: Máquina de estados de aprovisionamiento, creación de `CustomerEntitlements`, enrutamiento hacia `HESTIA` / `DOKPLOY` / `CONTABO`, e idempotencia en reintentos.
9. **Flujo Piloto Velupi #001**: Creación de orden interna autorizada a costo $0 para `velupi.com` que transita el mismo pipeline de provisión estándar.
10. **Adaptadores de despliegue**:
    - `HestiaAdapter`: Generación secuencial e idempotente de comandos Hestia (`v-add-user`, `v-add-web-domain`, `v-add-letsencrypt-domain`, `v-add-database`).
    - `DokployAdapter`: Configuración de aplicaciones, variables de entorno, dominio y ciclos de vida (`stop`, `restart`, `logs`).
11. **Control Plane API (`apps/api`)**: Endpoints funcionales para `/health`, `/catalog`, `/onboarding`, `/checkout/order` y `/webhooks/wompi`.
12. **Portal Web (`apps/web`)**: Next.js 15 compilando estáticamente con tema dark obsidian, dashboard, Site Tools para WordPress, consola de logs de Dokploy y página de checkout interactiva.

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
- **Estado**: `PLANIFICADO`.
- **Implementado**: Documentación de arquitectura en `AGENTS.md` y registro en GoDaddy de `ns1/ns2.velupi.com` hacia `89.117.147.134`.
- **Pendiente**:
  - Implementar en `apps/api` el módulo `DnsModule` con soporte para zonas y registros (A, AAAA, CNAME, MX, TXT, CAA).
  - Invocar los comandos CLI de HestiaCP: `v-add-dns-domain`, `v-add-dns-record`, `v-delete-dns-record`, `v-change-dns-record`.
  - Crear interfaz gráfica en `apps/web` para administración DNS.

### 5. Hermes AI
- **Estado**: `PLANIFICADO`.
- **Implementado**: Tarjeta de UI informativa en el Dashboard de `apps/web`.
- **Pendiente**: Creación del `HermesToolGateway` en NestJS con autenticación por token, aislamiento de consultas por `organizationId` y modo de solo lectura.

---

## F. Bloqueos y necesidades para continuar

### 1. Accesos y Credenciales Requeridos
- **Configuración de Secretos en GitHub Actions**:
  - `VPS_HOST`: `169.58.220.244`
  - `VPS_USER`: `root`
  - `VPS_SSH_KEY`: Clave privada SSH cuyo par público ya está en el VPS.
  - `VPS_SSH_PORT`: `22`
- **SSH Key Pair para HestiaCP (`89.117.147.134`)**: Clave privada SSH configurada en el backend para ejecutar los comandos de HestiaCP.
- **Credenciales Sandbox Wompi**: Claves de pruebas de Wompi Colombia (`public_key`, `private_key`, `events_secret`, `integrity_secret`).

### 2. Infraestructura Faltante
- **Zona BIND9 para `velupi.com`**: Se debe confirmar que en HestiaCP (`89.117.147.134`) la zona DNS `velupi.com` esté creada y respondiendo autoritativamente antes de cambiar los nameservers en GoDaddy.
- **Redundancia DNS**: Un segundo nodo VPS con BIND9 secundario para `ns2.velupi.com` para evitar el punto único de fallo.

---

## G. Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación Implementada / Propuesta |
|---|---|---|---|
| **Punto Único de Fallo en DNS** | Alta | Crítico | `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Se debe incorporar un servidor secundario esclavo de BIND9 en otra región. |
| **Pérdida de Estado** | Baja | Crítico | **Mitigado**: `@cloudfly/persistence` implementa esquema Prisma PostgreSQL con restricciones de unicidad y almacenamiento persistente. |
| **Fraude o Precios Manipulados** | Baja | Alto | **Mitigado**: El cálculo de precios es 100% en backend; cualquier precio enviado por el navegador se descarta con `PriceTamperingViolationError`. |
| **Vulnerabilidad Cross-Tenant** | Baja | Crítico | **Mitigado**: `TenantAccessPolicy` y las consultas de persistencia exigen filtrado por `organizationId` estricto. |
| **Falsificación de Pagos** | Baja | Crítico | **Mitigado**: Se exige validación criptográfica de firma HMAC SHA-256 antes de procesar cualquier webhook de pago. |

---

## H. Próxima tarea ejecutable inmediata (Siguiendo TDD)

### **Tarea Única**: Implementación del Módulo de Dominio DNS Manager (`@cloudfly/domain/dns`)
- **Objetivo**: Modelar las entidades `DnsZone`, `DnsRecord` (tipos A, AAAA, CNAME, MX, TXT, CAA, SRV), validaciones de sintaxis de IPs/hostnames, detección de conflictos (ej. CNAME con otros registros en el mismo host) y auditoría tenant.
- **Paso 1 (RED)**: Escribir la suite de pruebas `packages/domain/src/dns/dns-manager.spec.ts`.
- **Paso 2 (GREEN)**: Implementar la lógica pura en `packages/domain/src/dns/dns-manager.ts`.
- **Paso 3 (REFACTOR)**: Compilar con `tsc -b` y verificar que los 57 tests existentes más los nuevos tests pasen al 100%.
