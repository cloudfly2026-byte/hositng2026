# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta Operativa

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 15 de Octubre de 2026 (Consolidación de Producción y MVP Operativo)  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  
**Métricas acumuladas**: 37 suites de prueba, 246 pruebas aprobadas (100% GREEN, 0 fallos).

---

## 1. Visión general del estado consolidado

Habiendo alcanzado la publicación HTTPS en vivo para todos los dominios comerciales y de control (`velupi.com`, `app.velupi.com`, `api.velupi.com`, `portainer.velupi.com`), la resolución autoritativa en BIND9, la integración desacoplada con HestiaCP sobre HTTPS y el nuevo **Motor de Escrituras Controladas con Auditoría**, la plataforma se encuentra lista para la validación del primer flujo operativo de cliente.

```text
[Infraestructura HTTPS & Traefik v3.7 en VPS] ✅ CONSOLIDADO
                         │
                         ▼
[BIND9 DNS Autoritativo & SSL Let's Encrypt]  ✅ CONSOLIDADO
                         │
                         ▼
[Motor de Escrituras Controladas & Auditoría] ✅ CONSOLIDADO
                         │
                         ▼
[Flujo Operativo de Autoservicio en app.velupi.com] ◀── SIGUIENTE PASO OPERATIVO
                         │
                         ▼
[Endurecimiento de Puertos & Sandbox Wompi] ──── (A la espera de autorización)
```

---

## 2. Próximo Flujo E2E Recomendado (De Cara al Cliente en `app.velupi.com`)

El objetivo inmediato es permitir que un usuario autenticado complete el ciclo completo de administración de hosting y DNS sin requerir soporte manual ni ver paneles externos:

1. **Autenticación en el Portal**:
   - Ingreso a `https://app.velupi.com/login` utilizando credenciales del tenant u organización piloto.
   - Verificación de sesión con token Bearer JWT y asignación de rol (`OWNER` o `ADMIN`).
2. **Dashboard de Servicios**:
   - Visualización de la tarjeta de servicio *Web Hosting* asociada al tenant.
   - Comprobación de cuotas de recursos (sitios activos, bases de datos creadas, espacio en disco).
3. **Gestión de Sitio Web (WordPress / PHP)**:
   - Navegación a `/services/wordpress` o `/hosting/sites`.
   - Consulta en tiempo real del sitio `velupi.com` con transporte HTTPS autenticado: estado de SSL Let's Encrypt, versión PHP activa y almacenamiento.
4. **Administración Centralizada de DNS**:
   - Navegación a `/dns` para consultar la zona `velupi.com`.
   - Reconciliación en un clic contra BIND9 (`POST /dns/zones/:zoneId/reconcile`) mostrando los registros autoritativos (`A`, `CNAME`, `MX`, `CAA`).
   - Prueba de adición de un registro controlado (ej. `dev.velupi.com` A `169.58.220.244`) con validación RFC 1912 y registro inmutable en `AuditEvent`.

---

## 3. Acciones Preparadas a la Espera de Autorización

1. **Endurecimiento de Red en VPS `169.58.220.244`**:
   - Restringir la exposición pública de los puertos `4000` (API) y `3001` (Web) enlazándolos a `127.0.0.1` o canalizándolos exclusivamente mediante la red de Traefik.
   - Cerrar el puerto `9000/9443` de Portainer al exterior e implementar Basic Auth o IP Whitelist en Traefik para `portainer.velupi.com`.
2. **Reinicio de Portainer**:
   - Ejecutar `docker restart velupi-portainer` para fijar las credenciales maestras de administración del operador antes del timeout de 5 minutos.
3. **Migración de Esquema en PostgreSQL**:
   - Aplicar `migration.sql` en `velupi_production` para activar la persistencia relacional en el contenedor `velupi-postgres`.

---

## 4. Resumen de Pruebas y Cobertura TDD

| Paquete / App | Suites | Pruebas | Estado |
|---|---|---|---|
| `@cloudfly/contracts` | - | Tipos TypeScript | COMPILADO 100% |
| `@cloudfly/domain` | 15 | 114 | 100% GREEN |
| `@cloudfly/persistence` | 2 | 13 | 100% GREEN |
| `@cloudfly/deployment-adapters` | 4 | 19 | 100% GREEN |
| `apps/api` | 13 | 85 | 100% GREEN |
| `apps/web` | 3 | 15 | 100% GREEN |
| **TOTAL** | **37** | **246** | **100% GREEN (0 fallos)** |
