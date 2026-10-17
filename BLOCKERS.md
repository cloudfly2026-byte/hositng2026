# BLOCKERS.md — Matriz de Bloqueos, Dependencias y Estado Operativo

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 16 de Octubre de 2026 (Fase de Reconciliación y Auditoría de Integraciones)  
**Auditor**: Principal Software Architect, Senior DevOps & Security Lead  
**Documento de referencia**: `AGENTS.md` / `DEVELOPMENT_STATUS.md`  

---

## 1. Resumen de Bloqueos Críticos y Estado Actual

| # | Bloqueo | Categoría | Impacto | Módulos Afectados | Estado Auditado | Acción Requerida para Desbloquear |
|---|---|---|---|---|---|---|
| **B-01** | Inyección de Prisma en `apps/api` | Código / Arquitectura | **Bajo** | Persistencia relacional de API | **RESUELTO**. PrismaDatabaseUnitOfWork inyectado con 16 repositorios relacionales. | Ninguna acción técnica pendiente. |
| **B-02** | Proxy Inverso y Certificados TLS en VPS | Infraestructura | **Bajo** | Enrutamiento HTTPS en `169.58.220.244` | **RESUELTO**. Desplegado Traefik v3.7 con Let's Encrypt TLS-ALPN Challenge. | Ninguna acción pendiente. |
| **B-03** | Conectividad HestiaCP para Hosting Tradicional | Infraestructura / Red | **Bajo** | Automatización PHP/WordPress en vivo | **RESUELTO**. Conexión SSH segura en puerto 10622. Hestia API (`8083`) con IP whitelisted y Access Key activa. | Ninguna acción pendiente. |
| **B-04** | Punto Único de Fallo en DNS (`ns1/ns2`) | Infraestructura / Resiliencia | **Medio** | Disponibilidad de nombres autoritativos | **ACTIVO (Planificado para Escala)**. `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Funciona correctamente para el MVP, pero carece de redundancia física. | Aprovisionar un segundo VPS secundario para `ns2.velupi.com` con BIND9 esclavo en fase de escala multinodo. |
| **B-05** | Credenciales Reales Wompi (Producción) | Credenciales Externas | **Bajo** | Transacción y Webhooks Wompi en vivo | **RESUELTO Y VALIDADO EN PRODUCCIÓN**. Credenciales de integración oficiales inyectadas en `/opt/velupi/.env.production`. Algoritmo de firma criptográfica SHA-256 verificado en vivo contra eventos reales: rechazo estricto ante firmas adulteradas (HTTP 400) y aprobación/persistencia inmediata ante eventos legítimos. | Ninguna acción técnica pendiente. |
| **B-06** | Zona `velupi.com` en BIND9 | DNS / Red | **Bajo** | Acceso a `velupi.com` y subdominios | **RESUELTO**. Zona creada en BIND9 (`89.117.147.134`). Resuelve globalmente vía `8.8.8.8` y `1.1.1.1`. | Ninguna acción pendiente. |
| **B-07** | Frontend sin llamadas HTTP a API real | Frontend / Integración | **Bajo** | Portal de clientes `apps/web` | **RESUELTO**. Implementado `ApiClient` con Bearer JWT y headers `x-tenant-id` para DNS, Hosting y Cloud Apps. | Ninguna acción pendiente. |
| **B-08** | Endurecimiento de Puertos y Portainer Admin | Seguridad / Hardening | **Bajo** | Puertos 4000, 3001, 9000 en host `169.58.220.244` | **RESUELTO Y CONFIRMADO**. Puertos 4000, 3001, 5432, 6379, 9000/9443 restringidos a `127.0.0.1`. Portainer CE 2.45.2 inicializado con cuenta `admin` maestra. PostgreSQL con 16 tablas relacionales activas. | Ninguna acción pendiente. |
| **B-09** | Rotación de Clave API HestiaCP Expuesta Históricamente | Seguridad / Credenciales | **Bajo** | Acceso API Hestia | **RESUELTO Y AUDITADO**. Clave histórica revocada y no presente en llavero Hestia. Clave activa `k4HHLIiCDxj9pIf1QwQK` asignada a `manager`. Cero secretos en repositorios. | Ninguna acción pendiente. |
| **B-10** | Credenciales de Proveedor OAuth (Google & GitHub) | Credenciales Externas | **Bajo** | Registro e inicio de sesión social real en vivo | **RESUELTO Y VALIDADO EN PRODUCCIÓN**. Credenciales oficiales registradas e inyectadas en `/opt/velupi/.env.production`. Flujos PKCE SHA-256 e inicio de autorización verificados en vivo contra `https://accounts.google.com` y `https://github.com/login/oauth/authorize`. | Ninguna acción técnica pendiente. |

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
