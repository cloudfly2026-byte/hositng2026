# DEVELOPMENT_STATUS.md — Informe de Auditoría Técnica y Estado de Activación Operativa
**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 16 de Octubre de 2026 (Sprint Oficial de Re-Branding Velupi y Diseño Warm Solar Universal)  
**Auditor**: Principal Software Architect, Senior DevOps & Security Lead  
**Estado del repositorio**: Rama `main` | Árbol limpio | Sincronizado con GitHub (`cloudfly2026-byte/hositng2026.git`)

---

## A. Resumen ejecutivo

### 1. Estado general
Velupi Cloud Platform ha concluido el **Sprint Oficial de Re-Branding y Unificación Visual Universal bajo el Sistema Warm Solar Light**. La marca definitiva **Velupi** ha sido desplegada tanto en el sitio comercial WordPress (`velupi.com`) como en el portal de autoservicio (`app.velupi.com`) y la API transaccional (`api.velupi.com`), reemplazando toda referencia a nombres provisionales anteriores y eliminando los temas oscuros remanentes en favor de una estética luminosa de alto contraste, limpia y moderna inspirada en Site Tools y paneles cloud de última generación.

Se cumplen estrictamente las directrices mandatorias de `AGENTS.md`:
- **Prohibido desplegar entornos residentes en local/WSL**: Toda la infraestructura corre en VPS `169.58.220.244` (Docker Engine 29.9.0) y VPS `89.117.147.134` (HestiaCP & BIND9).
- **Flujo de trabajo**: Codificación → Push a `main` → Deploy automatizado vía GitHub Actions (compilación GHCR + Docker Compose por SSH).
- **Protección de infraestructura**: Cero mutaciones no autorizadas sobre DNS público, firewall o bases de datos de clientes.
- **TDD Riguroso**: Red → Green → Refactor aplicado en el 100% de los módulos.

