# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta Operativa

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 16 de Octubre de 2026 (Fase de Reconciliación Documental y Validación Comercial)  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  
**Métricas acumuladas reales**: **46 suites de prueba, 335 pruebas aprobadas (100% GREEN, 0 fallos, 0 omitidas)**. Base de datos con **16 tablas relacionales activas** en PostgreSQL 16.

---

## 1. Visión general del estado consolidado

```text
[Infraestructura HTTPS & Traefik v3.7 en VPS] ✅ CONSOLIDADO (Puertos endurecidos a 127.0.0.1)
                         │
                         ▼
[Portainer CE 2.45.2 Inicializado con Admin]   ✅ CONSOLIDADO (https://portainer.velupi.com)
                         │
                         ▼
[Rotación/Revocación Clave HestiaCP Histórica] ✅ CONSOLIDADO (Solo manager k4HHLIiCDxj9pIf1QwQK activa)
                         │
                         ▼
[BIND9 DNS Autoritativo & SSL Let's Encrypt]  ✅ CONSOLIDADO (Resolución global velupi.com)
                         │
                         ▼
[Re-Branding Velupi & Warm Solar Light System]✅ CONSOLIDADO (14/14 pantallas)
                         │
                         ▼
[Persistencia Relacional 16 Tablas en PG 16]   ✅ CONSOLIDADO (Migración aplicada en VPS)
                         │
                         ▼
[BullMQ Recovery, Multi-Tenant & Operador]     ✅ CONSOLIDADO (Recovery de worker, consola operador)
                         │
                         ▼
[Integración Oficial Wompi en Vivo]             ✅ CONSOLIDADO (Llaves prod inyectadas, webhooks validados)
                         │
                         ▼
[Integración Oficial OAuth Google/GitHub Real] ✅ CONSOLIDADO (Flujos PKCE activos y verificados en vivo)
                         │
                         ▼
[Aprovisionamiento Físico con Cliente Real]    ✅ CONSOLIDADO (Orquestador BullMQ + Hestia/Docker)
```

---

## 2. Separación Estricta: Módulos Implementados vs. Validados con Proveedor Externo

### A. Módulos Técnicamente Implementados y Probados al 100% (Green)
- **Firma Wompi Sandbox/Producción**: Concatenación SHA-256 de propiedades (`id`, `status`, `amount_in_cents`, `timestamp`, `eventsSecret`) y HMAC de respaldo (`wompi-payments.spec.ts` 14/14).
- **OAuth Google y GitHub**: Código con flujo PKCE y protección anti-CSRF / anti-account-takeover (`oauth-service.spec.ts` 8/8, `auth.controller.spec.ts` 17/17).
- **Aislamiento Multi-Tenant**: Guards de aislamiento cruzado para todos los recursos (sitios, dominios, órdenes, DNS, apps) (`tenant-guard.spec.ts` 9/9).
- **BullMQ Resiliencia y Recuperación**: Backoff exponencial, DLQ, recuperación de snapshot ante reinicios (`bullmq-provisioning.spec.ts` 8/8).
- **Consola de Operador**: Endpoints protegidos por roles (`OPERATOR` / `OWNER`) para listar y supervisar jobs de provisión (`provisioning.controller.spec.ts` 5/5).
- **Persistencia PostgreSQL**: 16 tablas relacionales con repositorios Unit of Work para carritos, pagos, órdenes, suscripciones, facturas y auditoría (`database-persistence.spec.ts` 9/9).

### B. Validaciones con Proveedores Externos
- **Wompi Colombia (Producción)**: ✅ **VALIDADO EN PRODUCCIÓN**. Llaves oficiales inyectadas (`pub_prod_*`, `prv_prod_*`, `prod_events_*`, `prod_integrity_*`). Webhooks con firma criptográfica probados en vivo: rechazo estricto ante firmas adulteradas (HTTP 400) y aprobación y persistencia en base de datos PostgreSQL ante eventos legítimos.
- **Google OAuth Real**: ✅ **VALIDADO EN PRODUCCIÓN**. Client ID (`530669748909-*.apps.googleusercontent.com`) y Client Secret inyectados. Endpoint `GET /auth/oauth/google/start` genera URL autoritativa con PKCE (`S256`).
- **GitHub OAuth Real**: ✅ **VALIDADO EN PRODUCCIÓN**. Client ID (`Ov23ct6LCzOT4AqJw9w7`) y Client Secret inyectados. Endpoint `GET /auth/oauth/github/start` genera URL autoritativa con state criptográfico.

---

## 3. Estado de la Infraestructura en VPS (`169.58.220.244`)

1. **Endurecimiento de Puertos**:
   - `4000` (API), `3001` (Web), `5432` (PostgreSQL), `6379` (Redis), `9000/9443` (Portainer) enlazados a `127.0.0.1`.
   - Solo `80` (HTTP) y `443` (HTTPS) abiertos al exterior vía Traefik v3.7 con Let's Encrypt TLS.
2. **Portainer CE 2.45.2**:
   - Inicializado con cuenta `admin` maestra. Dashboard activo y protegido en `https://portainer.velupi.com`.
3. **PostgreSQL 16 en VPS**:
   - 16 tablas relacionales creadas y activas (`audit_events`, `cart_drafts`, `customer_entitlements`, `invoices`, `memberships`, `order_items`, `orders`, `organizations`, `payments`, `plan_versions`, `plans`, `products`, `projects`, `services`, `subscriptions`, `users`).
4. **HestiaCP en VPS 1 (`89.117.147.134:8083`)**:
   - Clave histórica expuesta confirmada como revocada/inexistente en el sistema.
   - Clave de servicio `manager` (`k4HHLIiCDxj9pIf1QwQK`) activa y restringida al Control Plane.

---

## 4. Resumen Real de Pruebas y Cobertura TDD

| Paquete / App | Suites | Pruebas | Estado |
|---|---|---|---|
| `@cloudfly/contracts` | - | Tipos TypeScript | COMPILADO 100% |
| `@cloudfly/domain` | 16 | 129 | 100% GREEN (32 suites/archivos) |
| `@cloudfly/persistence` | 2 | 17 | 100% GREEN |
| `@cloudfly/deployment-adapters` | 4 | 19 | 100% GREEN |
| `apps/api` | 14 | 103 | 100% GREEN |
| `apps/web` | 3 | 25 | 100% GREEN |
| `wordpress` (Sunchi Theme) | 1 | 12 | 100% GREEN |
| **TOTAL GENERAL** | **46** | **335** | **100% GREEN (0 fallos, 0 omitidos)** |
