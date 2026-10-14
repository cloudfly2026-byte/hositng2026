# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha**: 13 de Octubre de 2026  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  

---

## 1. Visión general de las próximas iteraciones

El desarrollo de Velupi Cloud Platform se organiza en **4 Sprints técnicos** secuenciales, diseñados para cerrar la brecha entre la arquitectura de dominio probada en memoria y la operación real en servidores físicos y pasarelas de pago.

```text
[Sprint 1: Persistencia & DNS Centralizado]
                     │
                     ▼
[Sprint 2: Conexión Real de Infraestructura & Workers BullMQ]
                     │
                     ▼
[Sprint 3: Autenticación JWT, MFA & Portal Web Conectado]
                     │
                     ▼
[Sprint 4: Piloto Velupi #001 & End-to-End Sandbox Wompi]
```

---

## 2. Sprint 1: Persistencia Relacional y DNS Manager Centralizado (Semana 1)

**Objetivo**: Dotar a la plataforma de persistencia duradera en PostgreSQL (eliminando los `Map<string, T>` volátiles) e implementar el módulo de gestión centralizada de DNS sobre HestiaCP/BIND9 con `ns1/ns2.velupi.com`.

### Tarea 1.1: Módulo de Dominio DNS Manager (`@cloudfly/domain/dns`) — *TAREA INMEDIATA*
- **Prioridad**: CRÍTICA.
- **Ciclo TDD**:
  - **RED**: Crear `packages/domain/src/dns/dns-manager.spec.ts` validando:
    - Creación de zonas DNS asociadas a `organizationId` y `projectId`.
    - Validación de sintaxis estricta para registros `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `CAA`, `SRV`.
    - Detección de conflicto RFC 1912 (un hostname con CNAME no puede convivir con otros registros).
    - Prevención de registros duplicados idénticos.
    - Validación de TTL mínimo (60s) y máximo (86400s).
    - Inmutabilidad de registros y registro en log de auditoría.
  - **GREEN**: Implementar `packages/domain/src/dns/dns-manager.ts` exportando `DnsManagerService`, `DnsZone`, `DnsRecord`.
  - **REFACTOR**: Typecheck con `pnpm build` (`tsc -b`).

### Tarea 1.2: Adaptador de Comandos DNS para HestiaCP (`@cloudfly/deployment-adapters`)
- **Prioridad**: CRÍTICA.
- **Ciclo TDD**:
  - **RED**: Crear `packages/deployment-adapters/src/hestia/hestia-dns.spec.ts` probando:
    - Generación de comandos `v-add-dns-domain <user> <domain> <ip> <ns1> <ns2>`.
    - Generación de comandos `v-add-dns-record <user> <domain> <record> <type> <val> <pri>`.
    - Generación de comandos `v-delete-dns-record <user> <domain> <record_id>`.
    - Idempotencia: reconciliación si la zona ya existe en BIND9.
  - **GREEN**: Extender `HestiaAdapter` con métodos `createDnsZone()`, `addDnsRecord()`, `deleteDnsRecord()`, `listDnsRecords()`.
  - **REFACTOR**: Asegurar tipado con contratos en `@cloudfly/contracts`.

### Tarea 1.3: Modelo Relacional PostgreSQL con Prisma ORM
- **Prioridad**: CRÍTICA.
- **Ciclo TDD**:
  - **RED**: Especificar pruebas de integración en base de datos de pruebas para `PrismaUserRepository`, `PrismaOrganizationRepository`, `PrismaOrderRepository`, `PrismaDnsZoneRepository`.
  - **GREEN**:
    - Crear `schema.prisma` en `packages/domain` o `packages/database`.
    - Definir tablas: `User`, `Organization`, `Membership`, `Product`, `Plan`, `PlanVersion`, `Order`, `OrderItem`, `Payment`, `CustomerEntitlement`, `DnsZone`, `DnsRecord`, `AuditEvent`.
    - Generar migraciones versionadas (`prisma migrate dev`).
  - **REFACTOR**: Mapear DTOs limpios hacia las entidades de dominio sin acoplar la lógica al ORM.

### Tarea 1.4: Endpoints REST del DNS Manager en NestJS (`apps/api`)
- **Prioridad**: ALTA.
- **Ciclo TDD**:
  - **RED**: Crear `apps/api/src/dns/dns.controller.spec.ts` probando endpoints protegidos:
    - `POST /dns/zones`: Creación de zona con validación de tenancy.
    - `GET /dns/zones`: Listado de zonas del tenant autenticado.
    - `POST /dns/zones/:zoneId/records`: Adición de registro DNS con validación de conflictos.
    - `DELETE /dns/zones/:zoneId/records/:recordId`: Eliminación de registro.
  - **GREEN**: Implementar `DnsController`, `DnsService` y registrarlos en `AppModule`.
  - **REFACTOR**: Aplicar `TenantGuard` para impedir acceso cross-tenant.

---

## 3. Sprint 2: Conexión Real de Infraestructura & Workers Asíncronos (Semana 2)

**Objetivo**: Reemplazar los transportes simulados (mocks) por conexiones SSH2 seguras a HestiaCP (`89.117.147.134`), bootstrap de Dokploy en `169.58.220.244`, y colas BullMQ en Redis.

### Tarea 2.1: Bootstrap y Hardening del VPS `shared-node-01` (`169.58.220.244`)
- **Acción**:
  - Actualizar paquetes del sistema (Ubuntu 22.04 / 24.04 LTS).
  - Configurar firewall UFW (abrir 22 SSH, 80 HTTP, 443 HTTPS, 3000 Dokploy).
  - Instalar Docker Engine oficial y Docker Compose plugin.
  - Instalar Dokploy mediante `curl -sSL https://dokploy.com/setup.sh | sh`.
  - Generar credenciales de acceso inicial y API Key para el Control Plane.