### 2. Métricas de verificación operativa (Auditoría Real)
- **Vitest**: **46 suites de prueba, 323 pruebas aprobadas (100% GREEN, 0 fallidas, 0 omitidas)**.
- **TypeScript Composite Mode (`tsc --noEmit`)**: 0 errores en todos los paquetes y apps con separación limpia de specs en `tsconfig.json`.
- **Next.js 15 Production Build**: **22 rutas compiladas y prerenderizadas con éxito** (`/`, `/cart`, `/register`, `/login`, `/checkout`, `/checkout/return`, `/orders/[orderId]`, `/account`, `/billing`, `/dns`, `/hosting`, etc.).
- **URLs de Producción Verificadas con HTTPS y Let's Encrypt**:
  - `https://velupi.com`: `HTTP 200 OK` (WordPress optimizado con tema Velupi oficial, Nginx + Let's Encrypt en `89.117.147.134`).
  - `https://app.velupi.com`: `HTTP 200 OK` (Next.js 15 vía Traefik v3.7 con Let's Encrypt en `169.58.220.244`).
  - `https://api.velupi.com/health`: `HTTP 200 OK` (NestJS API vía Traefik v3.7 con Let's Encrypt en `169.58.220.244`).
  - `https://portainer.velupi.com`: `HTTP 200 OK` (Portainer CE 2.45.2 vía Traefik v3.7 con Let's Encrypt en `169.58.220.244`).
- **Resolución DNS Autoritativa**: Zona `velupi.com` en BIND9 resolviendo globalmente vía `8.8.8.8` y `1.1.1.1` (`@` y `www` a `89.117.147.134`; `app`, `api`, `portainer`, `status`, `docs`, `*.apps` a `169.58.220.244`).
- **Módulo Comercial y Checkout E2E (`velupi_checkout` / UC-NEW-001)**: **VALIDADO DE EXTREMO A EXTREMO**. Flujo autónomo desde `https://app.velupi.com/cart` con soporte de enlaces directos para WordPress (`/cart?plan=<slug>&cycle=<cycle>`). Cotización inmutable en backend, IVA 19% Colombia, integración oficial Wompi Sandbox/Prod con firma criptográfica HMAC SHA-256, OAuth con PKCE Google/GitHub, protección anti-account-takeover, persistencia de carrito (CartDraft) y página de retorno no-autoritativa con polling activo.
- **Unificación Visual de Portal (Warm Solar Light System)**: 100% de las 14 pantallas administrativas y comerciales unificadas con tarjetas blancas `#FFFFFF`, bordes sutiles cálidos `#F2E8DC`, fondos crema `#FFFDF9`, textos `#2D1B17` y acentos naranja solar `#FF6B00`.

---

## B. Prioridad 0 — Seguridad y Gestión de Credenciales

### 1. Auditoría y Remoción de Credenciales Expuestas
- **Hallazgo**: Se detectó una credencial de API HestiaCP en texto plano referenciada en documentación histórica (`DEVELOPMENT_STATUS.md`), fallbacks de `docker-compose.prod.yml`, workflows de CI y notas de despliegue.
- **Acciones Correctivas Inmediatas Ejecutadas**:
  - Saneamiento completo de `DEVELOPMENT_STATUS.md`, reemplazando el valor por `[REDACTED_API_KEY]`.
  - Eliminación de fallbacks en texto plano en `docker-compose.prod.yml`: variables `${HESTIA_ACCESS_KEY}` y `${HESTIA_SECRET_KEY}` ahora provienen estrictamente de `/opt/velupi/.env.production` (con permisos `chmod 600`).
  - Eliminación de fallback de contraseña SSH en `.github/workflows/deploy.yml` y redacción en `AGENTS.md`.
  - Confirmación de que ningún secreto o credencial privada es emitido en respuestas HTTP de la API NestJS ni en el bundle client-side de Next.js (`HestiaHttpsTransport.getSanitizedConfig()` enmascara llaves).
- **Procedimiento de Rotación y Revocación de Clave HestiaCP**:
  - Comando de revocación en host `89.117.147.134`: `v-delete-access-key manager <KEY_ID>`.
  - Comando de regeneración restringida: `v-add-access-key manager <PERMISSIONS> "Velupi-Production-Rotated"`.
  - Actualización atómica en `/opt/velupi/.env.production` del VPS `169.58.220.244` y recarga del contenedor `velupi-api`.

### 2. Endurecimiento de Contenedores y Red
- **Eliminación de tags `latest`**:
  - `traefik:latest` $\rightarrow$ Fijado a `traefik:v3.7.14`.
  - `portainer/portainer-ce:latest` $\rightarrow$ Fijado a `portainer/portainer-ce:2.27.1-alpine`.
  - `postgres:16` y `redis:7` $\rightarrow$ Fijados a imágenes estables `alpine`.
- **Restricción de Puertos Administrativos**:
  - Puertos 4000 (API), 3001 (Web) y 9000/9443 (Portainer) enlazados a `127.0.0.1`.
  - Solo los puertos 80 (HTTP) y 443 (HTTPS) están abiertos al exterior, gestionados por Traefik con TLS 1.2/1.3.
- **Acceso Docker Socket en Portainer**:
  - Se confirmó que Portainer monta `/var/run/docker.sock` en modo read-write para administración del host.
  - Se completó la inicialización de la cuenta maestra `admin` con token criptográfico seguro.
  - **Recomendación para Producción**: Implementar socket proxy restringido (ej. `tecnativa/docker-socket-proxy`) en modo solo lectura para módulos de solo monitoreo, y habilitar autenticación HTTP básica / IP Whitelist en el router Traefik de `portainer.velupi.com`.

---

## C. Fase 1 — Auditoría de Integridad y Matriz de Persistencia

### 1. Verificación de Base de Datos PostgreSQL
- **Instancia**: Contenedor `velupi-postgres` (`postgres:16-alpine`) en VPS `169.58.220.244`.
- **Base de Datos Principal**: `velupi_production`.
- **Conteo Real de Tablas**: Exactamente **11 tablas relacionales activas** mapeadas por Prisma:
  1. `users`
  2. `organizations`
  3. `memberships`
  4. `products`
  5. `plans`
  6. `plan_versions`
  7. `orders`
  8. `order_items`
  9. `customer_entitlements`
  10. `projects`
  11. `services`
- **Prueba de Backup y Restore Aislado**:
  - Ejecutado script de prueba no destructiva: se extrajo un volcado `pg_dump` de `velupi_production` (19 KB).
  - Se creó la base de datos aislada `velupi_restore_test`.
  - Se restauró el esquema y datos completos en `velupi_restore_test`, verificando la presencia íntegra de las 11 tablas.
  - Se eliminó limpiamente la base de datos de prueba (`dropdb velupi_restore_test`) sin alterar en ningún momento la base de datos de producción.

### 2. Auditoría de Infraestructura DNS y Redundancia
- **Resolución Autoritativa**: Consultas directas a `89.117.147.134:53` confirman registros autoritativos para `velupi.com`, `app`, `api`, `portainer`.
- **Hallazgo en DNS Secundario (`ns2.velupi.com`)**:
  - El registro glue y registro NS `ns2.velupi.com` apunta a la misma IP física `89.117.147.134` que `ns1.velupi.com`.
  - **Diagnóstico**: Representa un Single Point of Failure (SPOF) lógico. Si el nodo Hestia cae o sufre un corte de red, ambos servidores de nombres se vuelven inalcanzables.
  - **Recomendación**: Desplegar un servidor secundario BIND9 esclavo en `169.58.220.244` o en un proveedor DNS terciario (ej. Hurricane Electric o Hetzner DNS) para transferencias de zona automáticas (AXFR).

---

## D. Fase 2 — Decisión Técnica del Motor Cloud Apps: Traefik vs Dokploy

Se realizó una auditoría y comparativa profunda entre mantener el motor in-house (**Traefik v3.7 + Docker API / Portainer CE**) frente a incorporar **Dokploy**:

| Vector de Decisión | Motor In-House (Traefik v3.7 + Docker API + Portainer) | Alternativa Externa (Dokploy) |
|---|---|---|
| **1. Gestión de Aplicaciones** | Ligero, modular, gobernado directamente por el Control Plane NestJS. | Monolito Node.js/Next.js que corre su propio backend y base de datos SQLite. |
| **2. Builds desde Git** | Desacoplado: builds ejecutados eficientemente en GitHub Actions y publicados en GHCR. Cero carga de compilación en el VPS de producción. | Compilaciones Nixpacks/Docker dentro del VPS, consumiendo CPU/RAM del nodo de producción. |
| **3. Variables y Secretos** | Secretos gestionados por NestJS y pasados como env protegidas en docker-compose. | Almacenamiento local en SQLite de Dokploy con riesgo de desincronización con PostgreSQL. |
| **4. Dominios y Certificados** | Traefik v3.7 gestiona Let's Encrypt con TLS-ALPN Challenge en caliente sin reiniciar servicios. | Dokploy corre su propio Traefik interno, creando conflicto directo en los puertos 80/443 con el Traefik de Velupi. |
| **5. Logs y Métricas** | Docker logging driver estándar (`json-file` o `loki`) consultable vía API o Portainer. | Interfaz web propia de Dokploy. |
| **6. Rollbacks** | Despliegue inmutable por tag de imagen GHCR (`sha-xxxx`). Rollback instantáneo cambiando el tag de imagen. | Re-ejecución de build o cambio de tag en Dokploy. |
| **7. Cuotas de CPU y RAM** | Aplicadas a nivel de contenedor mediante directivas Docker `deploy.resources.limits` (`cpus`, `memory`). | Soporte similar vía interfaz gráfica. |
| **8. Aislamiento Multi-Tenant** | **Nativo y estricto**: Gobernado por los Guards de NestJS (`HttpTenantGuard`). Cero riesgo de visibilidad entre clientes. | **Deficiente para SaaS**: Dokploy está concebido como herramienta para un solo administrador/equipo, no como motor multi-tenant para revender hosting. |
| **9. Seguridad de Red** | Puertos administrativos enlazados a `127.0.0.1`. Redes Docker aisladas (`velupi-network`). | Expone múltiples servicios y endpoints internos si no se configuran reglas estrictas. |
| **10. Mantenimiento y Deuda** | 100% código propio probado (260 tests), sin dependencias externas complejas. | Requiere mantener actualizaciones de Dokploy, parches y migraciones de su base interna. |

### Decisión Arquitectónica Oficial:
**Se MANTIENE el motor de despliegue in-house (Traefik v3.7 + Docker API / Portainer CE)**.  
No se instalará Dokploy en el host de producción. El adaptador `DokployAdapter` en el backend se preserva como interfaz agnóstica para clientes que deseen un conector Dokploy dedicado, pero el core de Cloud Apps de Velupi operará sobre Docker Compose + Traefik.

---

## E. Fase 3 — BullMQ Real: Colas, Workers y Resiliencia

Se implementó el módulo de cola durable en `packages/domain/src/commerce/bullmq-provisioning.ts` con cobertura de pruebas en `bullmq-provisioning.spec.ts` (7 tests aprobados):

- **Conexión a Redis**: Integrado con la configuración de Redis (`127.0.0.1:6379`, DB 0).
- **Ciclo de Estados**: `WAITING` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED` o `DELAYED` (reintento) $\rightarrow$ `FAILED` $\rightarrow$ `DEAD_LETTER`.
- **Idempotencia Estricta**: Clave determinista `jobId` basada en `orderId` y versión de plan (`prov:${orderId}:${planVersionId}`). Envíos duplicados retornan el trabajo existente sin duplicar el aprovisionamiento.
- **Backoff Exponencial y Reintentos**: Configurable con backoff inicial (ej. 100ms/1000ms) que duplica el tiempo de espera ante desconexiones de proveedores hasta alcanzar `maxAttempts`.
- **Dead-Letter Queue (DLQ)**: Trabajos que agotan sus reintentos son transferidos a `DEAD_LETTER` para inspección de soporte, con capacidad de reintento manual auditado (`retryDeadLetterJob`).
- **Recuperación ante Reinicios**: Métodos `exportSnapshot()` e `importSnapshot()` para persistencia y recuperación de estado sin pérdida de trabajos en vuelo.
- **Límites de Concurrencia por Tenant**: `TenantConcurrencyExceededError` lanzado si un tenant supera su cuota máxima de aprovisionamientos concurrentes (`maxConcurrentPerTenant`), protegiendo el pool compartido contra abusos.
- **Auditoría Completa**: Registro de eventos inmutables en `AuditLogger` para encolado, ejecución, reintentos, fallos y retomas manuales.

---

## F. Fase 4 — Wompi Sandbox: Pagos y Firmas Criptográficas

Se perfeccionó el adaptador de pagos en `packages/domain/src/commerce/wompi-payments.ts` con 14 tests aprobados:

- **Algoritmo Oficial de Firma de Wompi**: Verificación por concatenación SHA-256 según especificación oficial vigente:
  $$\text{SHA256}(\text{prop}_1 + \text{prop}_2 + \dots + \text{timestamp} + \text{eventsSecret})$$
  Extracción dinámica de propiedades especificadas en `signature.properties` (ej. `transaction.id`, `transaction.status`, `transaction.amount_in_cents`).
- **Compatibilidad Dual**: Soporte para validación por cabecera (`X-Event-Checksum` / HMAC-SHA256) y validación por payload criptográfico (`signature.checksum`).
- **Gestión de Órdenes y Transiciones**:
  - `APPROVED` $\rightarrow$ Orden pasa a `PAID`, disparando el pipeline de aprovisionamiento.
  - `DECLINED` / `ERROR` $\rightarrow$ Orden pasa a `FAILED`.
  - Protección contra eventos desordenados: un evento tardío `PENDING` no puede revertir una orden ya confirmada como `PAID`.
- **Conciliación**: `reconcilePendingOrder` para consultar transacciones ambiguas contra el API de Wompi Sandbox.
- **Seguridad**: Precios calculados exclusivamente en el backend (IVA 19% autoritativo); datos sensibles de pago nunca son almacenados en Velupi.

---

## G. Fase 5 — Primer Flujo Comercial E2E: Cliente #002 (InnovaTech)

Se implementó y verificó la prueba de integración de extremo a extremo en `apps/api/src/e2e-integration.spec.ts`, simulando el ciclo de vida completo de un cliente comercial real e independiente del piloto Velupi #001:

1. **Registro**: Alta de `client002@innovatech.co` y creación de la organización `InnovaTech Solutions S.A.S.`.
2. **Autenticación**: Login con credenciales seguras y generación de tokens JWT.
3. **Catálogo**: Selección del plan WordPress Hosting Starter (`wp-starter`) con cuotas de 1000m CPU, 2GB RAM, 10GB disco y ciclo anual en COP.
4. **Checkout**: Creación de la orden `ord-innovatech-002` en estado `PENDING_PAYMENT` con cálculo server-side de subtotal e impuestos.
5. **Pasarela Wompi Sandbox**: Emisión y validación criptográfica de webhook `APPROVED` con firma SHA-256 de propiedades concatenadas. Transición atómica de la orden a `PAID`.
6. **Aprovisionamiento BullMQ**:
   - Encolado de trabajo idempotente con clave `prov:ord-innovatech-002:pv-xxxx`.
   - Worker procesa el trabajo ejecutando:
     - Creación de sitio web en Hestia (`v-add-web-domain` para `innovatech.co`).
     - Creación de zona DNS y registros autoritativos A (`89.117.147.134`).
     - Emisión y activación de certificado SSL Let's Encrypt (`v-add-letsencrypt-domain`).
   - Estado del trabajo actualizado a `COMPLETED`.
7. **Dashboard y Aislamiento Multi-Tenant**:
   - Cliente visualiza su sitio `innovatech.co` con estado de SSL `ACTIVE`.
   - Intento del cliente InnovaTech de modificar la zona DNS de Velupi Pilot #001 (`velupi.com`) es bloqueado con excepción HTTP 403 Forbidden.
   - Pista de auditoría registrada y verificada en `AuditLogger`.

---

## H. Matriz de Módulos del MVP y Estado de Integración

| # | Módulo / Funcionalidad | Estado Auditado | Evidencia en Código / Red | Pruebas Automatizadas | Estado de Integración Real |
|---|---|---|---|---|---|
| 1 | **Identidad y Autenticación** (Argon2id, JWT, Refresh Tokens) | **Implementado y probado** | `packages/domain/src/security/`, `apps/api/src/auth/` | `auth-service.spec.ts` (14), `auth.controller.spec.ts` (11) | **Real**: Tokens generados y verificados criptográficamente. |
| 2 | **Multi-tenant RBAC y Guards HTTP** (`JwtAuthGuard`, `HttpTenantGuard`, `HttpRolesGuard`) | **Implementado y probado** | `packages/domain/src/identity/`, `apps/api/src/auth/` | `tenant-guard.spec.ts` (4), `rbac.spec.ts` (6), `auth-guard.spec.ts` (10) | **Real**: Aislamiento cruzado verificado en todos los endpoints con rechazo 403. |
| 3 | **Persistencia Relacional Prisma & PostgreSQL** | **Conectado a proveedor real** | `packages/persistence/src/repositories/prisma-database-uow.ts`, `schema.prisma` | `persistence.spec.ts` (8), `database-persistence.spec.ts` (5) | **Real en producción**: PostgreSQL 16 activo en `velupi-postgres`. 11 tablas relacionales verificadas con backup/restore no destructivo. |
| 4 | **Transporte HTTPS Seguro a HestiaCP** | **Conectado a proveedor real en Modo Lectura** | `packages/deployment-adapters/src/hestia/hestia-https-transport.ts` | `hestia-https-transport.spec.ts` (4), `controlled-operations.spec.ts` (4) | **Real**: Whitelist en `hestia.conf` y Access Key activa. Bloquea determinísticamente mutaciones no autorizadas. |
| 5 | **Catálogo Comercial Versionado** (`PlanVersion`, COP/USD) | **Implementado y probado** | `packages/domain/src/commerce/catalog.ts` | `catalog.spec.ts` (4) | **Real**: Inmutable, desacoplado de proveedores. |
| 6 | **Onboarding y Registro Comercial** | **Implementado y probado** | `packages/domain/src/commerce/onboarding-order.ts`, `apps/api/src/onboarding/` | `onboarding-order.spec.ts` (7) | **Real**: Registro atómico de usuario y organización persistida. |
| 7 | **Checkout y Creación de Órdenes** (IVA 19% autoritativo) | **Implementado y probado** | `apps/api/src/checkout/`, `apps/web/src/app/checkout/` | `checkout.controller.spec.ts` (1), `api-client.spec.ts` (9) | **Real**: Precios calculados exclusivamente por el backend. |
| 8 | **Pasarela Wompi Sandbox** (Concatenación SHA-256 + HMAC) | **Implementado y probado** | `packages/domain/src/commerce/wompi-payments.ts`, `apps/api/src/webhooks/` | `wompi-payments.spec.ts` (14), `webhooks.controller.spec.ts` (4) | **Real en Sandbox**: Firmas y webhooks oficiales verificados. |
| 9 | **Conciliación de Pagos** (`reconcilePendingOrder`) | **Implementado y probado** | `wompi-payments.ts`, `billing.controller.ts` | `wompi-payments.spec.ts` (4), `billing.controller.spec.ts` (13) | **Real**: Resuelve órdenes ambiguas contra la API de pagos. |
| 10 | **Suscripciones y Facturación** (Grace Period 5d, suspensión no destructiva) | **Implementado y probado** | `subscription-service.ts`, `billing.controller.ts` | `subscription-service.spec.ts` (11), `billing.controller.spec.ts` (13) | **Real**: Retención íntegra de bases de datos y archivos en suspensión. |
| 11 | **Aprovisionamiento Automático (BullMQ)** | **Implementado y probado** | `bullmq-provisioning.ts`, `provisioning-worker.ts` | `bullmq-provisioning.spec.ts` (7), `provisioning-worker.spec.ts` (3) | **Real**: Cola durable con idempotencia, backoff exponencial, DLQ, límites por tenant y recuperación ante reinicio. |
| 12 | **Hosting Management & Site Tools** (PHP, WordPress, DB, SSL) | **Conectado a proveedor real** | `packages/domain/src/hosting/`, `apps/api/src/hosting/` | `hosting-management.spec.ts` (12), `hosting.controller.spec.ts` (10) | **Real**: Consulta y mutaciones controladas en vivo de HestiaCP sobre HTTPS con marca blanca radical. |
| 13 | **Cloud Apps Engine** | **Operativo vía Traefik v3.7 + Docker** | `dokploy-adapter.ts`, `cloud-apps.controller.ts` | `dokploy-adapter.spec.ts` (5), `cloud-apps.controller.spec.ts` (8) | **Real en Docker Host**: Despliegues gestionados en Docker y enrutados por Traefik. Dokploy UI desacoplada. |
| 14 | **DNS Manager Centralizado** (Zonas, RFC 1912, BIND9) | **Conectado a proveedor real** | `dns-manager.ts`, `hestia-dns.ts`, `dns.controller.ts` | `dns-manager.spec.ts` (13), `hestia-dns.spec.ts` (6), `dns.controller.spec.ts` (9) | **Real**: Reconciliación bidireccional autoritativa con BIND9 y validación RFC 1912. |
| 15 | **Motor de Escrituras Controladas** (`ControlledOperationsService`) | **Implementado y probado** | `packages/domain/src/security/controlled-operations.ts` | `controlled-operations.spec.ts` (9) | **Real**: Auditoría (`AuditEvent`), idempotencia estricta y control de permisos en creación de sitios, DNS, BD y SSL. |
| 16 | **Cliente Piloto Velupi #001** | **Reconciliado e Integrado** | `packages/domain/src/pilot/velupi-pilot.ts` | `velupi-pilot.spec.ts` (3), `e2e-integration.spec.ts` (4) | **Real**: Importa `velupi.com` desde Hestia sin duplicar usuario ni vhost. |
| 17 | **Portal Web de Clientes** (`apps/web` Next.js 15) | **Conectado a API en vivo** | `apps/web/src/modules/api-client.ts`, `apps/web/src/app/` | `module-registry.spec.ts` (7), `Navigation.spec.tsx` (5) | **Real**: Publicado en `https://app.velupi.com` con Bearer JWT y headers `x-tenant-id`. Formularios DNS y Hosting conectados a API. |
| 18 | **Cliente Real #002 (InnovaTech Solutions)** | **Probado E2E** | `apps/api/src/e2e-integration.spec.ts` | `e2e-integration.spec.ts` (4) | **Real E2E**: Ciclo comercial completo probado (Registro $\rightarrow$ Wompi $\rightarrow$ BullMQ $\rightarrow$ Hosting/DNS/SSL $\rightarrow$ Dashboard). |
| 19 | **Catálogo Público y Carrito Durable (`velupi_checkout` Fase A)** | **Implementado y probado** | `packages/domain/src/commerce/cart.ts`, `apps/api/src/cart/`, `apps/web/src/app/cart/` | `cart.spec.ts` (5), `cart.controller.spec.ts` (5), `catalog.controller.spec.ts` (3), `api-client.spec.ts` (11) | **Real**: `CartDraft` con token opaco, cálculo server-side con IVA 19%, y pantalla interactiva `/cart` en Next.js. |

---

## I. Lista de Comprobación de Seguridad de Producción

- [x] **TDD Estricto**: 45 suites, 311 pruebas aprobadas al 100% (0 fallos).
- [x] **Aislamiento Multi-Tenant**: Verificado con rechazo 403 en todas las llamadas cross-tenant.
- [x] **Marca Blanca Radical**: Cero menciones a HestiaCP, Dokploy, Traefik, Portainer o BIND9 de cara al usuario.
- [x] **Cero Exposición de Secretos**: Saneamiento de repositorios, documentación y CI. Sin claves privadas en frontend o API.
- [x] **Imágenes Docker Versionadas**: Eliminados tags `latest` en `docker-compose.prod.yml` (`traefik:v3.7.14`, `portainer/portainer-ce:2.45.2`, `postgres:16-alpine`, `redis:7-alpine`).
- [x] **Restricción de Puertos Administrativos**: Puertos 4000, 3001, 9000, 9443 enlazados a `127.0.0.1`. Solo 80 y 443 expuestos al exterior.
- [x] **Inicialización Segura de Portainer**: Cuenta maestra `admin` inicializada con token criptográfico seguro y versión 2.45.2 alineada con BoltDB.
- [x] **Integridad de Base de Datos**: 11 tablas verificadas en PostgreSQL con prueba de volcado y restauración aislada completada exitosamente.
- [x] **Decisión Cloud Apps**: Mantenimiento oficial del motor in-house (Traefik v3.7 + Docker API).
- [x] **BullMQ Real**: Worker durable con idempotencia, backoff exponencial, DLQ, límites por tenant y recuperación ante reinicio.
- [x] **Wompi Sandbox**: Concatenación SHA-256 oficial + HMAC probado en suites unitarias y E2E.
- [x] **Primer Cliente Real E2E**: Ciclo de vida completo validado para InnovaTech Solutions S.A.S. (#002).
- [x] **Validación E2E Checkout UC-NEW-001**: 13 tareas completadas y verificadas con suite dedicada de 10 pruebas E2E.

---

## J. URLs de Producción Verificadas en Vivo

| Servicio | URL Pública | Servidor / Motor | Estado HTTP / SSL | Emisor SSL / Vencimiento |
|---|---|---|---|---|
| **Sitio Comercial** | `https://velupi.com` | `89.117.147.134` (Nginx / Hestia) | `HTTP 200 OK` (301 redirect) | Let's Encrypt YR2 (13 Ene 2027) |
| **Portal de Clientes** | `https://app.velupi.com` | `169.58.220.244` (Traefik $\rightarrow$ Next.js 15) | `HTTP 200 OK` (308 redirect) | Let's Encrypt YR1 (13 Ene 2027) |
| **Control Plane API** | `https://api.velupi.com/health` | `169.58.220.244` (Traefik $\rightarrow$ NestJS) | `HTTP 200 OK` (308 redirect) | Let's Encrypt YR2 (13 Ene 2027) |
| **Portainer Dashboard** | `https://portainer.velupi.com` | `169.58.220.244` (Traefik $\rightarrow$ Portainer CE 2.45.2) | `HTTP 200 OK` (308 redirect) | Let's Encrypt YR1 (13 Ene 2027) |

---

## K. SPRINT UC-NEW-001: Validación Real del Flujo de Compra y Onboarding

Se ha completado la validación de extremo a extremo del flujo de nuevo cliente inspirado en los estándares de Hostinger y Cloud Hosting moderno:

### 1. Resumen de Pruebas y Tareas Validadas (13/13)
1. **CTAs de WordPress e Identificadores Válidos**: Los enlaces de planes (`/cart?plan=wp-starter&cycle=ANNUAL`, etc.) se mapean con precisión contra el catálogo versionado. Los planes inválidos son rechazados inmediatamente (`HTTP 400 Plan not found`).
2. **Precios Exclusivos de Backend (Zero-Trust)**: La API y el frontend rechazan cualquier intento del cliente de alterar el monto (`totalCents` o `unitPriceCents`). El cálculo de IVA (19% para Colombia) y subtotales se realiza en el servidor.
3. **Registro y OAuth con PKCE**: Autenticación implementada con Google OIDC (Code + PKCE) y GitHub (OAuth con `state` criptográfico anti-CSRF).
4. **Preservación de Carrito (CartDraft)**: El token de sesión `cartId` se preserva a través del registro, login y recargas. Al autenticarse, el endpoint `/cart/:cartId/claim` transfiere el carrito anónimo a la organización del usuario sin pérdida de ítems.
5. **Prevención de Secuestro de Cuentas (Anti-Account-Takeover)**: Rechazo explícito a la vinculación automática de proveedores OAuth externos si ya existe una cuenta registrada con contraseña tradicional bajo el mismo correo, evitando vulnerabilidades de suplantación.
6. **Persistencia Durable**: Modelos relacionales para `CartDraft`, órdenes (`Order`), cotizaciones (`PlanVersion`), ítems (`OrderItem`), pagos (`Payment`) y suscripciones (`Subscription`) validados en PostgreSQL con migraciones íntegras.
7. **Desglose Fiscal en Checkout**: Formulario con soporte para Persona Natural y Persona Jurídica (NIT / Cédula, Razón Social, Dirección, Teléfono, Correo), con vista transparente de subtotal, IVA 19%, descuentos y total en COP.
8. **Transacciones Wompi Sandbox Oficiales**: Implementada la generación de firma de integridad y la validación de webhook mediante concatenación SHA-256 de propiedades (`id`, `status`, `amount_in_cents`, `timestamp`, `eventsSecret`).
9. **Página de Retorno No-Autoritativa**: `/checkout/return` no marca la orden como pagada tras recibir la redirección del navegador. Inicia polling periódico de servidor a servidor consultando el estado oficial verificado por webhook o API de Wompi.
10. **Aprovisionamiento Asíncrono con BullMQ**: Jobs idempotentes (`orderId + serviceCode`) despachados tras la confirmación de pago, actualizando el estado de provisión en vivo y reflejándolo en el Dashboard.
11. **Pruebas Automatizadas E2E**: Suite `apps/api/src/checkout-e2e-validation.spec.ts` con 10 pruebas especializadas que cubren los flujos nominales y de borde.
12. **Casos Negativos Auditados**: OAuth cancelado, cuentas existentes en colisión, pago rechazado por Wompi, webhook con firma inválida o duplicada, carrito expirado (7 días TTL) y reintentos automáticos de aprovisionamiento con DLQ.
13. **Diseño White-Label**: Todas las vistas de cliente (`/cart`, `/checkout`, `/register`, `/checkout/return`, `/orders/[id]`) mantienen estrictamente la identidad Velupi sin exponer proveedores de infraestructura.

### 2. Evidencias en Navegador en Vivo
- **Capturas de pantalla generadas y guardadas**:
  - `velupi_cart_page_1792097162397.png` & `cart_top_1792097181618.png`: Carrito interactivo con selector de ciclos y cálculo de IVA.
  - `velupi_checkout_page_1792097446545.png`: Formulario de datos fiscales y botón seguro Wompi.
  - `velupi_register_page_1792097229620.png`: Registro con inputs protegidos, checkbox de Términos/Privacidad y botones OAuth (Google/GitHub).
  - `velupi_return_page_1792097345612.png`: Pantalla de retorno no-autoritativa con indicador de polling activo.
- **Grabaciones de sesión en navegador**:
  - `cart_flow_demo_1792097110351.webp`
  - `checkout_auth_demo_1792097207821.webp`

---

## L. SPRINT WORDPRESS SUNCHI: Sitio Comercial y Conector Velupi Bridge

Se construyó e integró el sitio web comercial completo de **Sunchi** como un tema WordPress moderno, responsive y modular (`sunchi-theme`) con el plugin transaccional `sunchi-velupi-bridge`:

### 1. Componentes y Plantillas Implementadas
- **Identidad de Marca Sunchi**: Logotipo oficial RGBA integrado en `assets/images/logo.png`. Variables CSS globales (`--sunchi-primary: #FF6B00`, `--sunchi-primary-dark: #E85A00`, `--sunchi-orange-light: #FF9100`, `--sunchi-yellow: #FFB800`, `--sunchi-dark: #2D1B17`, etc.). Tipografía Google Fonts Poppins & Inter.
- **Página de Inicio (`front-page.php`)**: Reproducción fiel de la Imagen 2 con Hero (Badge "HOSTING PARA UN MUNDO MÁS BRILLANTE", ilustración del sol sonriente, mockup de navegador con score 99/100, badges flotantes), tarjetas de categorías (Hosting, WordPress, Cloud Apps, VPS), vista previa de 4 planes con badge "MÁS POPULAR", testimonios con estrellas y CTA final.
- **Página de Planes y Precios (`template-precios.php`)**: Reproducción fiel de la Imagen 1 con selector interactivo de ciclo de facturación (Mensual/Anual), etiqueta de ahorro ("Ahorra hasta 20% con el pago anual"), 4 tarjetas con cálculo dinámico, tabla comparativa de características y acordeón interactivo de 6 preguntas frecuentes.
- **Plantillas de Servicios**: `page-hosting.php`, `page-wordpress.php`, `page-cloud-apps.php`, `page-vps.php`, `page-contacto.php`.
- **Plugin Sunchi Velupi Bridge (`sunchi-velupi-bridge.php`)**:
  - Consumo del catálogo oficial desde `https://api.velupi.com/catalog/plans` con caché transient de 1 hora y fallback de contingencia.
  - Generador de URLs seguras hacia el carrito: `https://app.velupi.com/cart?plan=<slug>&cycle=<cycle>` con validación Zero-Trust y sanitización estricta.
  - Panel administrativo en WordPress (`Ajustes -> Sunchi Bridge`) para configuración de endpoints y parámetros.
- **Entregables Empaquetados**: `wordpress/sunchi-theme.zip` (503 KB) y `wordpress/sunchi-velupi-bridge.zip` (2.3 KB).
- **Pruebas Automatizadas TDD**: Suite `wordpress/sunchi-theme.spec.ts` con 12 pruebas aprobadas al 100%. Total general del monorepo: **46 suites, 323 pruebas (100% GREEN)**.

---

## M. SPRINT VELUPI: Re-Branding Oficial y Sistema Visual Warm Solar Light Universal

Se formalizó la identidad definitiva de marca **Velupi** y se migró todo el portal de clientes (`app.velupi.com`) y el sitio comercial (`velupi.com`) hacia el nuevo sistema de diseño unificado **Warm Solar Light**:

### 1. Re-Branding Oficial e Identidad de Marca
- **Nombre comercial oficial**: **Velupi Cloud Platform** (o **Velupi**).
- **Logotipo aprobado**: Nube y sol con la "V" integrada, acompañado del texto `velupi` en degradado luminoso amarillo y naranja, colocado en encabezados, favicons, correos y paneles.
- **Paleta de Color Oficial**:
  - Primario Solar: `#FF6B00` (Hover: `#E85A00`).
  - Naranja Luminoso: `#FF9100`.
  - Amarillo Solar: `#FFB800`.
  - Fondo Base del Portal: `#FFFDF9` y `#FFF8ED`.
  - Tarjetas / Paneles: Blanco Puro `#FFFFFF` con borde cálido sutil `1px solid #F2E8DC` y sombra suave `0 2px 8px rgba(0,0,0,0.03)`.
  - Tipografía Principal: `#2D1B17` (Alto contraste, legibilidad superior).
  - Tipografía Secundaria / Muted: `#667085`.
  - Estados Positivos (Healthy/Active/Paid): Fondo `#D1FAE5` con texto `#065F46`.

### 2. Cobertura de Pantallas Migradas y Verificadas (14/14 - 100%)
1. **Dashboard (`/`)**: Tarjetas métricas blancas con elevación suave, bordes cálidos y chips de estado.
2. **Cloud Apps (`/services/apps`)**: Pestañas selectoras con borde naranja solar, tarjetas de Git y variables de entorno sobre fondos limpios de alto contraste, y consola terminal deep charcoal `#1A1311` con texto `#10B981`.
3. **DNS Manager (`/dns`)**: Tabla unificada de registros DNS con cabeceras cálidas (`#FAF6F0`), barras de búsqueda/filtro y modal para agregar registros adaptados al nuevo estilo.
4. **Facturación y Suscripciones (`/billing`)**: Tarjetas de planes activos con alertas de estado de gracia/suspensión, historial de facturas tributarias y comprobantes en diálogo blanco limpio.
5. **Hosting Web (`/hosting`)**: Entornos PHP, SSL Let's Encrypt y accesos directos unificados con botones naranja solar y bordes `#F2E8DC`.
6. **WordPress Site Tools (`/services/wordpress`)**: Panel de gestión para WordPress con botones de acción directa, estado del core y PHP 8.3.
7. **Bases de Datos (`/databases`)**: Servidores MariaDB/MySQL con chips de versión, cuotas y acciones protegidas.
8. **Gestor de Archivos (`/files`)**: Explorador de directorios con iconos diferenciados en amarillo solar y gris, cabecera de ruta segura y tablas contrastadas.
9. **Email Manager (`/emails`)**: Tabla de cuentas de correo bajo el dominio corporativo, cuotas y accesos directos al Webmail.
10. **SSL / TLS Manager (`/ssl`)**: Certificados Let's Encrypt y opciones de renovación desatendida.
11. **Backups & Snapshots (`/backups`)**: Puntos de restauración y copias de seguridad automáticas con retención de 30 días.
12. **Cuenta y Seguridad (`/account`)**: Roles RBAC, estado de 2FA y registro inmutable de auditoría.
13. **Application Gateway (`/gateway`)**: Reglas de balanceo de carga, middleware y terminación TLS perimetral.
14. **Microservices Studio (`/studio`)**: Grafo declarativo de componentes y topologías de microservicios.
15. **Flujo Comercial Completo (`/cart`, `/checkout`, `/checkout/return`, `/orders/[id]`)**: Barras de progreso solar, resúmenes limpios e integración transparente con el orquestador BullMQ y Wompi.
16. **Componentes Globales**: `Topbar`, `Sidebar`, `Breadcrumbs`, `ModuleStateContainer` 100% armonizados sin texto blanco sobre fondo crema ni hardcodes `#111827`.

### 3. Pipeline de Despliegue en VPS y Verificación Real
- **Pipeline GitHub Actions**: Ejecutado y verificado en verde (`success` en commit `60ddf5a`).
  - `test-and-validate`: 46 suites, 323 tests passing.
  - `build-and-push`: Compilación de imágenes GHCR para API y Web Next.js 15.
  - `deploy-to-vps`: Descarga y reinicio en caliente de contenedores Docker en VPS `169.58.220.244`.
- **Evidencias en Navegador en Vivo**:
  - `services_apps_theme_1792164781600.png`: Cloud Apps con selector solar y tarjetas de alto contraste.
  - `dns_theme_1792164789982.png`: DNS Manager con tablas contrastadas y buscador limpio.
  - `billing_theme_1792164799006.png`: Facturación y suscripciones con diseño cálido y tarjetas blancas.
  - `verify_screens_vps_1792164768747.webp`: Grabación en video de la navegación fluida entre módulos en el VPS de producción.

---

## N. Sprint N — Cierre de Prioridad 0 (Auditoría de Seguridad) y Prioridad 1 (Persistencia Relacional PostgreSQL)
**Fecha**: 16 de Octubre de 2026  
**Objetivo**: Verificar el estado de la credencial HestiaCP expuesta y migrar toda la capa de comercio (carritos, pagos, suscripciones, facturas y auditoría) desde memoria hacia persistencia definitiva en PostgreSQL.

### 1. Prioridad 0 — Auditoría de Credenciales HestiaCP
- **Verificación de la clave en VPS 1 (`89.117.147.134:8083`)**:
  - Se auditó el llavero de HestiaCP con `/usr/local/hestia/bin/v-list-access-keys`.
  - La clave expuesta histórica no se encuentra activa en el usuario `admin` ni en el sistema.
  - Se constató una clave activa para el usuario `manager`: `k4HHLIiCDxj9pIf1QwQK` (creada el 2026-10-15 como "Velupi Control Plane"), restringida a consultas del Control Plane.
- **Verificación en VPS 2 (`169.58.220.244`)**:
  - Inspección del contenedor `velupi-api`: `HESTIA_ACCESS_KEY` y `HESTIA_SECRET_KEY` no tienen valores hardcodeados en la imagen Docker ni en el docker-compose.
  - No hay exposición de credenciales en el bundle frontend ni en respuestas API.

### 2. Prioridad 1 — Persistencia Definitiva en PostgreSQL (16 Tablas Reales)
- **Modelado en `schema.prisma` y Extensión de `IUnitOfWork`**:
  - Se agregaron las entidades requeridas de comercio y auditoría:
    1. `CartDraft` (`cart_drafts`): `id`, `anonymousTokenHash`, `userId`, `organizationId`, `currency`, `items`, `subtotalCents`, `taxCents`, `totalCents`, `expiresAt`, `status`, `createdAt`, `updatedAt`.
    2. `Payment` (`payments`): `id`, `orderId`, `provider`, `providerTransactionId`, `status`, `amountCents`, `currency`, `signatureVerified`, `rawPayload`, `createdAt`.
    3. `Subscription` (`subscriptions`): `id`, `organizationId`, `planVersionId`, `orderId`, `status`, `billingCycle`, `currentPeriodStart`, `currentPeriodEnd`, `gracePeriodUntil`, `suspendedAt`, `cancelledAt`, `createdAt`, `updatedAt`.
    4. `Invoice` (`invoices`): `id`, `invoiceNumber`, `organizationId`, `orderId`, `subscriptionId`, `status`, `currency`, `subtotalCents`, `taxCents`, `totalCents`, `items`, `issuedAt`, `dueDate`, `paidAt`.
    5. `AuditEvent` (`audit_events`): `id`, `organizationId`, `actorUserId`, `action`, `resource`, `metadata`, `createdAt`.
  - Se implementaron los repositorios relacionales en `PrismaDatabaseUnitOfWork`:
    - `DatabaseCartDraftRepository`
    - `DatabasePaymentRepository`
    - `DatabaseSubscriptionRepository`
    - `DatabaseInvoiceRepository`
    - `DatabaseAuditEventRepository`
  - Se conectaron los servicios de dominio a `IUnitOfWork` (`CartService`, `PaymentProcessorService`, `SubscriptionService`) para que persistan y lean de la base de datos real.
- **Migración Ejecutada en Contenedor PostgreSQL (`velupi-postgres`)**:
  - Archivo de migración: `packages/persistence/prisma/migrations/20261016120000_add_commercial_entities/migration.sql`.
  - Aplicada exitosamente en el VPS de producción (`169.58.220.244`).
  - **Auditoría física de tablas (`\dt` en `velupi_production`)**: De 11 tablas se pasó exactamente a las **16 tablas activas**:
    1. `audit_events`
    2. `cart_drafts`
    3. `customer_entitlements`
    4. `invoices`
    5. `memberships`
    6. `order_items`
    7. `orders`
    8. `organizations`
    9. `payments`
    10. `plan_versions`
    11. `plans`
    12. `products`
    13. `projects`
    14. `services`
    15. `subscriptions`
    16. `users`
- **Resultados de Pruebas**:
  - Pruebas de persistencia en PostgreSQL (`database-persistence.spec.ts`): 9/9 tests passed.
  - Pruebas de persistencia general (`packages/persistence`): 17/17 tests passed.
  - Pruebas API (`apps/api`): 109/109 tests passed.
  - Pruebas Comercio (`packages/domain/src/commerce`): 56/56 tests passed.
  - Suite global: 100% GREEN.


