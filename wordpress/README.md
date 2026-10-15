# SUNCHI WORDPRESS THEME & VELUPI CLOUD PLATFORM BRIDGE

Este directorio contiene el tema comercial oficial **Sunchi Theme (`sunchi-theme`)** y el plugin conector **Sunchi Velupi Bridge (`sunchi-velupi-bridge`)**, desarrollados bajo estrictos lineamientos de diseño, accesibilidad WCAG 2.2 AA, responsive mobile-first y arquitectura Zero-Trust.

---

## 1. Identidad de Marca y Sistema de Diseño

### Paleta de Colores Oficial
```css
:root {
  --sunchi-primary: #FF6B00;
  --sunchi-primary-dark: #E85A00;
  --sunchi-orange-light: #FF9100;
  --sunchi-yellow: #FFB800;
  --sunchi-yellow-light: #FFD54A;
  --sunchi-dark: #2D1B17;
  --sunchi-text: #344054;
  --sunchi-background: #FFFFFF;
  --sunchi-cream: #FFF8ED;
  --sunchi-border: #F2E8DC;
  --sunchi-success: #16A34A;
}
```

### Tipografía
- **Títulos y encabezados**: `Poppins` (pesos 600, 700, 800)
- **Cuerpo y textos**: `Inter` (pesos 400, 500, 600, 700)

### Logotipo Oficial
- Ubicado en: `assets/images/logo.png` (derivado directamente del isotipo oficial de Sunchi en `images/Logotipo.png`).

---

## 2. Estructura de Archivos del Tema (`sunchi-theme`)

```text
wordpress/themes/sunchi-theme/
├── style.css                     # Metadatos del tema y variables CSS globales
├── functions.php                 # Enqueue, menus, customizer y helpers de checkout
├── header.php                    # Cabecera sticky, logo, menú principal y CTAs Velupi
├── footer.php                    # Pie de página, enlaces, formulario y copyright
├── front-page.php                # Landing principal fiel a la Imagen 2
├── template-precios.php          # Página de planes y tabla comparativa fiel a la Imagen 1
├── page-hosting.php              # Plantilla dedicada para Web Hosting
├── page-wordpress.php            # Plantilla dedicada para WordPress Hosting
├── page-cloud-apps.php           # Plantilla dedicada para Cloud Apps (Node/Python)
├── page-vps.php                  # Plantilla dedicada para VPS Dedicado
├── page-contacto.php             # Plantilla de contacto y soporte
├── index.php                     # Plantilla de archivo y blog
├── page.php                      # Plantilla genérica para páginas estáticas
├── single.php                    # Plantilla de artículos individuales
├── 404.php                       # Página de error 404 amigable
└── assets/
    ├── css/
    │   └── main.css              # Sistema modular responsive y accesible
    ├── js/
    │   └── main.js               # Switcher de facturación, acordeones FAQ y menú móvil
    └── images/
        └── logo.png              # Logotipo oficial Sunchi en alta resolución (RGBA)
```

---

## 3. Conector Transaccional (`sunchi-velupi-bridge`)

Plugin complementario para enlazar WordPress con el Control Plane de Velupi:
- **Endpoints de Conexión**:
  - API de catálogo: `https://api.velupi.com/catalog/plans`
  - Checkout transaccional: `https://app.velupi.com/cart`
- **Caché Eficiente**: Los planes se almacenan en `transients` de WordPress por 1 hora, evitando sobrecarga sobre la API.
- **Validación Zero-Trust**:
  - No permite manipulación de precios desde el cliente o WordPress.
  - Genera enlaces canónicos hacia el checkout: `https://app.velupi.com/cart?plan=<slug>&cycle=<cycle>`.
  - Los ciclos permitidos están estrictamente tipados (`MONTHLY`, `QUARTERLY`, `SEMI_ANNUAL`, `ANNUAL`, `BIENNIAL`).
- **Shortcodes Disponibles**:
  - `[sunchi_checkout_button plan="wp-starter" cycle="ANNUAL" text="Comenzar ahora"]`

---

## 4. Flujo de Compra e Integración

$$\text{Visitante en Sunchi} \xrightarrow{\text{Selección de Plan}} \text{https://app.velupi.com/cart?plan=...&cycle=...} \xrightarrow{\text{Login / Registro}} \text{Checkout Wompi} \xrightarrow{\text{Provisión BullMQ}} \text{Dashboard}$$

1. El usuario navega en Sunchi (`/` o `/precios/`).
2. Elige ciclo (Mensual o Anual con 20% de descuento).
3. Hace clic en "Comenzar ahora".
4. Es redirigido al carrito oficial de Velupi con preservación del identificador de plan.
5. El backend de Velupi valida el plan, versionamiento y calcula impuestos (19% IVA).
6. El usuario completa el checkout fiscal e inicia el pago en Wompi Sandbox/Producción.
