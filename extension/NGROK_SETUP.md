# 🔧 Configuración de ngrok para la Extensión

## Pasos para Configurar la URL Pública

### 1. Iniciar ngrok

Ejecuta en una terminal:

```bash
ngrok http 8080
```

### 2. Copiar la URL HTTPS

Ngrok mostrará algo como:

```
Forwarding    https://abc123.ngrok.io -> http://localhost:8080
              ^^^^^^^^^^^^^^^^^^^^^^
              COPIA ESTA URL
```

### 3. Actualizar la Configuración de la Extensión

**Opción A: Desde el código (antes de build)**

Edita `extension/config.js` y actualiza `PUBLIC_URL`:

```javascript
const EXTENSION_CONFIG = {
  PUBLIC_URL: 'https://abc123.ngrok.io', // Cambia esto a tu URL de ngrok
  SETTINGS_ROUTE: '/#settings',
};
```

Luego reconstruye la extensión.

**Opción B: Desde el almacenamiento de Chrome (después de build)**

1. Abre la extensión en Chrome
2. Abre las herramientas de desarrollador (F12)
3. Ve a la pestaña "Console"
4. Ejecuta:

```javascript
chrome.storage.local.set({ coga_public_url: 'https://abc123.ngrok.io' });
```

### 4. Verificar

1. Abre cualquier página web
2. Haz clic en el ícono de configuración del widget
3. Debe abrirse: `https://abc123.ngrok.io/#settings`

## Notas Importantes

- La URL de ngrok cambia cada vez que reinicias ngrok (plan gratuito)
- Si cambias la URL de ngrok, actualiza `coga_public_url` en el almacenamiento
- Para producción con dominio personalizado, usa esa URL en lugar de ngrok

