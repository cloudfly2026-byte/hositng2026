# AGENTS.md — Velupi Cloud Platform / Microservices Studio & Commerce Engine

> Documento rector para agentes de IA y desarrolladores. **Todo desarrollo se realiza con TDD (Red → Green → Refactor)**. Estado: especificación técnica y funcional; no asumir que los módulos ya están implementados.

---

## 1. Visión, propósito e identidad comercial

Construir **Velupi Cloud Platform**, una plataforma SaaS comercial de hosting, aplicaciones cloud, VPS, microservicios e infraestructura administrada con asistencia DevOps inteligente (Hermes AI). La experiencia de usuario se basa en una navegación intuitiva y unificada por **Cuenta → Organización → Proyecto → Servicio**, combinando la simplicidad de paneles modernos tipo SiteGround Site Tools con la potencia de un PaaS y un estudio gráfico de arquitectura distribuida (Microservices Studio).

### Identidad comercial de marca
- **Nombre comercial provisional**: **Velupi Cloud Platform** (o **Velupi**).
- **Dominio principal**: `velupi.com` (sujeto a validación marcaria y legal antes del lanzamiento comercial definitivo).
- **Eslogan de trabajo**: *"Velupi — Tus ideas merecen volar."*
- **Valores y atributos de marca**:
  - Alegría y cercanía en el trato con el usuario y soporte.
  - Facilidad de uso radical sin fricción técnica.
  - Confianza profesional, alta disponibilidad y seguridad rigurosa.
  - Tecnología accesible con precios justos y transparentes.
  - Infraestructura cloud inteligente y automatizada.
  - Capacidad de crecimiento y escala internacional.

### Modelos de entrega de infraestructura
1. **Shared Cloud**: Cargas de trabajo de múltiples tenants distribuidas eficientemente entre un pool compartido de VPS (`shared-node-01`, etc.), garantizando aislamiento mediante contenedores, cuotas de recursos y límites operativos.
2. **Dedicated Cloud**: Aprovisionamiento de VPS de uso exclusivo para una sola organización, tras confirmación de pago y validación de disponibilidad del proveedor, con configuración y endurecimiento automatizado.

### Decisiones técnicas y arquitectónicas acordadas
- **HestiaCP**: Motor preferente para hosting tradicional PHP, Laravel, WordPress/WooCommerce, gestión de bases de datos MariaDB/MySQL y DNS/correo cuando corresponda. Mantener las instancias existentes sin cambios disruptivos.
- **Dokploy + Docker**: Motor inicial para aplicaciones en Node.js/Next.js/NestJS, Python/Django/FastAPI, Java/Spring Boot, C#/.NET, workers en segundo plano y contenedores personalizados. Primer nodo de despliegue: `shared-node-01`, un VPS limpio separado del entorno Hestia.
- **Contabo**: Primer proveedor de infraestructura IaaS mediante adaptador/API agnóstico. El diseño debe permitir incorporar futuros proveedores (Hetzner, OVH, AWS, etc.) sin acoplamiento.
- **K3s**: Alternativa futura para orquestación multinodo avanzada; explícitamente fuera del alcance del MVP inicial.
- **Hermes Agent**: Asistente DevOps contextual. Opera exclusivamente mediante un Tool Gateway auditado y autenticado, sin acceso directo a socket Docker ni privilegios root en el sistema operativo. Modo inicial **solo lectura**; operaciones mutables requerirán aprobación explícita.
- **Microservices Studio**: Capa visual y declarativa de diseño, validación y orquestación de aplicaciones multicomponente, agnóstica del motor de ejecución subyacente.
- **Stack tecnológico**:
  - **Portal de clientes**: Next.js + React + Material UI (MUI) + TypeScript.
  - **Backend / Control Plane**: NestJS + TypeScript (monolito modular inicial).
  - **Base de datos principal**: PostgreSQL.
  - **Colas y trabajos asíncronos**: Redis + BullMQ.
- **Pasarela de pago inicial**: **Wompi (Colombia)**, integrada mediante una interfaz agnóstica `PaymentProvider` para permitir la incorporación posterior de Stripe y otras pasarelas regionales.

---

## 2. Arquitectura de dominios y servicios web

La plataforma segrega responsabilidades en dominios y subdominios claramente delimitados:

### 2.1 Sitio comercial (`https://velupi.com`)
- **Propósito**: Adquisición, marketing, catálogo de productos, calculadora de precios y punto de entrada al checkout.
- **Contenido**: Landing pages, catálogo interactivo de productos, comparador de planes, documentación pública comercial, testimonios, casos de uso, presentación de Hermes AI y FAQs.
- **Alojamiento inicial**: Puede alojarse inicialmente sobre HestiaCP como aplicación web estática o PHP/WordPress optimizada.

