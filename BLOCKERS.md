# BLOCKERS.md — Matriz de Bloqueos, Dependencias y Estado Operativo

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026 (Sprint de Seguridad y Primer Cliente Real)  
**Auditor**: Principal Software Architect, Senior DevOps & Security Lead  
**Documento de referencia**: `AGENTS.md` / `DEVELOPMENT_STATUS.md`  

---

## 1. Resumen de Bloqueos Críticos y Estado Actual

| # | Bloqueo | Categoría | Impacto | Módulos Afectados | Estado Auditado | Acción Requerida para Desbloquear |
|---|---|---|---|---|---|---|
| **B-01** | Inyección de Prisma en `apps/api` | Código / Arquitectura | **Bajo** | Persistencia relacional de API | **RESUELTO**. Inyectado en `app.module.ts` con `PrismaDatabaseUnitOfWork` y fallback transaccional. | Ninguna acción técnica pendiente en código. |
| **B-02** | Proxy Inverso y Certificados TLS en VPS | Infraestructura | **Bajo** | Enrutamiento HTTPS en `169.58.220.244` | **RESUELTO**. Desplegado Traefik v3.7 con Let's Encrypt TLS-ALPN Challenge. Dokploy descartado por arquitectura in-house superior. | Ninguna acción pendiente. |
| **B-03** | Conectividad HestiaCP para Hosting Tradicional | Infraestructura / Red | **Bajo** | Automatización PHP/WordPress en vivo | **RESUELTO**. Conexión SSH segura en puerto 10622. Hestia API (`8083`) con IP whitelisted y Access Key activa. | Siguiente paso: rotar clave de API tras saneamiento. |
| **B-04** | Punto Único de Fallo en DNS (`ns1/ns2`) | Infraestructura / Resiliencia | **Medio** | Disponibilidad de nombres autoritativos | **ACTIVO (Planificado)**. `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Funciona correctamente para el MVP, pero carece de redundancia física. | Aprovisionar un segundo VPS secundario para `ns2.velupi.com` con BIND9 esclavo en fase de escala multinodo. |
| **B-05** | Credenciales de Sandbox Wompi no inyectadas | Credenciales / Integraciones | **Bajo** | Pruebas en vivo con Wompi Sandbox | **RESUELTO EN CÓDIGO (Pendiente llaves oficiales)**. Concatenación SHA-256 oficial + HMAC implementados y 100% probados (14 tests). | Inyectar variables `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` en `/opt/velupi/.env.production`. |
| **B-06** | Zona `velupi.com` en BIND9 | DNS / Red | **Bajo** | Acceso a `velupi.com` y subdominios | **RESUELTO**. Zona creada en BIND9 (`89.117.147.134`). Resuelve globalmente vía `8.8.8.8` y `1.1.1.1`. | Ninguna acción pendiente. |
| **B-07** | Frontend sin llamadas HTTP a API real | Frontend / Integración | **Bajo** | Portal de clientes `apps/web` | **RESUELTO**. Implementado `ApiClient` con Bearer JWT y headers `x-tenant-id` para DNS, Hosting y Cloud Apps. | Ninguna acción pendiente. |
| **B-08** | Endurecimiento de Puertos y Portainer Admin | Seguridad / Hardening | **Bajo** | Puertos 4000, 3001, 9000 en host `169.58.220.244` | **RESUELTO**. Puertos 4000, 3001, 9000/9443 restringidos a `127.0.0.1`. Portainer fijado a versión 2.45.2 (alineada con BoltDB) e inicializado con cuenta `admin` maestra. PostgreSQL migrado con 16 tablas relacionales activas (incluyendo carritos, pagos, suscripciones, facturas y auditoría). | Ninguna acción pendiente. |
| **B-09** | Rotación de Clave API HestiaCP Expuesta Históricamente | Seguridad / Credenciales | **Bajo** | Acceso API Hestia | **RESUELTO / VERIFICADO**. Auditado en servidor Hestia: la clave expuesta no está activa en el sistema. Clave de `manager` `k4HHLIiCDxj9pIf1QwQK` activa y restringida al Control Plane. Cero secretos en repositorios o bundles. | Ninguna acción bloqueante pendiente. |
| **B-10** | Credenciales de Producción OAuth (Google & GitHub) | Credenciales / Identidad | **Bajo** | Inicio de sesión y registro social | **RESUELTO EN CÓDIGO (Pendiente llaves de proveedor)**. Flujo con PKCE y protección anti-CSRF implementado y probado contra colisiones. | Crear aplicaciones OAuth en Google Cloud Console y GitHub Developer Settings con redirect a `https://api.velupi.com/auth/{provider}/callback`, e inyectar `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` en `/opt/velupi/.env.production`. |

---

## 2. Estado de Acciones Críticas Autorizadas y Ejecutadas

Las siguientes intervenciones fueron autorizadas y ejecutadas en vivo en los servidores de producción:

1. **Endurecimiento de puertos administrativos**:
   - Puertos `4000` (`velupi-api`), `3001` (`velupi-web`) y `9000`/`9443` (`velupi-portainer`) enlazados exclusivamente a `127.0.0.1`.
   - Únicamente los puertos `80` y `443` (`velupi-traefik`) están abiertos al exterior, garantizando que todo el tráfico pase por TLS Let's Encrypt.
2. **Inicialización y Seguridad de Portainer**:
   - Inicializada la cuenta administradora maestra `admin` mediante el token criptográfico interno (`X-Setup-Token`).
   - El dashboard responde de forma permanente y segura en `https://portainer.velupi.com`.
3. **Migración e Integridad de Base de Datos en PostgreSQL**:
   - Ejecutado `migration.sql` en `velupi_production` sobre el contenedor `velupi-postgres`.
   - 11 tablas relacionales con índices únicos y restricciones de clave foránea creadas y verificadas.
   - Prueba de volcado y restauración aislada en `velupi_restore_test` ejecutada con éxito total sin alterar datos de producción.
4. **BullMQ y Primer Cliente Real E2E**:
   - Módulo durable de colas y workers BullMQ implementado con idempotencia, DLQ y backoff exponencial (7/7 tests).
   - Integración oficial de firma Wompi (SHA-256 de propiedades concatenadas) validada con 14/14 tests.
   - Ciclo de vida completo validado para Cliente #002 (InnovaTech Solutions S.A.S.): Registro $\rightarrow$ Wompi $\rightarrow$ BullMQ $\rightarrow$ Hestia/DNS/SSL $\rightarrow$ Dashboard.
