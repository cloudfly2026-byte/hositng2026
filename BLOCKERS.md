# BLOCKERS.md — Matriz de Bloqueos, Dependencias y Necesidades

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026  
**Auditor**: Principal Software Architect & QA Lead  
**Documento de referencia**: `AGENTS.md` / `DEVELOPMENT_STATUS.md`  

---

## 1. Resumen de Bloqueos Críticos y Estado Actual

| # | Bloqueo | Categoría | Impacto | Módulos Afectados | Estado Auditado | Acción Requerida para Desbloquear |
|---|---|---|---|---|---|---|
| **B-01** | Inyección de Prisma en `apps/api` | Código / Arquitectura | **Medio** | Persistencia duradera de API NestJS | Resuelto en `@cloudfly/persistence` con migraciones y tests. Falta cablear en `AppModule`. | Inyectar `PrismaUnitOfWork` en `apps/api/src/app.module.ts`. |
| **B-02** | Dokploy & Traefik no operativos en VPS | Infraestructura | **Alto** | Despliegue de Cloud Apps (Node/Python) | Docker 29.9.0 está activo, pero puertos 3000, 80 y 443 están **CERRADOS**. | Abrir puertos 80/443/3000 en UFW e instalar Dokploy con script oficial. |
| **B-03** | Puerto SSH HestiaCP cerrado/filtrado | Infraestructura / Red | **Alto** | Automatización PHP/WordPress en vivo | Puertos 8083, 80, 443 y 53 abiertos; puerto 22 cerrado/filtrado. | Abrir puerto SSH (o puerto personalizado) y autorizar clave pública en `89.117.147.134`. |
| **B-04** | Punto Único de Fallo en DNS (`ns1/ns2`) | Infraestructura / Resiliencia | **Alto** | Disponibilidad de nombres autoritativos | `ns1` y `ns2.velupi.com` apuntan a la misma IP (`89.117.147.134`). | Aprovisionar un segundo VPS secundario para `ns2.velupi.com` con BIND9 esclavo. |
| **B-05** | Credenciales de Sandbox Wompi no inyectadas | Credenciales / Integraciones | **Bajo** | Pruebas en vivo con Wompi Sandbox | Lógica, firmas HMAC, webhooks, conciliación e idempotencia 100% implementados y probados. | Configurar variables `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET` en `.env`. |
| **B-06** | Zona `velupi.com` no creada en BIND9 | DNS / Red | **Alto** | Acceso a `velupi.com` | BIND9 responde `RCODE_REFUSED` para `velupi.com`. | Crear la zona autoritativa `velupi.com` en HestiaCP antes de cambiar nameservers en GoDaddy. |
| **B-07** | Frontend sin llamadas HTTP a API real | Frontend / Integración | **Medio** | Interactividad real del portal de clientes | Las vistas usan estados estáticos locales y `setTimeout`. | Implementar cliente HTTP REST en `apps/web` con tokens Bearer JWT hacia `http://169.58.220.244:4000`. |

---

## 2. Detalle de Necesidades por Categoría

### 2.1 Accesos y Credenciales Requeridos
*(Nota: No incluir contraseñas en texto plano ni compartir secretos en chats o commits. Estas credenciales deben inyectarse exclusivamente en variables de entorno `.env` en producción).*

1. **Puerto SSH y Llave para HestiaCP (`89.117.147.134`)**:
   - **Propósito**: Permitir que el backend invoque comandos de HestiaCP (`v-add-user`, `v-add-web-domain`, `v-add-dns-domain`) de forma desatendida.
   - **Estado actual**: El puerto 22 estándar no responde. Se requiere confirmar el puerto SSH activo en el servidor y autorizar la clave pública.
2. **API Key de Dokploy (`169.58.220.244`)**:
   - **Propósito**: Permitir que `CloudAppsService` invoque endpoints de Dokploy para gestionar contenedores Docker.
   - **Mecanismo**: Generar token desde la interfaz administrativa de Dokploy una vez instalado en el puerto 3000.
3. **Llaves de Sandbox de Wompi (Colombia)**:
   - **Propósito**: Conectar el checkout en vivo con la pasarela en entorno de pruebas.
   - **Variables**: `WOMPI_PUBLIC_KEY`, `WOMPI_PRIVATE_KEY`, `WOMPI_EVENTS_SECRET`, `WOMPI_INTEGRITY_SECRET`.

### 2.2 Infraestructura Física y de Red Requerida

1. **Dokploy & Traefik en `shared-node-01` (`169.58.220.244`)**:
   - El VPS tiene Docker 29.9.0 activo y los contenedores de `velupi-api` (puerto 4000) y `velupi-web` (puerto 3001) respondiendo HTTP 200.
   - Falta ejecutar el script `curl -sSL https://dokploy.com/setup.sh | sh` para levantar Dokploy en el puerto 3000 y Traefik en puertos 80 y 443.
2. **Zona BIND9 para `velupi.com` en HestiaCP (`89.117.147.134`)**:
   - Actualmente BIND9 responde `RCODE_REFUSED` para consultas de `velupi.com`.
   - Se debe crear la zona en HestiaCP con registros A (`@` hacia `89.117.147.134`, `api` y `app` hacia `169.58.220.244`), CNAME `www` y glue records `ns1/ns2`.
3. **DNS Redundante**:
   - Mantener un solo nodo para `ns1` y `ns2` representa un punto único de fallo. Se recomienda evaluar un VPS esclavo secundario en el mediano plazo.