### 2.2 Portal de clientes (`https://app.velupi.com`)
- **Propósito**: Panel administrativo y operativo de autoservicio para clientes autenticados.
- **Tecnologías**: Next.js, React, Material UI (MUI), TypeScript.
- **Capacidades**:
  - Onboarding, registro, inicio de sesión seguro, verificación de email y MFA.
  - Gestión de perfil, organizaciones, miembros y roles (RBAC).
  - Carrito de compras, checkout, historial de pedidos, facturas y suscripciones.
  - Gestión de Proyectos y Servicios (Site Tools contextuales para WordPress, Node.js, Python, etc.).
  - Gestión de dominios propios, DNS y certificados SSL/TLS automáticos.
  - Microservices Studio (diseño gráfico y despliegue de stacks).
  - Hermes AI Assistant (consultas de estado, análisis de métricas y logs auditados).
  - Centro de ayuda y tickets de soporte.

### 2.3 Backend / Control Plane (`https://api.velupi.com`)
- **Propósito**: Núcleo transaccional, orquestador de identidades, facturación, aprovisionamiento e infraestructura.
- **Tecnologías**: NestJS, TypeScript, PostgreSQL, Redis/BullMQ.
- **Responsabilidades**: Control Plane monolítico modular que gestiona autenticación, permisos multi-tenant, ciclo de vida de órdenes y pagos, gestión de entitlements, enrutamiento de despliegues y adaptadores a proveedores.

### 2.4 Servicios complementarios
- `docs.velupi.com`: Documentación técnica y guías de usuario para desarrolladores.
- `status.velupi.com`: Página pública de estado y disponibilidad operativa, alojada fuera del dominio de fallo principal.
- `*.apps.velupi.com`: Subdominios temporales provistos automáticamente para previsualización de aplicaciones y staging mediante wildcard DNS y enrutamiento seguro TLS.

*(Nota: No asumir que todos los subdominios complementarios estarán operativos en la primera iteración del MVP).*

---

## 3. Objetivos del MVP (Técnicos y Comerciales)

1. **Identidad y Onboarding multi-tenant**: Registro seguro con validación de email, organizaciones, membresías, roles y sesiones protegidas.
2. **Catálogo de productos y planes comerciales**: Gestión desacoplada y versionada de productos (Web Hosting, WordPress, Cloud Apps, VPS, etc.), planes, ciclos de facturación, cuotas y precios.
3. **Módulo de Commerce & Checkout**: Carrito de compras, creación de órdenes, integración con Wompi en entorno de pruebas, recepción segura de webhooks con firma criptográfica y conciliación transaccional.
4. **Provisioning Orchestrator**: Despacho asíncrono e idempotente de aprovisionamiento una vez confirmado el pago, asignando cuotas y permisos al cliente (*CustomerEntitlements*).
5. **Cliente piloto #001 (Velupi)**: Configuración del portal comercial y la propia organización Velupi como primer tenant interno sobre la infraestructura sin cobro real, validando el flujo idéntico al de clientes externos.
6. **CRUD de proyectos y servicios**: Catálogo de runtimes/plantillas, gestión declarativa de configuraciones, variables de entorno y referencias a secretos.
7. **Inventario de nodos y Scheduler**: Registro de nodos del pool (iniciando por `shared-node-01`), asignación basada en cuotas y reservas auditables.
8. **Adaptador de HestiaCP**: Gestión de planes PHP/WordPress, dominios, bases de datos y SSL en nodos Hestia.
9. **Adaptador de Dokploy**: Despliegue de aplicaciones Docker/Node.js/Python, consulta de logs en vivo y vinculación de dominios.
10. **Site Tools y Microservices Studio básico**: Vistas contextuales por tipo de carga y modelado de grafos sencillos (Frontend + Backend + DB).
11. **Hermes Agent Read-Only**: Asistente contextual con aislamiento multi-tenant y auditoría de consultas.

### Fuera del alcance del MVP
- Autoscaling dinámico horizontal entre múltiples nodos.
- Clústeres Kubernetes/K3s en producción.
- CDN global y almacenamiento S3 propietario.
- Serverless / Cloud Functions propietarias.
- Facturación por milisegundo o consumo de CPU en tiempo real.
- Creación automatizada y sin supervisión financiera de servidores dedicados en Contabo.
- Acceso de Hermes AI para ejecutar comandos bash directos o acceso root.

---

## 4. Arquitectura lógica unificada

```text
Sitio Comercial (velupi.com)          Portal de Clientes (app.velupi.com)
            \                                      /
             \                                    /
              v                                  v
========================================================================
             API / CONTROL PLANE (NestJS — api.velupi.com)
========================================================================
  [ Identity & Onboarding ]       [ Product Catalog & Plan Versions ]
  [ Multi-Tenancy & RBAC  ]       [ Cart, Checkout & Orders         ]
  [ Customer Entitlements ]       [ Subscriptions & Billing Engine  ]
  [ Audit & Security Log  ]       [ Hermes Tool Gateway (Read-Only) ]
------------------------------------------------------------------------
                     [ PROVISIONING ORCHESTRATOR ]
            (Async Jobs BullMQ / Outbox Pattern / Idempotency)
------------------------------------------------------------------------
  [ Projects & Services ]         [ Node Inventory & Scheduler ]
  [ Secrets & Domains   ]         [ Health & Metrics Engine    ]
========================================================================
   |                              |                          |
   v                              v                          v
PaymentProvider          DeploymentProvider         InfrastructureProvider
   |                              |                          |
   +-- WompiAdapter (CO)          +-- HestiaAdapter          +-- ContaboAdapter
   +-- Future Stripe              +-- DokployAdapter         +-- Future Providers
                                  +-- Future K3s
========================================================================
                              DATA PLANE
  Shared Nodes (Pool: shared-node-01)   |   Dedicated Nodes (Single-Tenant VPS)
```

