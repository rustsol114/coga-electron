# 🚀 Guía Rápida - COGA Widget en Cualquier Página

## ✅ Estado Actual

El servidor está corriendo y listo. El widget puede ser inyectado en cualquier página web.

## 🎯 Objetivo

Hacer que el widget COGA (círculo de colores + intervenciones) aparezca en **YouTube, Gmail, Facebook, y cualquier sitio web** cuando hagas clic en un bookmark.

---

## 📍 Opción 1: Testing Local (HTTP) - Sitios Locales

### Paso 1: El servidor ya está corriendo ✅
```
✅ http://localhost:8080 está activo
✅ CORS habilitado para todos los orígenes
✅ Script disponible: /coga.min.js (91 KB)
```

### Paso 2: Obtener el Bookmarklet

1. **Abre tu navegador**
2. **Ve a:** `http://localhost:8080`
3. **Arrastra** el botón morado "🧘 Load COGA" a tu barra de marcadores

### Paso 3: Probar

1. Ve a cualquier sitio **HTTP** (ejemplo: `http://example.com`)
2. Haz clic en el bookmark "Load COGA"
3. ¡El widget debería aparecer! 🎉

### ⚠️ Limitación

Solo funciona en sitios **HTTP**. No funcionará en:
- ❌ YouTube (HTTPS)
- ❌ Gmail (HTTPS)
- ❌ Facebook (HTTPS)
- ❌ La mayoría de sitios modernos (usan HTTPS)

**Solución:** Usa la Opción 2 con ngrok

---

## 🌐 Opción 2: Testing Público con ngrok (HTTPS) ⭐ RECOMENDADO

Esta opción permite que el widget funcione en **TODOS los sitios web**, incluyendo YouTube, Gmail, Facebook, etc.

### Paso 1: Instalar ngrok

**Opción A - Con npm (recomendado):**
```bash
npm install -g ngrok
```

**Opción B - Descarga manual:**
1. Ve a: https://ngrok.com/download
2. Descarga la versión para Windows
3. Extrae el archivo `ngrok.exe`
4. Agrega la carpeta al PATH o copia ngrok.exe a `C:\Windows\System32\`

### Paso 2: Iniciar ngrok

**En una nueva terminal (cmd o PowerShell):**

```bash
ngrok http 8080
```

Verás algo como esto:

```
ngrok

Session Status                online
Account                       Free (Sign up...)
Version                       3.x.x
Region                        United States (us)
Latency                       50ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:8080

Connections                   ttl     opn     rt1     rt5     p50     p90
                              0       0       0.00    0.00    0.00    0.00
```

### Paso 3: Copiar la URL HTTPS

**Importante:** Copia la URL que empieza con `https://` (ejemplo: `https://abc123.ngrok.io`)

### Paso 4: Obtener el Bookmarklet

1. **Abre tu navegador**
2. **Ve a la URL de ngrok** (ejemplo: `https://abc123.ngrok.io`)
3. **Arrastra** el botón "🧘 Load COGA" a tu barra de marcadores

### Paso 5: ¡Probar en Cualquier Sitio!

Ahora puedes ir a **cualquier sitio web** y usar el bookmark:

#### Sitios Recomendados para Testing:

1. **YouTube** - `https://youtube.com`
   - Abre un video
   - Haz clic en el bookmark
   - ¡El widget aparece! 🎉

2. **Gmail** - `https://gmail.com`
   - Abre tu email
   - Haz clic en el bookmark
   - Escribe rápido para generar estrés

3. **Facebook** - `https://facebook.com`
   - Navega el feed
   - Activa el bookmark
   - Scroll rápido para probar

4. **Cualquier sitio** - Funciona en todos

---

## 🎮 Cómo Usar el Widget

### Primera Vez (Calibración)

1. **Carga el bookmark** en cualquier sitio
2. **Espera 3 minutos** - El widget mostrará progreso
3. **Navega normalmente** durante la calibración
4. Después de 3 minutos, la detección de estrés estará activa

### Generar Estrés para Testing

Para ver las intervenciones más rápido:

1. **Escribe muy rápido** en cualquier campo de texto
2. **Usa backspace** frecuentemente
3. **Haz scroll rápido** hacia arriba y abajo
4. **Haz clicks repetidos** en el mismo lugar
5. **Mueve el mouse** muy rápido

### Colores del Widget

- 🟢 **Verde** = Sin estrés / Relajado
- 🔵 **Azul** = Normal
- 🟡 **Amarillo** = Elevado
- 🟠 **Naranja** = Alto
- 🔴 **Rojo** = Crítico