### Tarea 2.2: Conector de Transporte SSH2 para HestiaCP
- **Prioridad**: ALTA.
- **Ciclo TDD**:
  - **RED**: Crear pruebas con mock del socket SSH2 para ejecutar comandos de Hestia de manera segura (con timeouts, captura de stderr, parseo de códigos de salida).
  - **GREEN**: Implementar `SshHestiaTransport` utilizando la librería `ssh2` autenticada por clave privada Ed25519 o RSA 4096.
  - **REFACTOR**: Soporte dual: usar `MockHestiaTransport` en tests locales y `SshHestiaTransport` en staging/producción según variable `HESTIA_TRANSPORT_MODE=ssh|mock`.

### Tarea 2.3: Conector HTTP para Dokploy
- **Prioridad**: ALTA.
- **Ciclo TDD**:
  - **RED**: Pruebas con mock de llamadas Axios/Fetch hacia la API REST de Dokploy (`/api/application.create`, `/api/application.deploy`, `/api/application.stop`).
  - **GREEN**: Implementar `HttpDokployTransport` inyectando el header `x-api-key` o Bearer Token.
  - **REFACTOR**: Centralizar manejo de reintentos con backoff exponencial para despliegues lentos.

### Tarea 2.4: Colas Asíncronas con BullMQ y Redis
- **Prioridad**: ALTA.
- **Ciclo TDD**:
  - **RED**: Crear pruebas del worker `ProvisioningWorker` procesando jobs encolados con clave de idempotencia (`orderId + serviceCode`).
  - **GREEN**: Integrar `@nestjs/bullmq` en `apps/api`, configurando la cola `provisioning-queue` conectada a Redis.
  - **REFACTOR**: Implementar manejo de eventos de fallo (`onFailed`) con logs de auditoría estructurados y alertas.

---

## 4. Sprint 3: Autenticación, Seguridad y Conexión Frontend (Semana 3)

**Objetivo**: Completar el flujo de autenticación seguro en NestJS, conectar el portal Next.js 15 a la API y agregar la pantalla de administración DNS.

### Tarea 3.1: Módulo de Autenticación NestJS (`AuthModule`)
- Registro con validación de correo (envío de token vía Nodemailer/SES).
- Login con Argon2/Bcrypt y emisión de tokens JWT de corta duración (15 min) + Refresh Tokens (7 días).
- Guardias `@UseGuards(JwtAuthGuard, RolesGuard)` en todos los controladores sensibles.

### Tarea 3.2: Pantalla de Administración DNS en Portal Web (`apps/web`)
- Vista interactiva en `/services/dns` con tabla de zonas y registros.
- Formulario de creación de registros con selector de tipo (A, CNAME, MX, TXT) y validación en tiempo real.
- Notificaciones de propagación y estado de los nameservers (`ns1/ns2.velupi.com`).

### Tarea 3.3: Conexión Cliente API en Next.js
- Sustituir los datos de catálogo estáticos en `apps/web` por llamadas dinámicas a `GET /catalog` en `apps/api`.
- Conectar el formulario de `/checkout` a `POST /checkout/order`.
- Renderizar el widget de Wompi o redirección al checkout con la firma de integridad generada por el backend.

---

## 5. Sprint 4: Piloto Velupi #001 y Validación E2E en Sandbox (Semana 4)

**Objetivo**: Validar el flujo completo de negocio y aprovisionamiento con el cliente interno #001 (`velupi.com`) y pruebas en el sandbox de Wompi.

### Tarea 4.1: Ejecución del Piloto Interno Velupi #001
- Disparar orden autorizada a costo $0 para `org-velupi-internal`.
- Verificar tránsito por `ProvisioningOrchestrator` → `HestiaAdapter`.
- Confirmar creación de usuario Hestia, vhost para `velupi.com`, certificado Let's Encrypt y base de datos MariaDB.
- Verificar resolución DNS desde `ns1.velupi.com` y `ns2.velupi.com`.

### Tarea 4.2: Pruebas E2E de Pagos Wompi Sandbox
- Configuración de variables de entorno de Sandbox de Wompi.
- Ejecución de compra simulada con tarjeta de pruebas aprobada y declinada.
- Simulación de webhook firmado y verificación de cambio de estado a `PAID` y activación de cuotas.

---

## 6. Criterios de Aceptación Globales

1. **100% de Pruebas Aprobadas**: Todo nuevo código debe acompañarse de pruebas Vitest que pasen limpiamente antes de cada merge.
2. **Cero Violaciones de Tipos**: Compilación limpia mediante `pnpm build` (`tsc -b`).
3. **Cero Regresiones de Seguridad**: Ninguna ruta protegida puede responder sin validar `tenant_id` y firma JWT.
4. **Idempotencia Estricta**: Ningún reintento de webhook o job de provisión debe duplicar registros o vhosts en Hestia/Dokploy.