**Regla cardinal: Control Plane ≠ Data Plane.** El Control Plane almacena el estado deseado y gestiona el negocio; los nodos de datos ejecutan las cargas de los clientes. El servidor Hestia actual de producción y el nuevo nodo `shared-node-01` (`169.58.220.244`) cumplen roles distintos y aislados.

---

## 5. Modelo de dominio unificado

### 5.1 Identidad, Tenancy y Gobernanza
- `User`: Identidad global del usuario (`id`, `email`, `passwordHash`, `emailVerified`, `mfaEnabled`, `createdAt`).
- `Organization`: Unidad tenant propietaria de recursos y contratos (`id`, `name`, `slug`, `billingProfileId`, `isInternalPilot`, `createdAt`).
- `Membership`: Relación usuario-organización (`id`, `userId`, `organizationId`, `role`, `linkedHestiaUser`, `createdAt`).
- `Role`: Roles RBAC (`OWNER`, `ADMIN`, `DEVELOPER`, `VIEWER`).
- `AuditEvent`: Registro de auditoría inmutable (`id`, `organizationId`, `actorUserId`, `action`, `resource`, `timestamp`, `metadata`).

### 5.2 Catálogo Comercial y Precios
- `Product`: Definición general de producto comercial (`id`, `name`, `code`, `category`, `isActive`).
- `ProductCategory`: Categorización (`WEB_HOSTING`, `WORDPRESS`, `CLOUD_APPS`, `VPS`, `MICROSERVICES`, `AI`).
- `Plan`: Plan comercial (`id`, `productId`, `name`, `code`, `infrastructureMode`).
- `PlanVersion`: Versión inmutable del plan que congela condiciones contractuales (`id`, `planId`, `version`, `features`, `quotas`, `effectiveFrom`, `effectiveTo`).
- `PlanPrice`: Tarifa según moneda y periodicidad (`id`, `planVersionId`, `currency`, `billingCycle`, `priceCents`).
- `ResourceQuota`: Límites específicos de la versión (`cpuMilli`, `memoryMb`, `diskMb`, `bandwidthMb`, `maxApps`, `maxDomains`, `maxDatabases`, `hermesAccess`).
- `BillingCycle`: Intervalo de cobro (`MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`, `BIENNIAL`).
- `Promotion` / `Coupon`: Descuentos y códigos promocionales con fecha de validez y límite de uso (`code`, `discountPercent`, `discountFixed`, `validUntil`, `maxUses`).
- `CustomerEntitlement`: Derechos y cuotas activos asignados a una organización tras la compra (`id`, `organizationId`, `orderId`, `planVersionId`, `status`, `validUntil`).

### 5.3 Comercio, Órdenes y Pagos
- `Order`: Orden de compra (`id`, `organizationId`, `orderNumber`, `status`, `currency`, `subtotalCents`, `taxCents`, `totalCents`, `items`, `idempotencyKey`, `createdAt`).
- `OrderItem`: Detalle de la orden (`id`, `orderId`, `planVersionId`, `billingCycle`, `unitPriceCents`, `quantity`).
- `OrderStatus`: `DRAFT`, `PENDING_PAYMENT`, `PAID`, `PROVISIONING`, `COMPLETED`, `FAILED`, `CANCELLED`, `REFUNDED`.
- `Payment`: Transacción de pago (`id`, `orderId`, `provider`, `providerTransactionId`, `status`, `amountCents`, `currency`, `signatureVerified`, `rawPayloadRef`).
- `PaymentStatus`: `PENDING`, `APPROVED`, `DECLINED`, `VOIDED`, `REFUNDED`, `ERROR`.
- `Subscription`: Suscripción recurrente (`id`, `organizationId`, `planVersionId`, `status`, `billingCycle`, `currentPeriodStart`, `currentPeriodEnd`, `gracePeriodUntil`).
- `SubscriptionStatus`: `ACTIVE`, `TRIALING`, `PAST_DUE`, `GRACE_PERIOD`, `SUSPENDED`, `CANCELLED`, `TERMINATED`.
- `Invoice`: Documento de cobro generado por el sistema (`id`, `organizationId`, `orderId`, `invoiceNumber`, `totalCents`, `pdfUrl`, `issuedAt`).

