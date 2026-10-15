# GUÍA DE INSTALACIÓN Y DESPLIEGUE EN HESTIACP

Esta guía describe el procedimiento estándar para desplegar **Sunchi Theme** y **Sunchi Velupi Bridge** en un entorno WordPress alojado sobre HestiaCP (VPS `89.117.147.134` o dominio comercial designado).

---

## 1. Empaquetado de Entregables (ZIP)

Desde la terminal local en la raíz del proyecto:

```powershell
# Empaquetar Tema Sunchi
Compress-Archive -Path wordpress/themes/sunchi-theme/* -DestinationPath wordpress/sunchi-theme.zip -Force

# Empaquetar Plugin Bridge
Compress-Archive -Path wordpress/plugins/sunchi-velupi-bridge/* -DestinationPath wordpress/sunchi-velupi-bridge.zip -Force
```

---

## 2. Opciones de Instalación en HestiaCP

### Opción A: Instalación en Dominio Existente (`velupi.com`)
Si se autoriza utilizar la cuenta `velupi` (`/home/velupi/web/velupi.com/public_html`):

1. **Descargar e instalar WordPress core mediante WP-CLI**:
   ```bash
   cd /home/velupi/web/velupi.com/public_html
   wp core download --locale=es_CO --allow-root
   wp config create --dbname=velupi_wp --dbuser=velupi_wpuser --dbpass="[DB_PASSWORD]" --allow-root
   wp core install --url="https://velupi.com" --title="Sunchi Hosting" --admin_user="sunchi_admin" --admin_password="[ADMIN_PASSWORD]" --admin_email="admin@velupi.com" --allow-root
   ```

2. **Copiar o descomprimir el tema y plugin**:
   ```bash
   # Copiar tema a wp-content/themes/sunchi-theme
   cp -r /path/to/sunchi-theme /home/velupi/web/velupi.com/public_html/wp-content/themes/
   # Copiar plugin a wp-content/plugins/sunchi-velupi-bridge
   cp -r /path/to/sunchi-velupi-bridge /home/velupi/web/velupi.com/public_html/wp-content/plugins/
   ```

3. **Activar Tema y Plugin**:
   ```bash
   wp theme activate sunchi-theme --allow-root
   wp plugin activate sunchi-velupi-bridge --allow-root
   ```

4. **Configurar Páginas Clave**:
   - Crear página de Inicio (usando front-page.php).
   - Crear página `/precios/` asignando la plantilla `template-precios.php`.
   - Asignar en Ajustes de Lectura: Portada estática $\rightarrow$ Inicio.

### Opción B: Aprovisionamiento de Dominio Independiente (`sunchi.com`)
1. Crear el usuario o dominio en HestiaCP:
   ```bash
   v-add-web-domain sunchi sunchi.com
   v-add-letsencrypt-domain sunchi sunchi.com
   ```
2. Instalar WordPress y activar el tema `sunchi-theme` siguiendo los mismos pasos.

---

## 3. Verificación Post-Despliegue

1. **Resolución de Assets**: Comprobar que `logo.png`, `main.css` y `main.js` responden con código `200 OK`.
2. **Interactividad**:
   - El toggle de facturación cambia los valores entre \$3.59/\$2.99 y actualiza los enlaces CTA con `cycle=MONTHLY` o `cycle=ANNUAL`.
   - Los acordeones de preguntas frecuentes abren y cierran sin errores en consola JS.
3. **Redirección a Velupi**:
   - Al pulsar "Comenzar ahora", el usuario es llevado a `https://app.velupi.com/cart?plan=...&cycle=...` con el plan seleccionado.
