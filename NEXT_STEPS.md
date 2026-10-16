# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta Operativa

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 16 de Octubre de 2026 (Cierre de Prioridades 0 y 1 / Sprint Final del MVP Comercial)  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  
**Métricas acumuladas**: 46 suites de prueba, 323 pruebas aprobadas (100% GREEN, 0 fallos). Base de datos migrada a 16 tablas relacionales activas en PostgreSQL.

---

## 1. Visión general del estado consolidado

```text
[Infraestructura HTTPS & Traefik v3.7 en VPS] ✅ CONSOLIDADO
                         │
                         ▼
[BIND9 DNS Autoritativo & SSL Let's Encrypt]  ✅ CONSOLIDADO
                         │
                         ▼
[Re-Branding Velupi & Warm Solar Light System]✅ CONSOLIDADO (14/14 pantallas)
                         │
                         ▼
[Prioridad 0: Auditoría y Saneamiento Llaves] ✅ CONSOLIDADO
                         │
                         ▼
[Prioridad 1: Persistencia Relacional 16 DBs] ✅ CONSOLIDADO (PostgreSQL en VPS)
                         │
                         ▼
[Prioridad 2: Validación E2E Wompi Sandbox]   ◀── SIGUIENTE PASO OPERATIVO
                         │
                         ▼
[Prioridad 3: Aprovisionamiento Físico BullMQ]◀── PENDIENTE VALIDACIÓN EN VIVO
```

---

## 2. Próximos Hitos del Sprint Final (Prioridades 2 y 3)

1. **Prioridad 2 — Validación E2E de Wompi Sandbox (UC-NEW-001)**:
   - Probar flujo completo: Carrito persistido (`/cart`) $\rightarrow$ Registro/OAuth $\rightarrow$ Datos Fiscales (`/checkout`) $\rightarrow$ Checkout Wompi Sandbox $\rightarrow$ Webhook firmado HMAC SHA-256 $\rightarrow$ Orden pasa a `PAID`.
   - Verificar persistencia automática del `PaymentRecord` y `Subscription` en las tablas `payments` y `subscriptions` de PostgreSQL.
   - Confirmar comportamiento no-autoritativo de la pantalla `/checkout/return` (solo polling, nunca auto-aprobación por redirect).

2. **Prioridad 3 — Aprovisionamiento Físico Duradero con BullMQ y Redis Real**:
   - Conectar el worker de aprovisionamiento en vivo contra `velupi-redis:6379`.
   - Validar ejecución para el tenant de prueba:
     1. Disparo de `ProvisioningJob` tras orden `PAID`.
     2. Creación de cuenta y sitio web en HestiaCP (`89.117.147.134`).
     3. Creación de registros autoritativos en BIND9.
     4. Emisión de SSL Let's Encrypt.
     5. Notificación y reflejo en el Dashboard del cliente en `https://app.velupi.com`.

3. **Prioridad 4 — Consola de Operador Mínima y Notificaciones Transaccionales**:
   - Configuración de templates de correo transaccional (bienvenida, confirmación de orden, factura generada, servicio activo).
   - Vista mínima de operador para supervisar jobs de provisión y estado de nodos.

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
| `apps/api` | 13 | 86 | 100% GREEN |
| `apps/web` | 3 | 19 | 100% GREEN |
| **TOTAL** | **37** | **251** | **100% GREEN (0 fallos)** |