### 5.4 Operaciones, Proyectos y Recursos
- `Project`: Agrupador de servicios dentro de un tenant (`id`, `organizationId`, `name`, `slug`, `infrastructureMode`).
- `Service`: Unidad ejecutable (`id`, `projectId`, `organizationId`, `name`, `slug`, `runtimeTemplateId`, `desiredState`, `observedState`).
- `RuntimeTemplate`: Plantilla técnica de ejecución (`id`, `name`, `targetEngine`, `defaultPorts`, `envSchema`).
- `Deployment`: Registro de una ejecución de despliegue (`id`, `serviceId`, `status`, `commitHash`, `logSnapshotRef`).
- `Domain`: Dominio o subdominio enlazado (`id`, `organizationId`, `serviceId`, `hostname`, `sslStatus`).
- `SecretReference`: Puntero a secreto cifrado en vault (`id`, `organizationId`, `keyName`, `vaultKeyRef`).
- `Node`: Servidor VPS registrado en el pool o dedicado (`id`, `name`, `ipAddress`, `role`, `status`, `totalCpuMilli`, `totalMemoryMb`, `reservedCpuMilli`, `reservedMemoryMb`, `assignedTenantId`).
- `ProvisioningJob`: Trabajo asíncrono de orquestación de provisión (`id`, `orderId`, `entitlementId`, `status`, `steps`, `attempts`, `errorLog`).

---

## 6. Módulos comerciales (Commerce & Billing)

### 6.1 Catálogo de productos y planes (Product Catalog)
- **Versionamiento obligatorio**: Los planes se versionan (`PlanVersion`). Si los precios o especificaciones cambian, se emite una nueva versión; los clientes existentes conservan la versión contratada hasta su renovación contractual expresa.
- **Independencia de proveedores**: El catálogo define capacidades comerciales abstractas, sin mencionar internamente ni acoplarse a HestiaCP, Dokploy o Contabo.

### 6.2 Registro y Onboarding de clientes (Customer Identity & Onboarding)
El flujo completo de incorporación consta de 9 pasos continuos:
1. **Selección de producto**: El usuario elige un plan en `velupi.com` o `app.velupi.com`.
2. **Creación de cuenta**: Registro con email, nombre y contraseña segura.
3. **Verificación de correo**: Envío de token de un solo uso para verificar titularidad del email.
4. **Datos de facturación**: Razón social / nombre, documento de identidad/NIT, dirección y país.
5. **Creación de organización**: Asignación automática o selección de la organización tenant correspondiente.
6. **Revisión de orden**: Resumen claro de conceptos, ciclo de cobro, impuestos aplicables y total.
7. **Aceptación contractual**: Checkbox explícito de Términos del Servicio y Política de Privacidad.
8. **Pasarela de pago**: Redirección o widget seguro hacia la pasarela autorizada.
9. **Dashboard inicial**: Acceso al panel con estado en tiempo real del aprovisionamiento.

*Regla*: El registro crea la identidad y la organización, pero **jamás aprovisiona recursos de infraestructura** sin una orden en estado `PAID` o una orden interna autorizada. Se debe implementar Rate Limiting y protección CAPTCHA/bot en endpoints de registro.

### 6.3 Checkout y Pasarela de pagos (`PaymentProvider`)
- **Diseño extensible**: Se define la interfaz unificada:
  ```ts
  interface PaymentProvider {
    name: string;
    createPaymentSession(order: Order, context: PaymentContext): Promise<PaymentSessionResult>;
    verifyWebhookSignature(payload: unknown, headers: Record<string, string>): boolean;
    parseWebhookEvent(payload: unknown): WebhookPaymentEvent;
    queryTransactionStatus(transactionId: string): Promise<PaymentStatusResult>;
  }
  ```
- **Wompi (Colombia)**: Primera pasarela implementada. Soporta tarjetas de crédito/débito, PSE, Nequi y corresponsales bancarios. Validación criptográfica de firmas de eventos (checksum HMAC SHA-256) antes de procesar cualquier webhook.
- **Preparación para Stripe**: Misma interfaz `PaymentProvider` para soporte multimoneda futuro (USD, EUR).
- **Invariantes de seguridad**:
  - Los precios y totales son calculados **exclusivamente por el backend**. Se descarta cualquier precio proveniente del cliente.
  - La confirmación de pago proviene **únicamente de webhooks firmados o consultas directas de servidor a servidor**. Jamás se confía en la pantalla de retorno del navegador.
  - No se almacenan números completos de tarjeta de crédito, CVV o datos sensibles de pago en la base de datos de Velupi.

### 6.4 Máquina de estados de Órdenes y Pagos
```text
[DRAFT] 
   | (checkout completado)
   v
[PENDING_PAYMENT] ----(pago fallido / expirado)----> [FAILED / CANCELLED]
   |
   | (webhook verificado: aprobado)
   v
[PAID] 
   | (disparo de Provisioning Orchestrator)
   v
[PROVISIONING]
   |
   +---> (éxito en despliegue) --------> [COMPLETED]
   |
   +---> (fallo irrecuperable) --------> [FAILED (requiere compensación/soporte)]
```

### 6.5 Ciclo de facturación, suspensiones y conciliación
- **Período de gracia**: Tras vencer una suscripción sin pago exitoso, la organización entra en estado `GRACE_PERIOD` (ej. 5 días naturales) con notificaciones automáticas antes de la suspensión.
- **Suspensión controlada**: En estado `SUSPENDED`, las cargas de trabajo se detienen (stop de contenedores o vhosts inactivos), pero **los datos, bases de datos y archivos se conservan íntegramente** durante un período de retención mínimo (ej. 30 días).
- **Reactivación**: La confirmación de pago de la factura vencida reactiva automáticamente los servicios sin pérdida de información.
- **Conciliación**: Jobs periódicos en segundo plano consultan transacciones en estado ambiguo (`PENDING_PAYMENT`) contra la API del proveedor para resolver cobros huérfanos.

