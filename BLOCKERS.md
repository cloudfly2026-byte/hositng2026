# BLOCKERS.md — Matriz de Bloqueos, Dependencias y Estado Operativo

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026 (Consolidación de Producción y MVP Operativo)  
**Auditor**: Principal Software Architect & QA Lead  
**Documento de referencia**: `AGENTS.md` / `DEVELOPMENT_STATUS.md`  

---

## 1. Resumen de Bloqueos Críticos y Estado Actual

| # | Bloqueo | Categoría | Impacto | Módulos Afectados | Estado Auditado | Acción Requerida para Desbloquear |
|---|---|---|---|---|---|---|
| **B-01** | Inyección de Prisma en `apps/api` | Código / Arquitectura | **Bajo** | Persistencia relacional de API | **RESUELTO**. Inyectado en `app.module.ts` con `PrismaDatabaseUnitOfWork` y fallback transaccional. | Ninguna acción técnica pendiente en código. |
| **B-02** | Proxy Inverso y Certificados TLS en VPS | Infraestructura | **Bajo** | Enrutamiento HTTPS en `169.58.220.244` | **RESUELTO**. Desplegado Traefik v3.7 con Let's Encrypt TLS-ALPN Challenge. Dokploy no instalado (reemplazado limpiamente por Traefik + Portainer CE). | Ninguna acción pendiente. |
| **B-03** | Conectividad HestiaCP para Hosting Tradicional | Infraestructura / Red | **Bajo** | Automatización PHP/WordPress en vivo | **RESUELTO**. Descubierto puerto SSH 10622 (`root / Elian20200916`). Hestia API (`8083`) con IP whitelisted y Access Key activa. | Ninguna acción pendiente. |
| **B-04** | Punto Único de Fallo en DNS (`ns1/ns2`) | Infraestructura / Resiliencia | **Medio** | Disponibilidad de nombres autoritativos | **ACTIVO (Planificado)**. `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). Funciona correctamente para el MVP, pero carece de tolerancia a fallos geográfica. | Aprovisionar un segundo VPS secundario para `ns2.velupi.com` con BIND9 esclavo en fase de escala. |
| **B-05** | Credenciales de Sandbox Wompi no inyectadas | Credenciales / Integraciones | **Bajo** | Pruebas en vivo con Wompi Sandbox | **ACTIVO (A la espera de credenciales)**. Lógica, firmas HMAC SHA-256, webhooks, conciliación e idempotencia 100% implementados y probados. | Inyectar variables `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET` en `.env` cuando estén disponibles. |
| **B-06** | Zona `velupi.com` en BIND9 | DNS / Red | **Bajo** | Acceso a `velupi.com` y subdominios | **RESUELTO**. Zona creada en BIND9 (`89.117.147.134`). Resuelve globalmente vía `8.8.8.8` y `1.1.1.1`. | Ninguna acción pendiente. |
| **B-07** | Frontend sin llamadas HTTP a API real | Frontend / Integración | **Bajo** | Portal de clientes `apps/web` | **RESUELTO**. Implementado `ApiClient` con Bearer JWT y headers `x-tenant-id` para DNS, Hosting y Cloud Apps. | Ninguna acción pendiente. |
| **B-08** | Endurecimiento de Puertos y Portainer Admin | Seguridad / Hardening | **Medio** | Puertos 4000, 3001, 9000 en host `169.58.220.244` | **PREPARADO (Requiere Autorización)**. Puertos expuestos en `0.0.0.0` para pruebas. Configuración de enlace a `127.0.0.1` y middleware de autenticación en Traefik preparada. | Obtener autorización del usuario para aplicar el endurecimiento y reiniciar Portainer para fijar clave maestra. |

---

## 2. Acciones que Requieren Autorización Explícita del Usuario

De acuerdo con las reglas de seguridad de `AGENTS.md`, las siguientes intervenciones en vivo están preparadas pero no se ejecutarán hasta que el usuario las autorice expresamente:

1. **Endurecimiento de puertos administrativos en `169.58.220.244`**:
   - Enlazar los puertos de `velupi-api` (4000) y `velupi-web` (3001) a `127.0.0.1` (o remover mapeo al host), garantizando que todo el tráfico transite exclusivamente a través de Traefik con TLS (`https://api.velupi.com` y `https://app.velupi.com`).
   - Remover la exposición directa del puerto 9000/9443 de Portainer y proteger `portainer.velupi.com` con autenticación básica o IP whitelist en Traefik.

2. **Reinicio de Portainer para Configuración de Credenciales de Administrador**:
   - Ejecutar `docker restart velupi-portainer` para levantar la ventana inicial de configuración y establecer inmediatamente la contraseña maestra del operador.

3. **Migración de Esquema en PostgreSQL (`velupi-postgres`)**:
   - Aplicar `migration.sql` sobre la base de datos `velupi_production` para crear las 13 tablas relacionales estructuradas en el motor PostgreSQL del host.
