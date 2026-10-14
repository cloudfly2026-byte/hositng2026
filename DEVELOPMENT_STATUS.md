# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Ejecutiva
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de auditoría**: 13 de Octubre de 2026  
**Auditor**: Principal Software Architect, Technical Lead, Senior DevOps Engineer & QA Lead  
**Estado del repositorio**: Rama `main` | Commit `dd52a10` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform cuenta con una **fundación arquitectónica sólida en monorepo**, con contratos compartidos, lógica de dominio pura verificada mediante **TDD (49 pruebas unitarias pasando al 100%)**, adaptadores de despliegue estructurados para HestiaCP y Dokploy, una API backend inicial en NestJS (`apps/api`) y un portal web de autoservicio en Next.js 15 + MUI (`apps/web`) que compila a producción sin errores.

Sin embargo, **el proyecto se encuentra actualmente desacoplado de la persistencia real y de la infraestructura física en vivo**:
- La lógica de negocio utiliza repositorios en memoria (`Map<string, T>`). No existen modelos ORM (Prisma/TypeORM) ni migraciones aplicadas a PostgreSQL.
- Los adaptadores de infraestructura (`HestiaAdapter`, `DokployAdapter`, `WompiPaymentAdapter`) están probados exhaustivamente con contratos y transportes simulados (mocks/fakes), pero **no tienen conectores de red activos (SSH real o llamadas REST en vivo)** hacia los servidores.
- La infraestructura física conocida está parcialmente configurada: el VPS de HestiaCP (`89.117.147.134`) está activo, pero el VPS de Dokploy (`169.58.220.244`) sigue en estado *"limpio / sin setup"*.
- El **DNS Manager centralizado** sobre HestiaCP/BIND9 es una decisión técnica aprobada, pero su módulo de gestión en NestJS y la sincronización con BIND9 están **pendientes de desarrollo**.