---

## 7. Aprovisionamiento automático (Provisioning Orchestrator)

El orquestador de provisión es el puente transaccional desacoplado entre el sistema de cobro y los adaptadores de infraestructura:

```text
[ Pago Confirmado ] 
        |
        v
[ Crear / Activar CustomerEntitlement ]
        |
        v
[ Encolar ProvisioningJob en BullMQ ] (Idempotency Key = orderId + serviceCode)
        |
        v
+--------------------------------------------------------------+
| Máquina de Estados del ProvisioningJob:                      |
|                                                              |
| QUEUED -> VALIDATING -> ALLOCATING -> PROVISIONING           |
|        -> CONFIGURING -> VERIFYING -> ACTIVE                 |
|                                                              |
| (En caso de error en cualquier paso -> FAILED / COMPENSATING)|
+--------------------------------------------------------------+
        |
        +-- Si es WordPress/PHP    --> HestiaAdapter (Crea user, vhost, DB, SSL)
        +-- Si es Node/Python/App  --> DokployAdapter (Crea app Docker, env, ports)
        +-- Si es Dedicated VPS    --> ContaboAdapter (Solicita VM, bootstrap seguro)
        |
        v
[ Notificar al cliente y actualizar Dashboard a HEALTHY/ACTIVE ]
```

### Reglas de resiliencia del orquestador:
- **Idempotencia estricta**: Si un job de provisión se reintenta por desconexión transitoria, debe verificar si el recurso ya fue creado antes de intentar duplicarlo.
- **Acciones compensatorias**: Si la provisión falla a mitad de camino, se ejecuta una rutina de reversión controlada (rollback o liberación de cuotas reservadas) y se registra el evento en auditoría para intervención de soporte.

---

## 8. Cliente Piloto #001: Velupi