### Intervenciones

Cuando el estrés suba, verás una de estas:

1. **Box Breathing** 🫁 - Ejercicio de respiración 4-4-4-4
2. **Eye Rest** 👁️ - Regla 20-20-20 para descanso visual
3. **Micro-Break** 🧘 - Pausa de 30 segundos para estirarte

---

## 🔧 Comandos Útiles

### En la Consola del Navegador (F12)

```javascript
// Ver estado actual
window.COGA.getStatus()

// Ver estadísticas
await window.COGA.getStatistics()

// Ajustar sensibilidad (ver intervenciones más rápido)
await window.COGA.setSensitivity('high')   // Más intervenciones
await window.COGA.setSensitivity('medium') // Balanceado (default)
await window.COGA.setSensitivity('low')    // Menos intervenciones

// Desactivar temporalmente
await window.COGA.setEnabled(false)

// Reactivar
await window.COGA.setEnabled(true)

// Resetear todo y empezar de nuevo
await window.COGA.reset()
location.reload()
```

---

## 🐛 Problemas Comunes

### ❌ "Error loading COGA"

**Causa:** El servidor no está corriendo o la URL es incorrecta

**Solución:**
1. Verifica que `npm run serve` esté corriendo
2. Si usas ngrok, verifica que la URL en el bookmark sea la correcta
3. Chequea la consola del navegador (F12) para más detalles

### ❌ El widget no aparece

**Solución:**
1. Abre la consola (F12)
2. Busca mensajes con `[COGA]`
3. Intenta recargar la página y vuelve a hacer clic en el bookmark

### ❌ Mixed Content Error (HTTP en sitio HTTPS)

**Causa:** Estás usando localhost (HTTP) en un sitio HTTPS

**Solución:** Usa ngrok para obtener una URL HTTPS

### ❌ El widget no detecta estrés

**Solución:**
1. Espera a que complete la calibración (3 minutos)
2. Genera más actividad (typing rápido, scroll, clicks)
3. Baja la sensibilidad: `window.COGA.setSensitivity('high')`

### ❌ Ngrok dice "command not found"

**Solución Windows:**
```bash
# Opción 1: Instalar con npm
npm install -g ngrok

# Opción 2: Descargar manualmente
# Ve a https://ngrok.com/download y sigue las instrucciones
```

---

## 📊 Verificación de Funcionalidad

### Checklist de Testing:

- [ ] Servidor corriendo en `http://localhost:8080` ✅
- [ ] Build completado (`dist/coga.min.js` existe) ✅
- [ ] Página de bookmarklet carga (`http://localhost:8080`) ✅
- [ ] CORS habilitado (header `Access-Control-Allow-Origin: *`) ✅
- [ ] Bookmark creado en el navegador
- [ ] Widget aparece en una página de prueba HTTP
- [ ] Ngrok instalado (para HTTPS)
- [ ] Ngrok corriendo (`ngrok http 8080`)
- [ ] Bookmark actualizado con URL de ngrok
- [ ] Widget aparece en YouTube
- [ ] Widget aparece en Gmail
- [ ] Calibración de 3 minutos funciona
- [ ] Detección de estrés cambia colores
- [ ] Las 3 intervenciones se muestran correctamente
- [ ] Comandos de consola funcionan

---

## 🎯 Siguiente Paso AHORA

### Para Testing Local (HTTP):

```bash
# El servidor ya está corriendo ✅
# Solo ve a: http://localhost:8080
# Y arrastra el bookmark
```

### Para Testing Real (HTTPS en YouTube, Gmail, etc.):

**Abre una NUEVA terminal y ejecuta:**

```bash
# Windows
ngrok http 8080

# O usa el script helper
start-ngrok.bat
```

Luego:
1. Copia la URL HTTPS de ngrok
2. Visita esa URL en el navegador
3. Arrastra el nuevo bookmark
4. ¡Ve a YouTube y pruébalo!

---

## 📞 Ayuda Adicional

Para instrucciones más detalladas, ver:
- **BOOKMARKLET.md** - Guía completa en inglés
- **README.md** - Documentación general del proyecto

Para debugging:
- Todos los logs empiezan con `[COGA]`
- Usa `localStorage.setItem('COGA_DEBUG', 'true')` para más logs

---

**Status:** ✅ Listo para Testing  
**Servidor:** ✅ Corriendo en puerto 8080  
**Build:** ✅ Completado (91 KB)  
**CORS:** ✅ Habilitado  

**¡Todo está listo! 🎉**

