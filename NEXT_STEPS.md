# NEXT_STEPS.md — Plan Técnico Priorizado y Hoja de Ruta Operativa

**Proyecto**: Velupi Cloud Platform / Microservices Studio & Commerce Engine  
**Fecha de actualización**: 16 de Octubre de 2026 (Fase de Reconciliación Documental y Validación Comercial)  
**Metodología**: TDD Obligatorio (Red → Green → Refactor)  
**Documento rector**: `AGENTS.md`  
**Métricas acumuladas reales**: **52 suites de prueba, 409 pruebas aprobadas (100% GREEN, 0 fallos, 0 omitidas)**. Base de datos con **16 tablas relacionales activas** en PostgreSQL 16.

---

## 1. Visión general del estado consolidado

```text
[Infraestructura HTTPS & Traefik v3.7 en VPS] ✅ CONSOLIDADO (Puertos endurecidos a 127.0.0.1)
                         │
                         ▼
[Portainer CE 2.45.2 Inicializado con Admin]   ✅ CONSOLIDADO (https://portainer.velupi.com)
                         │
                         ▼
[Rotación/Revocación Clave HestiaCP Histórica] ✅ CONSOLIDADO (Solo clave de servicio manager activa)
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
                         │
                         ▼
[Sprint QA Funcional E2E del Frontend Playwright]✅ CONSOLIDADO (Inventario, 7 roles, Desktop/Tablet/Mobile)
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

### C. Validación E2E de Compra y Wompi Sandbox (Navegador Real)
- **Registro / Autenticación Real**: ✅ **VALIDADO EN VIVO**. Cuenta `Edwin Guevara` (`egbmaster2007@gmail.com`) vinculada y autenticada en el portal.
- **Carrito y Cotización Inmutable**: ✅ **VALIDADO EN VIVO**. Plan WordPress Starter cotizado en backend por $35.000 COP + 19% IVA = **$41.650 COP**.
- **Paso 2 Facturación Fiscal**: ✅ **VALIDADO EN VIVO**. Diligenciamiento de datos de facturación (Edwin Guevara, CC 1020304050, Bogotá, D.C.).
- **Checkout Oficial Wompi Sandbox**: ✅ **VALIDADO EN VIVO**. Redirección exitosa a pasarela segura Wompi Sandbox (`https://checkout.wompi.co/method`) por **$41.650 COP**. Captura fotográfica de evidencia registrada.

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
   - Clave de servicio `manager` activa y restringida al Control Plane.

---

## 4. Resumen Real de Pruebas y Cobertura TDD
 
| Paquete / App | Suites | Pruebas | Estado |
|---|---|---|---|
| `@cloudfly/contracts` | - | Tipos TypeScript | COMPILADO 100% |
| `@cloudfly/domain` | 19 | 168 | 100% GREEN |
| `@cloudfly/persistence` | 2 | 17 | 100% GREEN |
| `@cloudfly/deployment-adapters` | 4 | 19 | 100% GREEN |
| `apps/api` | 16 | 168 | 100% GREEN |
| `apps/web` | 6 | 41 | 100% GREEN |
| `wordpress` (Sunchi Theme) | 1 | 12 | 100% GREEN |
| `E2E Playwright` (`app.velupi.com`) | 5 | 18 | VERIFICADO EN PRODUCCIÓN |
| **TOTAL GENERAL RUNNER** | **53** | **427** | **100% GREEN (0 fallos, 0 omitidos)** |

---

## 5. Evidencias de Pruebas en Vivo (Browser Agent)
- [proeba1_login_access_1792416168126.webp](file:///c:/Users/Edwin/Desktop/hosting2026/docs/recordings/proeba1_login_access_1792416168126.webp): Grabación del flujo completo de creación de cuenta `proeba1@cloudfly.com.co`, despacho de código por SMTP Hestia, validación de OTP `159395` y redirección exitosa al Dashboard de Velupi (`app.velupi.com`).

---

## 6. POST-MVP — Infraestructura DNS de Alta Disponibilidad y Multinodo (Deuda Técnica)

> **Decisión de Congelación DNS para MVP**: Durante el lanzamiento del MVP, la infraestructura DNS opera con la configuración fija de producción:
> - `HOSTING_DEFAULT_IP=89.117.147.134`
> - `DNS_PRIMARY_NS=ns1.velupi.com` (apuntando a `89.117.147.134`)
> - `DNS_SECONDARY_NS=ns2.velupi.com` (apuntando al mismo VPS por glue records GoDaddy)
>
> Se acepta temporalmente que `ns1` y `ns2` resuelvan al mismo VPS sin redundancia DNS ni sincronización multinodo para no bloquear el lanzamiento comercial. No se declara alta disponibilidad DNS en el MVP.

### Hoja de Ruta Post-MVP (Fuera del Alcance Inicial):
1. **DNS Secundario Independiente**: Desplegar un segundo VPS limpio en una región/proveedor geográficamente separado (ej. Hetzner o Contabo en Frankfurt/EE. UU.) dedicado exclusivamente a DNS secundario BIND9.
2. **Separación Física de Nameservers**: Migrar `ns2.velupi.com` a la IP pública del nuevo nodo independiente y actualizar Glue Records en GoDaddy.
3. **Sincronización Autoritative de Zonas (AXFR/NOTIFY)**: Configurar transferencias de zona BIND9 seguras mediante TSIG keys entre el nodo primario (`ns1`) y el secundario (`ns2`).
4. **Descubrimiento Dinámico de Nodos**: Reemplazar IPs y nameservers estáticos por el Scheduler de asignación de VPS (`NodeInventoryService`), resolviendo el nodo según la carga y región de la organización.
5. **Failover y Balanceo Anycast / GeoDNS**: Incorporar monitoreo de salud con failover automático entre nodos de datos.