La marca Velupi y su sitio comercial actuarán como el **primer cliente real (#001)** de la plataforma, sirviendo como prueba de fuego en el entorno de producción.

### Distinción fundamental de entidades:
1. **Platform Operator**: Superadministrador del Control Plane de Velupi, responsable de la infraestructura global, inventario de nodos y métricas del sistema.
2. **Internal Customer Organization (`org-velupi-internal`)**: Organización de cliente regular perteneciente a Velupi, sujeta exactamente a las mismas reglas de aislamiento y cuotas que un cliente externo.

### Características del piloto:
- **Tipo de plan**: *Velupi Web Hosting* (Shared Cloud en HestiaCP).
- **Dominio**: `velupi.com` con SSL Let's Encrypt automático y registros DNS correspondientes.
- **Orden interna autorizada**: Se genera una orden con cupón de descuento 100% o tipo de transacción `INTERNAL_AUTHORIZED` (monto 0, sin invocar pasarela externa Wompi).
- **Mismo pipeline de provisión**: La orden transita por el `ProvisioningOrchestrator` estándar, invocando el `HestiaAdapter` y reportando estados en el panel de control.
- **Importación idempotente**: Si la cuenta Hestia o el dominio ya fueron configurados previamente a mano, el adaptador debe admitir importación y reconciliación idempotente sin errores de duplicación.
- **Sin privilegios especiales**: La organización `org-velupi-internal` no tiene acceso a datos de otros tenants ni privilegios de superadmin en el portal de clientes.

---

## 9. Interfaces orientativas (Técnicas y Comerciales)

### 9.1 Adaptadores de Despliegue e Infraestructura
```ts
export interface DeploymentProvider {
  capabilities(): Promise<DeploymentCapabilities>;
  deploy(spec: ServiceDeploymentSpec, context: AuthorizedContext): Promise<OperationReceipt>;
  stop(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt>;
  restart(serviceId: string, context: AuthorizedContext): Promise<OperationReceipt>;
  status(serviceId: string, context: AuthorizedContext): Promise<ObservedState>;
  logs(serviceId: string, context: AuthorizedContext, opts: LogQuery): Promise<LogPage>;
}

export interface InfrastructureProvider {
  listPlans(region?: string): Promise<InfrastructurePlan[]>;
  provision(request: ProvisionRequest, context: AuthorizedContext): Promise<OperationReceipt>;
  instanceStatus(providerInstanceId: string): Promise<InstanceState>;
}
```

### 9.2 Proveedor de Pagos y Pasarelas
```ts
export interface PaymentSessionResult {
  sessionId: string;
  checkoutUrl?: string;
  providerReference: string;
}

export interface WebhookPaymentEvent {
  providerReference: string;
  orderId: string;
  status: PaymentStatus;
  amountCents: number;
  currency: string;
  rawPayload: Record<string, unknown>;
}

export interface PaymentProvider {
  readonly name: string;
  createPaymentSession(order: Order, context: PaymentContext): Promise<PaymentSessionResult>;
  verifyWebhookSignature(payload: unknown, headers: Record<string, string>): boolean;
  parseWebhookEvent(payload: unknown): WebhookPaymentEvent;
}
```

---

## 10. Experiencia de Usuario: Portal y Microservices Studio

### 10.1 Panel del Cliente contextual
La interfaz de `app.velupi.com` adapta sus herramientas según el tipo de servicio contratado:
- **WordPress / PHP**: Panel Site Tools con accesos rápidos a administración PHP (versión, php.ini), bases de datos phpMyAdmin/MySQL, gestor de archivos, copias de seguridad automáticas y configuración SSL.
- **Node.js / Python / Apps**: Panel de aplicación con integración Git (repositorio, rama, autodeploy), variables de entorno con ocultación de secretos, consola de logs en tiempo real, métricas de consumo y botones de reinicio seguro.
- **VPS Dedicado**: Panel de servidor con gráficos de CPU/RAM/Disco, reinicio de máquina, acceso SSH autorizado por claves públicas y listado de servicios internos.
- **Facturación y Cuenta**: Historial de órdenes, descarga de facturas en PDF, gestión de métodos de pago y estado de suscripciones.

### 10.2 Microservices Studio
- **Lienzo gráfico**: Representación de nodos (Frontend, Backend, Bases de datos, Workers, Redis) y relaciones de dependencia/comunicación.
- **Manifiesto declarativo**: Generación de un archivo declarativo versionado (`velupi-manifest.yaml`) que describe la arquitectura completa.
- **Validación previa**: Detección de puertos conflictivos, variables faltantes, referencias circulares y cálculo de costo estimado antes de aprobar el despliegue.

---

## 11. Política de desarrollo obligatoria: TDD

### Ciclo RED → GREEN → REFACTOR
1. **RED**: Escribir primero la prueba automatizada que describa el comportamiento esperado y verificar que falle por la razón correcta. Registrar la evidencia del fallo.
2. **GREEN**: Implementar la solución mínima necesaria para que la prueba pase exitosamente, sin agregar código especulativo.
3. **REFACTOR**: Limpiar, optimizar y estructurar el código manteniendo todas las pruebas en verde y verificando el tipado estricto.
4. Ejecutar linters, typecheck y suites de pruebas antes de concluir cualquier ticket.
5. **Prohibido**: Escribir código de negocio sin pruebas previas; deshabilitar pruebas fallidas; mockear completamente la lógica del dominio; incorporar credenciales o llamadas a pasarelas reales en suites automatizadas.

### Batería obligatoria de casos de prueba (escribir ANTES de implementar)

#### Identity, Tenancy & Onboarding
- El registro de usuario crea la identidad y organización tenant en estado inactivo sin aprovisionar infraestructura.
- No se permiten emails duplicados ni registros con datos incompletos.
- Un usuario de Org A no puede leer ni modificar órdenes, facturas, servicios o logs de Org B.
- La vinculación de usuarios HestiaCP nunca otorga permisos superiores al rol de plataforma del usuario.

#### Checkout & Precios
- Los precios, totales e impuestos se calculan estrictamente en el backend.
- Se rechaza cualquier orden que intente alterar precios desde el payload del cliente.
- Los cupones de descuento expirados, agotados o no aplicables a un producto son rechazados.
- La orden registra de forma inmutable la versión del plan contratado (`PlanVersion`).

#### Pagos & Webhooks
- Una orden en `PENDING_PAYMENT` o `FAILED` no activa derechos ni genera jobs de aprovisionamiento.
- Webhooks con firma criptográfica inválida o cabeceras faltantes son rechazados con código HTTP 400/401 y auditados.
- La recepción múltiple del mismo webhook de pago es procesada de forma idempotente, sin duplicar cobros ni aprovisionamientos.
- Los eventos recibidos fuera de orden no revierten una orden pagada a estado pendiente.

#### Provisioning Orchestrator & Deployment Router
- WordPress/PHP compartido selecciona por defecto `HestiaAdapter`.
- Node.js/Python/Docker selecciona por defecto `DokployAdapter`.
- Dedicated VPS solicita aprobación financiera y asigna el nodo exclusivamente a una sola organización.
- El reintento de un job de provisión no duplica recursos en el proveedor.
- Si no hay capacidad en el pool compartido, el servicio queda en estado `PENDING_CAPACITY` y notifica al operador.

#### Facturación & Suscripción
- La renovación periódica aplica el precio congelado en la versión del plan del contrato.
- Las órdenes internas del cliente piloto #001 (`Velupi`) aplican el flujo completo sin cobro financiero real.
- Las facturas son accesibles únicamente por miembros autorizados de la organización propietaria.

### Pruebas E2E obligatorias (Playwright / Testcontainers)
1. **E2E 1: WordPress Shared Hosting completo**: Registro de usuario → Selección de plan WordPress → Checkout Wompi simulado → Webhook aprobado → Despacho a HestiaCP fake → Generación de credenciales y vhost → Dashboard con Site Tools activo.
2. **E2E 2: Node.js Shared App**: Registro → Checkout simulado → Selección de repositorio Git → Asignación en `shared-node-01` → Dokploy fake → Dominio temporal `*.apps.velupi.com` → Logs en vivo.
3. **E2E 3: VPS Dedicado**: Selección de VPS → Orden y pago aprobado → Autorización administrativa → Contabo Adapter simulado → Registro del nodo y asignación exclusiva.
4. **E2E 4: Cliente Piloto Velupi #001**: Creación de orden interna autorizada → Aprovisionamiento de `velupi.com` en HestiaCP → Comprobación de idempotencia ante cuenta existente → Panel activo.
5. **E2E 5: Manejo de errores y recuperación**: Rechazo de pago en pasarela → Orden cancelada → No aprovisionamiento; Fallo simulado en adaptador de despliegue → Estado FAILED auditable con compensación.

---

## 12. Reglas de arquitectura, seguridad y compliance

- **Protección de datos de pago (PCI-DSS Lite)**: Velupi nunca procesa, transmite ni almacena datos completos de tarjetas de crédito o códigos de seguridad CVV. Toda interacción financiera se delega a pasarelas tokenizadas (Wompi/Stripe).
- **Validación de webhooks**: Todo webhook financiero exige validación de firma HMAC con clave secreta compartida antes de procesar el cuerpo del mensaje.
- **Aislamiento multi-tenant**: Cada consulta SQL y mutación en el backend debe incorporar el filtro explícito `organizationId` obtenido de la sesión autenticada del token JWT, nunca confiando en parámetros suministrados por el cliente.
- **Gestión de secretos**: Las credenciales de acceso a HestiaCP, Dokploy, Contabo, Wompi y claves privadas SSH residen exclusivamente en variables de entorno seguras del servidor o gestores de secretos dedicados. Jamás se exponen en respuestas API, commits de Git ni logs.
- **Seguridad en contenedores**: Prohibido montar `/var/run/docker.sock` en contenedores de clientes y prohibido ejecutar contenedores en modo privilegiado por defecto.
- **Hermes AI Guard**: Hermes interactúa únicamente a través de endpoints seguros y auditados del Tool Gateway, con permisos de solo lectura y filtrado automático de secretos en logs.

---

## 13. Estructura sugerida del repositorio

```text
cloud-platform/
  AGENTS.md
  apps/
    web/                 # Portal de Clientes (Next.js + MUI — app.velupi.com)
    api/                 # Control Plane API (NestJS — api.velupi.com)
    worker/              # Procesamiento de colas BullMQ (Provisioning Jobs)
  packages/
    domain/              # Lógica pura de negocio, reglas de dominio y TDD
    contracts/           # DTOs, interfaces, eventos y tipos compartidos
    payment-adapters/    # Adaptadores de pasarelas (Wompi, Stripe)
    deployment-adapters/ # Adaptadores de motores (Hestia, Dokploy, K3s)
    infrastructure/      # Adaptadores de IaaS (Contabo)
    ui/                  # Componentes reutilizables de UI
  infra/
    local/               # Docker Compose para desarrollo local (Postgres, Redis)
    provisioning/        # Scripts de bootstrap seguro y hardening para VPS
  tests/
    e2e/                 # Pruebas integrales de flujo completo (Playwright)
    contract/            # Pruebas de contrato y fixtures de proveedores
```

---

## 14. Flujo de trabajo para agentes (obligatorio)

1. Leer `AGENTS.md` y verificar el estado real del repositorio antes de iniciar cualquier desarrollo.
2. Seleccionar una única tarea del backlog priorizado; definir hipótesis y criterios de aceptación.
3. Escribir primero las pruebas **RED** cubriendo casos exitosos y casos de error/seguridad cross-tenant.
4. Implementar el código mínimo **GREEN** para superar las pruebas.
5. Ejecutar **REFACTOR**, verificando que `pnpm typecheck`, `pnpm test` y linters pasen al 100%.
6. Entregar evidencia completa (salidas de tests y diffs) en cada interacción.
7. No ejecutar compras reales, cobros en pasarelas reales ni despliegues destructivos en producción sin autorización explícita.

---

## 15. Backlog unificado del MVP (Orden y Prioridad TDD)

### Fase 1: Fundaciones y Gobernanza (Foundation)
- **A1**: Monorepo con pnpm workspaces, configuración de CI, TypeScript composite, Vitest y primer test RED/GREEN. *(Completado)*
- **A2**: Entidades de identidad, organizaciones, membresías, roles (RBAC) y auditoría con pruebas negativas cross-tenant. *(Completado)*
- **A3**: Modelado de Proyectos, Servicios y Catálogo de Runtimes.

### Fase 2: Módulos Comerciales y Facturación (Commerce & Billing)
- **COM-01**: Catálogo de productos, categorías, planes versionados (`PlanVersion`) y cuotas de recursos.
- **COM-02**: Módulo de Registro y Onboarding seguro de clientes (flujo de 9 pasos sin provisión prematura).
- **COM-03**: Carrito de compras, cálculo de impuestos y creación de órdenes inmutables.
- **COM-04**: Adaptador de pasarela Wompi en entorno sandbox (sesiones de pago y validación de firma HMAC).
- **COM-05**: Procesamiento idempotente de webhooks de pago y máquina de estados de órdenes.
- **COM-06**: Suscripciones recurrentes, períodos de gracia y ciclo de renovación.
- **COM-07**: Provisioning Orchestrator (consumo de eventos de órdenes pagadas y encolado en BullMQ).
- **COM-08**: Facturas inmutables y visualización en el portal del cliente.
- **COM-09**: Cliente Piloto Velupi #001 (orden interna a costo 0 y provisión de `velupi.com`).
- **COM-10**: Motor de cupones y promociones con validación de fechas y límites.
- **COM-11**: Suspensión temporal no destructiva y reactivación tras pago.
- **COM-12**: Integración entre el sitio comercial (`velupi.com`) y el flujo de checkout.

### Fase 3: Infraestructura y Adaptadores (Infrastructure & Providers)
- **B1**: Inventario de nodos, capacidades reales y heartbeats.
- **B2**: Scheduler determinista con reservas y cuotas de saturación.
- **B3**: Deployment Router y adaptadores simulados (fakes).
- **C1**: Adaptador HestiaCP (gestión de dominios, PHP, MySQL y SSL).
- **C2**: Adaptador Dokploy (gestión de aplicaciones Docker y logs).
- **C3**: Adaptador Contabo (catálogo y aprovisionamiento controlado de VPS dedicados).

### Fase 4: Experiencia de Usuario y Operaciones (UX & Operations)
- **D1**: Dashboard unificado (Cuenta → Proyecto → Servicio).
- **D2**: Site Tools contextuales (WordPress vs Apps).
- **D3**: Microservices Studio (modelado de grafos y exportación de manifiesto).
- **E1**: Telemetría, healthchecks y logs con aislamiento tenant.
- **E2**: Backups automatizados y pruebas de restauración en laboratorio.
- **E3**: Hermes Tool Gateway en modo solo lectura con auditoría.

*Prioridad inicial*: Consolidar el flujo comercial completo de **WordPress Shared Hosting (COM-01 a COM-09 con HestiaCP)** antes de abrir el catálogo a otros productos.

---

## 16. Escenarios E2E de referencia

1. **WordPress Compartido (Comercial)**: Usuario se registra en `velupi.com` → Elige plan WordPress → Paga con Wompi simulado → Webhook confirma pago → Orquestador reserva recursos en pool → HestiaCP crea cuenta y vhost → Site Tools en `app.velupi.com` muestra WordPress activo con SSL.
2. **Node.js Compartido**: Usuario conecta repositorio → Elige plan Cloud Apps → Pago simulado → Dokploy despliega en `shared-node-01` → Subdominio temporal en `*.apps.velupi.com` disponible.
3. **VPS Dedicado**: Usuario contrata VPS dedicado → Validación de pago y confirmación presupuestaria → Adaptador Contabo provisiona VM → Hardening automatizado y asignación exclusiva a la organización.
4. **Cliente Piloto Velupi #001**: Creación de orden interna sin pasarela → Despliegue de `velupi.com` en HestiaCP → Comprobación de que no se duplican recursos y que la operación queda auditada.
5. **Recuperación y Resiliencia**: Pago rechazado no genera orden activa; reintento de webhook no crea dobles servidores; fallo transitorio de proveedor entra en reintento exponencial con alerta auditable.

---

## 17. Convenciones y comunicación

- Código, identificadores, commits, documentación técnica interna y pruebas escritas en **inglés**.
- Documentación de cara al usuario final y de producto en **español**.
- Commits siguiendo convención Conventional Commits (`feat:`, `fix:`, `test:`, `docs:`, `chore:`).
- Ante cualquier duda arquitectónica, **la seguridad del cliente, el aislamiento de datos y la consistencia transaccional priman sobre la velocidad de entrega**.

---

## 18. Infraestructura inicial y repositorio

- **Repositorio de código**:
  - Remoto: `https://github.com/cloudfly2026-byte/hositng2026.git`
  - Rama por defecto: `main`

- **Servidor HestiaCP (Hosting PHP / WordPress / DNS & Nameservers)**:
  - **Host / FQDN**: `cloudfly.com.co`
  - **Rol**: Servidor HestiaCP de producción para sitios PHP, WordPress, bases de datos MariaDB y servidor de nombres DNS.
  - **Servidores de nombres (Nameservers)**:
    - `ns1.cloudfly.com.co`
    - `ns2.cloudfly.com.co`
  - **Dominio principal apuntado**: `velupi.com` (delegado en GoDaddy mediante custom nameservers hacia `ns1.cloudfly.com.co` y `ns2.cloudfly.com.co`).
  - **Usuario administrativo SSH**: `root`
  - **Gestión de acceso**: Credenciales y llaves SSH configuradas en el entorno local/servidor seguro (`.env`), protegidas de exposición en el repositorio público.

- **Primer nodo del pool de aplicaciones (`shared-node-01`)**:
  - **IP**: `169.58.220.244`
  - **Tipo de servidor**: `Cloud VPS 4 MP (2026)` (estado inicial: limpio / sin setup)
  - **Ubicación**: `Hub Europe`
  - **Usuario administrativo SSH**: `root`
  - **Políticas de acceso**: Las credenciales y claves privadas SSH se configuran en el entorno local/CI mediante variables protegidas (`.env`, secret manager o SSH key exchange), garantizando que no se expongan ni se registren en commits públicos.
