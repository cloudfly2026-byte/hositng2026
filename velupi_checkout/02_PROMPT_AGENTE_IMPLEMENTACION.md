# PROMPT DE IMPLEMENTACIÓN — Velupi UC-NEW-001

Actúa como Principal Software Architect + Senior Full-Stack Engineer + QA Lead del monorepo Velupi Cloud Platform. **Implementa** el flujo comercial de nuevo cliente inspirado en la UX de las capturas de referencia: `www.velupi.com` (WordPress) → carrito → registro/login email/Google/GitHub → datos fiscales + pago Wompi → pedido → worker → servicio en dashboard. El nombre, branding, textos y componentes deben ser propios de Velupi.

## Paso 0 — inspección obligatoria

Lee `AGENTS.md`, `DEVELOPMENT_STATUS.md`, `BLOCKERS.md` y el documento `01_CASO_USO_COMPRA_NUEVO_CLIENTE.md`. Inspecciona monorepo y endpoints existentes: catálogo, onboarding, auth JWT/Argon2, checkout, Wompi, billing, provisioning, Prisma UoW, API client, MUI AppShell, `www.velupi.com`/CTA, roles y auditoría. **No reimplementes** componentes existentes ni asumas como real un adaptador simulado. Documenta diferencia entre código probado, proveedor conectado y E2E físico.

## Desarrollo incremental

**Fase A: enlaces y carrito**. Permitir que CTA de cada plan comercial apunte a `https://app.velupi.com/cart?plan=<slug>&cycle=<cycle>`. URL con parámetros permitidos; obtener precio/catalogo del servidor y planVersion; construir carrito responsive propio de Velupi con selector de período, descuentos y extras autorizados, resumen y renovación. Crear `CartDraft` durable/temporal, persistido por identificador opaco; proteger contra manipulación y replay. Pruebas TDD para cambiar período y conservar carrito.

**Fase B: autenticación y OAuth**. Reutilizar email/Argon2/JWT. Implementar login Google y GitHub con Authorization Code + PKCE y `state`, callbacks y cookies httpOnly `Secure` `SameSite` apropiado. Manejar diferencia de OAuth OIDC (Google) vs OAuth GitHub, correos privados/no verificados y enlaces entre cuentas solo con prueba del usuario. No almacenar tokens del proveedor en frontend. Registrar estado del flujo con `returnTo` relativo y validado; impedir open redirect. El retorno conserva el mismo carrito. Implementar verificación de email, recuperación y login existente. Crear tablas de proveedor/identidad y sesión solo si faltan. Pruebas de CSRF, callback inválido, cancelación, email existente y sesión vencida.

**Fase C: checkout**. MUI en `app.velupi.com/checkout`: datos fiscales según país y tipo de persona, resumen de precios backend, cupones si soportados, políticas de renovación, confirmación y métodos de pago. Wompi: usar checkout hospedado/tokenización oficial; NO implementar campos propios para capturar números de tarjeta/CVV. Corroborar especificación oficial vigente de firmas/headers y medios. Crear orden idempotente sin duplicaciones; pago solo después de aceptar importe/condiciones. Proveer página de estado del pago y pedido, estados WAITING/PAID/FAILED/PROVISIONING/ACTIVE.

**Fase D: provisión e integración**. Webhook verificado en servidor (firma y fuente), correlación de referencia, transacciones y montos. Persistencia transaccional, outbox + BullMQ real, worker independiente conectado a Redis, estados/reintentos, job visible. No activar servicio por redirección de navegador; no duplicar órdenes/entitlements. Integrar Hestia/DNS/SSL solamente en entornos de prueba autorizados, sin tocar recursos de terceros. Mantener la separación Customer Portal / Operator Console y marcas de proveedores invisibles.

**Fase E: WordPress**. Implementar o documentar integración del CTA en la landing WordPress. La publicación en sitio real requiere aprobación; sin ella entrega configuración o snippet controlado y pasos de validación, sin alterar WordPress productivo.

## Contratos mínimos

Reutiliza rutas existentes cuando sirvan y establece las ausentes con versionado y DTO validados: `GET /catalog/plans`, `POST/GET/PATCH /cart`, `POST /auth/register`, `/auth/login`, `/auth/oauth/google/start`, `/auth/oauth/google/callback`, `/auth/oauth/github/start`, `/auth/oauth/github/callback`, `GET /auth/me`, `POST /checkout/order`, `POST /checkout/payment-session`, `POST /webhooks/wompi`, `GET /orders/:id`, `GET /provisioning/jobs/:id`. Declara claramente los cambios reales de rutas tras inspeccionar código.

## Seguridad y calidad

TDD RED → GREEN → REFACTOR; agregar tests unitarios, integración, componentes React y Playwright E2E para visitante, email, Google/GitHub (con dobles de OAuth en CI), cuenta existente, fracaso OAuth, pago no aprobado, webhook duplicado/inválido, concurrency, cross-tenant, navegación móvil. Ejecutar typecheck/build y todas las pruebas; no marcar E2E real cuando usa mocks. Implementar CSP, rate limit y anti-bot en rutas públicas, secret management, logs saneados y auditoría. No exponer claves Wompi/Hestia/GitHub/Google. No aceptar `x-tenant-id` como autoridad independiente de claims y pertenencia server-side.

## Regla de infraestructura

Stack acordado: **Docker + Traefik in-house**, no instalar Dokploy. HestiaCP/BIND9 son backend ocultos para Hosting/DNS. No alterar DNS, firewall, servicios existentes, producción WordPress, credenciales ni realizar pagos reales sin autorización. La credencial Hestia expuesta en auditorías previas debe estar revocada antes de ampliar escrituras; si no puede verificarse, registrar bloqueante de prioridad 0.

## Entregables y punto de control

- Código completo integrado al monorepo, sin deshacer el trabajo previo.
- UX responsive para 3 pantallas: Carrito → Autenticación → Checkout.
- OAuth funcional en entorno seguro de prueba cuando existan credenciales y callbacks autorizados; de lo contrario, adaptadores y pruebas con bloqueo explícito.
- Nuevas migraciones Prisma y endpoints documentados.
- Evidencia de TDD, Playwright, build, screenshots de pruebas y resultados de cada integración.
- Actualizar `DEVELOPMENT_STATUS.md`, `BLOCKERS.md`, `NEXT_STEPS.md` y `AGENTS.md` para nuevas decisiones aprobadas.

Empieza con una matriz de reutilización de código; implementa Fase A y B, ejecuta pruebas, continúa C y D solo donde no se requieran operaciones sensibles. Detente ante bloqueos reales de proveedores o producción y solicita autorización explícita antes de ejecutar cambios sensibles.