### 2. Qué está funcionando (VERIFICADO con código y pruebas)
1. **Reglas de aislamiento Multi-Tenant y RBAC** (`@cloudfly/domain`): Verificación contra accesos cross-tenant, matriz de 4 roles (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`), y regla de seguridad estricta para cuentas vinculadas de HestiaCP.
2. **Catálogo comercial versionado (`PlanVersion`)**: Inmutabilidad de contratos pasados, soporte para cuotas y precios multidivisa (`COP`, `USD`).
3. **Flujo de Onboarding y Carrito**: Validación de emails, tokens de verificación, cálculo autoritativo de precios en backend (con IVA 19% Colombia), prevención de alteración de precios por clientes y claves de idempotencia.
4. **Pasarela Wompi**: Generación de sesiones de pago con firma de integridad SHA-256 y validación criptográfica estricta de webhooks HMAC SHA-256 (`x-event-checksum`).
5. **Provisioning Orchestrator**: Máquina de estados de aprovisionamiento, creación de `CustomerEntitlements`, enrutamiento hacia `HESTIA` / `DOKPLOY` / `CONTABO`, e idempotencia en reintentos.
6. **Flujo Piloto Velupi #001**: Creación de orden interna autorizada a costo $0 para `velupi.com` que transita el mismo pipeline de provisión estándar.
7. **Adaptadores de despliegue**:
   - `HestiaAdapter`: Generación secuencial e idempotente de comandos Hestia (`v-add-user`, `v-add-web-domain`, `v-add-letsencrypt-domain`, `v-add-database`).
   - `DokployAdapter`: Configuración de aplicaciones, variables de entorno, dominio y ciclos de vida (`stop`, `restart`, `logs`).
8. **Control Plane API (`apps/api`)**: Endpoints funcionales para `/health`, `/catalog`, `/onboarding`, `/checkout/order` y `/webhooks/wompi`.
9. **Portal Web (`apps/web`)**: Next.js 15 compilando estáticamente con tema dark obsidian, dashboard, Site Tools para WordPress, consola de logs de Dokploy y página de checkout interactiva.
10. **Infraestructura local**: `docker-compose.yml` para PostgreSQL 16 y Redis 7 listo para levantar.

### 3. Qué NO está funcionando (Brechas reales)
1. **Persistencia relacional**: La API no guarda datos en PostgreSQL. Si el proceso de Node.js se reinicia, todos los usuarios, órdenes y configuraciones en memoria se pierden.
2. **Colas asíncronas BullMQ**: El orquestador opera en memoria síncrona; falta implementar el worker de BullMQ conectado a Redis para procesar los jobs en segundo plano.
3. **Conexión de red real con HestiaCP**: El transporte SSH / API HTTPS de HestiaCP en `89.117.147.134` utiliza un fake en pruebas; no se ha configurado un cliente SSH2 o HTTP en producción.
4. **Instalación de Dokploy en `shared-node-01`**: El VPS `169.58.220.244` no tiene instalado Docker ni Dokploy; no existe API endpoint real accesible allí.
5. **DNS Manager centralizado**: No existe el módulo backend para administrar zonas DNS, TTL ni registros A/CNAME/MX/TXT en HestiaCP/BIND9.
6. **Autenticación real (JWT / Sesiones / Hashing de contraseñas)**: Las entidades de usuario existen en dominio, pero no hay un middleware de autenticación por tokens JWT ni bcrypt/argon2 en la API.
7. **Contabo API Adapter**: Módulo no iniciado.
8. **Hermes AI Tool Gateway**: Módulo no iniciado.

### 4. Principales bloqueos
- Falta de capa de persistencia ORM (bloquea la persistencia de usuarios, órdenes y zonas DNS).
- El VPS `169.58.220.244` carece de bootstrap seguro e instalación de Docker/Dokploy.
- Credenciales reales de sandbox de Wompi (llaves públicas/privadas y secretos de eventos) no inyectadas en variables de entorno.
- Falta de configuración de una clave SSH privada para que el backend de NestJS invoque comandos en HestiaCP de forma desatendida.

### 5. Próximo hito recomendado
**Hito 1: Persistencia Relacional y DNS Manager Centralizado (Sprint 1)**
1. Implementar la capa de persistencia PostgreSQL (Prisma o Drizzle) para usuarios, organizaciones, órdenes, entitlements y zonas DNS.
2. Desarrollar el módulo **DNS Manager** en `apps/api` con soporte para registros BIND9 en HestiaCP.

---

## B. Inventario técnico

### 1. Repositorios y ramas
- **Repositorio**: `https://github.com/cloudfly2026-byte/hositng2026.git`
- **Rama activa**: `main`
- **Último commit**: `dd52a10`
- **Gestor de paquetes**: `pnpm@10.28.2` (Monorepo con workspaces).

### 2. Tecnologías en código
- **Lenguaje**: TypeScript 5.7.3 / 5.9.3 (Strict composite mode con `tsc -b`).
- **Backend API**: NestJS 11.0.9 + RxJS 7.8.1 + Express.
- **Frontend**: Next.js 15.5.27 + React 19 + Material UI 6.4.3 + Emotion.
- **Testing**: Vitest 3.2.7.
- **Infraestructura local**: Docker Compose (PostgreSQL 16 Alpine, Redis 7 Alpine).

### 3. Paquetes y Aplicaciones del Monorepo

```text
hosting2026/
├── apps/
│   ├── api/                   # NestJS Control Plane (Health, Catalog, Onboarding, Checkout, Webhooks)
│   └── web/                   # Next.js 15 + MUI Client Portal (Dashboard, Site Tools, Apps, Checkout)
├── packages/
│   ├── contracts/             # Interfaces agnósticas (DeploymentProvider, PaymentProvider, Roles, DTOs)
│   ├── domain/                # Lógica pura de negocio (RBAC, Tenancy, Catalog, Orders, Provisioning)
│   └── deployment-adapters/   # Adaptadores técnicos (HestiaAdapter, DokployAdapter)
├── infra/
│   └── local/                 # Docker Compose (PostgreSQL 16, Redis 7)
└── .github/
    └── workflows/ci.yml       # CI (typecheck + vitest)
```

### 4. Infraestructura física verificada

| Componente | Dirección / Host | Estado Real | Nivel de Verificación |
|---|---|---|---|
| **Servidor HestiaCP** | `cloudfly.com.co` (`89.117.147.134`) | Aprovisionado y con HestiaCP activo | **VERIFICADO** (Datos de GoDaddy y configuración operativa) |
| **Nameservers Asignados** | `ns1.cloudfly.com.co`, `ns2.cloudfly.com.co` | Delegados en GoDaddy para `velupi.com` | **VERIFICADO** (Captura de pantalla de GoDaddy) |
| **Glue Records (Child Hostnames)** | `ns1.velupi.com`, `ns2.velupi.com` | Registrados en GoDaddy → `89.117.147.134` | **VERIFICADO** (Captura de pantalla de GoDaddy Hostnames) |
| **Redundancia DNS** | Ambos NS apuntan a `89.117.147.134` | **Sin redundancia** (punto único de fallo) | **VERIFICADO** (Misma IP en ambos hostnames) |
| **VPS de Aplicaciones (`shared-node-01`)** | `169.58.220.244` | VPS encendido, sin software de plataforma | **VERIFICADO** (Cloud VPS 4 MP, estado limpio) |
| **PostgreSQL Producción** | No aprovisionado | Solo definido en `docker-compose.yml` local | **PLANIFICADO** |
| **Redis Producción** | No aprovisionado | Solo definido en `docker-compose.yml` local | **PLANIFICADO** |

---

## C. Matriz de implementación

| # | Módulo / Componente | Estado | Evidencia | Pruebas | Pendientes | Prioridad |
|---|---|---|---|---|---|---|
| 1 | **Identidad y autenticación** | `IN_PROGRESS` | `packages/domain/src/identity/` | `rbac.spec.ts` (6 tests) | Hashing bcrypt, generación/validación JWT, MFA | ALTA |
| 2 | **Multiempresa y permisos (RBAC)** | `TESTED` | `packages/domain/src/identity/rbac.ts` | `rbac.spec.ts`, `tenant-guard.spec.ts` (10 tests) | Integración con guardias HTTP de NestJS | ALTA |
| 3 | **Clientes y organizaciones** | `TESTED` | `packages/domain/src/commerce/onboarding-order.ts` | `onboarding-order.spec.ts` (6 tests) | Persistencia en base de datos PostgreSQL | CRÍTICA |
| 4 | **Catálogo de productos y planes** | `TESTED` | `packages/domain/src/commerce/catalog.ts` | `catalog.spec.ts` (4 tests) | Endpoint de edición administrativa | MEDIA |
| 5 | **Registro comercial (Onboarding)** | `TESTED` | `apps/api/src/onboarding/` | `onboarding-order.spec.ts` | Envío real de emails SMTP/SES con el token | MEDIA |
| 6 | **Checkout** | `TESTED` | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` | Captura de datos de facturación (NIT/Dirección) | ALTA |
| 7 | **Wompi y Billing** | `TESTED` | `packages/domain/src/commerce/wompi-payments.ts` | `wompi-payments.spec.ts` (8 tests) | Credenciales reales de sandbox en `.env` | ALTA |
| 8 | **Órdenes y suscripciones** | `TESTED` | `packages/domain/src/commerce/onboarding-order.ts` | `onboarding-order.spec.ts` | Período de gracia y job de conciliación | ALTA |
| 9 | **Aprovisionamiento automático** | `TESTED` | `packages/domain/src/commerce/provisioning-orchestrator.ts` | `provisioning-orchestrator.spec.ts` (4 tests) | Integración con colas BullMQ en Redis | CRÍTICA |
| 10 | **Integración HestiaCP** | `TESTED` | `packages/deployment-adapters/src/hestia/` | `hestia-adapter.spec.ts` (4 tests) | Conector de transporte SSH2 / API HTTP real | CRÍTICA |
| 11 | **Integración Dokploy** | `TESTED` | `packages/deployment-adapters/src/dokploy/` | `dokploy-adapter.spec.ts` (5 tests) | Instalación de Dokploy en VPS `169.58.220.244` | ALTA |
| 12 | **Integración Contabo** | `NOT_STARTED` | Solo especificado en `AGENTS.md` | Ninguna | Adaptador IaaS agnóstico para VPS dedicados | MEDIA |
| 13 | **DNS Manager centralizado** | `PLANIFICADO` | Especificación de BIND9 / GoDaddy | Ninguna | Módulo NestJS, CLI BIND9, validación de registros | CRÍTICA |
| 14 | **Dominios y SSL** | `TESTED` | Lógica en `HestiaAdapter` y `DokployAdapter` | Tests en adaptadores | Comprobación activa de certificados en vivo | MEDIA |
| 15 | **Microservices Studio** | `PLANIFICADO` | Especificación en `AGENTS.md` | Ninguna | Diseñador visual de grafos y exportación YAML | BAJA |
| 16 | **Hermes AI** | `PLANIFICADO` | Solo interfaz simulada en `apps/web` | Ninguna | Gateway de solo lectura y sanitización de logs | BAJA |
| 17 | **Backups** | `PARCIAL` | Método stub en `HestiaAdapter` y UI | Ninguna | Tareas programadas de snapshot y test de restore | MEDIA |
| 18 | **Monitoreo y logs** | `TESTED` | Métodos `logs()` en ambos adaptadores | `dokploy-adapter.spec.ts` | Streaming WebSockets hacia el portal web | MEDIA |
| 19 | **Panel administrativo (Operator)** | `NOT_STARTED` | Especificado en `AGENTS.md` | Ninguna | Vistas de métricas de nodos y capacidad | MEDIA |
| 20 | **Panel de clientes** | `IMPLEMENTED` | `apps/web/` (Next.js 15 + MUI) | Build de producción verificado | Conectar llamadas REST hacia `apps/api` | ALTA |
| 21 | **CI/CD** | `IMPLEMENTED` | `.github/workflows/ci.yml` | Pipeline de Typecheck y Vitest | CD automatizado para desplegar en VPS | MEDIA |
| 22 | **Seguridad y aislamiento multi-tenant** | `TESTED` | `TenantAccessPolicy` en dominio | `tenant-guard.spec.ts` (4 tests) | Decorador/Interceptor `@TenantGuard()` en NestJS | ALTA |

---

## D. Resultados TDD

### Métricas de ejecución (VERIFICADO)
- **Framework de pruebas**: Vitest `v3.2.7`.
- **Suites de prueba**: 11 archivos de test.
- **Tests ejecutados**: **49 pruebas**.
- **Tests aprobados**: **49 (100%)**.
- **Tests fallidos**: **0**.
- **Tests omitidos**: **0**.
- **Tiempo de ejecución**: 3.26 segundos.

### Desglose por paquete
1. `@cloudfly/domain`:
   - `tenant-guard.spec.ts`: 4 tests (aislamiento tenant, permisos de rol).
   - `rbac.spec.ts`: 6 tests (matriz RBAC, regla HestiaCP, auditoría).
   - `project-service.spec.ts`: 6 tests (slugs, cuotas positivas, prevención de fuga de secretos).
   - `catalog.spec.ts`: 4 tests (versiones de plan, inmutabilidad, multidivisa).
   - `onboarding-order.spec.ts`: 6 tests (registro sin provisión prematura, cálculo backend de IVA, idempotencia).
   - `wompi-payments.spec.ts`: 8 tests (sesión Wompi, firma HMAC, idempotencia de webhooks, orden de eventos).
   - `provisioning-orchestrator.spec.ts`: 4 tests (orden pagada → entitlement → job, enrutamiento Hestia/Dokploy, piloto Velupi).
2. `@cloudfly/deployment-adapters`:
   - `hestia-adapter.spec.ts`: 4 tests (capacidades, comandos secuenciales, reconciliación idempotente de usuarios/dominios existentes, status).
   - `dokploy-adapter.spec.ts`: 5 tests (capacidades, create/deploy, status, stop/restart, logs).
3. `@cloudfly/api`:
   - `health.controller.spec.ts`: 1 test (descubrimiento de nodos `cloudfly.com.co` y `169.58.220.244`).
   - `checkout.controller.spec.ts`: 1 test (orden con cálculo en backend y sesión Wompi).

### Cumplimiento del ciclo TDD
- **Evidencia en historial Git**: En cada commit (`34496ae`, `108ea7f`, `ef40bfa`, `cba3a05`, `ae1ef96`, `f210bcf`, `eb38d2f`), se redactó primero la especificación de pruebas fallando (**RED**) antes de introducir la clase concreta para alcanzar el estado verde (**GREEN**), seguido del saneamiento de tipos estricto (**REFACTOR**).
- **Incumplimientos detectados**: La capa web en `apps/web` cuenta con validación de compilación (`next build`), pero carece de pruebas de componentes unitarias (React Testing Library) o pruebas E2E (Playwright).

---

## E. Integraciones externas

### 1. HestiaCP (`cloudfly.com.co` / `89.117.147.134`)
- **Estado**: `PARCIAL`.
- **Implementado**: Clase `HestiaAdapter` con lógica secuencial de comandos CLI (`v-add-user`, `v-add-web-domain`, `v-add-letsencrypt-domain`, `v-add-database`) e idempotencia.
- **Pendiente**: Falta el conector de transporte SSH real (ej. `ssh2`) con autenticación por clave privada segura, o el cliente HTTPS hacia la API de Hestia en el puerto `8083`.

### 2. Dokploy / Docker (`shared-node-01` / `169.58.220.244`)
- **Estado**: `PARCIAL`.
- **Implementado**: Clase `DokployAdapter` que modela la API de Dokploy (creación de app, variables de entorno, Traefik domain mapping, logs y reinicio).
- **Pendiente**: El servidor VPS no tiene instalado Dokploy ni Docker. Falta ejecutar el script de instalación oficial (`curl -sSL https://dokploy.com/setup.sh | sh`) en el servidor y generar la API Key administrativa.

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
*(No suministrar contraseñas en texto plano; configurar en variables de entorno locales o secret manager)*:
- **SSH Key Pair para HestiaCP**: Clave privada SSH sin passphrase configurada en el backend para ejecutar de forma desatendida los comandos de aprovisionamiento en `89.117.147.134`.
- **Dokploy API Key**: API Key generada desde el panel de Dokploy una vez instalado en `169.58.220.244`.
- **Credenciales Sandbox Wompi**: Claves de pruebas de Wompi Colombia (`public_key`, `private_key`, `events_secret`, `integrity_secret`) para validar transacciones reales en el sandbox.

### 2. Infraestructura Faltante
- **Instalación de Docker y Dokploy**: El VPS `169.58.220.244` debe ser aprovisionado con Ubuntu 22.04/24.04, Docker Engine y Dokploy.
- **Zona BIND9 para `velupi.com`**: Se debe confirmar que en HestiaCP (`89.117.147.134`) la zona DNS `velupi.com` esté creada y respondiendo autoritativamente a consultas DNS antes de cambiar los nameservers en GoDaddy.
- **Redundancia DNS**: Un segundo nodo VPS con BIND9 secundario para `ns2.velupi.com` para evitar el punto único de fallo.

### 3. Decisiones Técnicas Pendientes
- **Elección de ORM**: Decidir entre **Prisma ORM** o **Drizzle ORM** para modelar el esquema en PostgreSQL.
- **Mapeo de dominios de aplicaciones**: Confirmar si las aplicaciones de clientes recibirán subdominios temporales wildcard bajo `*.apps.velupi.com` mediante registro DNS wildcard `* IN A 169.58.220.244`.

---

## G. Matriz de Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación Implementada / Propuesta |
|---|---|---|---|
| **Punto Único de Fallo en DNS** | Alta | Crítico | `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Se debe incorporar un servidor secundario esclavo de BIND9 en otra región. |
| **Pérdida de Estado por Falta de DB** | Alta | Crítico | Implementar inmediatamente la persistencia en PostgreSQL con migraciones versionadas. |
| **Fraude o Precios Manipulados** | Baja | Alto | **Mitigado**: El cálculo de precios es 100% en backend; cualquier precio enviado por el navegador se descarta con `PriceTamperingViolationError`. |
| **Vulnerabilidad Cross-Tenant** | Baja | Crítico | **Mitigado**: La clase `TenantAccessPolicy` exige `context.organizationId === targetOrgId` en cada operación de datos. |
| **Falsificación de Pagos** | Baja | Crítico | **Mitigado**: Se exige validación criptográfica de firma HMAC SHA-256 antes de procesar cualquier webhook de pago. |
| **Suspensión Destructiva de Clientes** | Media | Alto | **Mitigado**: La política de `AGENTS.md` prohíbe el borrado de archivos o bases de datos; la falta de pago solo suspende vhosts. |

---

## H. Plan de trabajo (Próximas 2 semanas)

### Semana 1: Persistencia Relacional y DNS Manager Centralizado
1. **Tarea 1.1 (TDD)**: Configuración del ORM (Prisma/PostgreSQL) en `packages/domain` con esquemas de `User`, `Organization`, `Order`, `PlanVersion` y `CustomerEntitlement`.
2. **Tarea 1.2 (TDD)**: Implementación de repositorios PostgreSQL con transacciones e índices para multi-tenancy.
3. **Tarea 1.3 (TDD)**: Implementación de la entidad y servicio de **DNS Manager** (`DnsZone`, `DnsRecord`) con validación de registros (A, CNAME, MX, TXT) y TTL.
4. **Tarea 1.4 (TDD)**: Conector de comandos DNS hacia HestiaCP (`v-add-dns-domain`, `v-add-dns-record`).
5. **Tarea 1.5**: Interfaz visual de gestión DNS en `apps/web/src/app/services/dns/page.tsx`.

### Semana 2: Conexión Real de Infraestructura y Flujo Wompi Sandbox
1. **Tarea 2.1**: Hardening e instalación de Dokploy en `169.58.220.244`.
2. **Tarea 2.2 (TDD)**: Implementación del transporte SSH2 real para `HestiaAdapter`.
3. **Tarea 2.3 (TDD)**: Implementación del cliente HTTP real para `DokployAdapter`.
4. **Tarea 2.4 (TDD)**: Worker de colas BullMQ conectado a Redis para procesar `ProvisioningJob` en segundo plano.
5. **Tarea 2.5 (E2E)**: Prueba integral del flujo comercial completo de WordPress en sandbox.

---

## I. Próxima tarea ejecutable inmediata (Siguiendo TDD)

### **Tarea Única**: Implementación del Módulo de Dominio DNS Manager (`@cloudfly/domain/dns`)
- **Objetivo**: Modelar las entidades `DnsZone`, `DnsRecord` (tipos A, AAAA, CNAME, MX, TXT, CAA, SRV), validaciones de sintaxis de IPs/hostnames, detección de conflictos (ej. CNAME con otros registros en el mismo host) y auditoría tenant.
- **Paso 1 (RED)**: Escribir la suite de pruebas `packages/domain/src/dns/dns-manager.spec.ts`.
- **Paso 2 (GREEN)**: Implementar la lógica pura en `packages/domain/src/dns/dns-manager.ts`.
- **Paso 3 (REFACTOR)**: Compilar con `tsc -b` y verificar que los 49 tests existentes más los nuevos tests pasen al 100%.
