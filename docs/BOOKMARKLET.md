# 📖 COGA Bookmarklet - Guía Completa

## 🎯 Descripción

El widget COGA (solo el círculo de colores y las intervenciones) puede ser inyectado en **cualquier página web** usando un bookmarklet. Esto permite monitorear tu nivel de estrés mientras navegas YouTube, Gmail, Facebook, o cualquier otro sitio.

## 🚀 Inicio Rápido

### Opción 1: Testing Local (HTTP)

Para probar en sitios HTTP locales:

```bash
# 1. Construir el proyecto
npm run build

# 2. Iniciar el servidor
npm run serve

# 3. Visita http://localhost:8080
# 4. Arrastra el botón "Load COGA" a tu barra de marcadores
# 5. Ve a cualquier sitio HTTP y haz clic en el bookmark
```

**⚠️ Limitación:** Solo funciona en sitios **HTTP**, no en sitios HTTPS (YouTube, Gmail, Facebook, etc.) debido a restricciones de seguridad del navegador (mixed content).

---

### Opción 2: Testing Público con ngrok (HTTPS) ⭐ RECOMENDADO

Para probar en **cualquier sitio web**, incluyendo HTTPS:

#### Paso 1: Instalar ngrok

```bash
# Opción A: Via npm
npm install -g ngrok

# Opción B: Descarga directa
# Visita: https://ngrok.com/download
```

#### Paso 2: Construir el proyecto

```bash
npm run build
```

#### Paso 3: Iniciar servidor + ngrok

**En Windows:**
```batch
start-ngrok.bat
```

**En Linux/Mac:**
```bash
chmod +x start-ngrok.sh
./start-ngrok.sh
```

**O manualmente:**
```bash
# Terminal 1: Iniciar servidor
npm run serve

# Terminal 2: Iniciar ngrok
ngrok http 8080
```

#### Paso 4: Obtener URL pública

Ngrok mostrará algo como:

```
Forwarding  https://abc123.ngrok.io -> http://localhost:8080
```

#### Paso 5: Configurar bookmarklet

1. **Copia la URL HTTPS** de ngrok (ej: `https://abc123.ngrok.io`)
2. **Visita esa URL** en tu navegador
3. **Arrastra el botón** "Load COGA" a tu barra de marcadores
4. **Listo!** Ahora puedes usarlo en cualquier sitio

#### Paso 6: Probar

1. Ve a **YouTube** (https://youtube.com)
2. Haz clic en el bookmark "Load COGA"
3. ¡El widget debería aparecer! 🎉

---

## 🔧 Cómo Funciona

### El Bookmarklet

El bookmarklet es un pequeño fragmento de JavaScript que:

```javascript
javascript:(function(){
  // Verifica si ya está cargado
  if(window.COGA){
    alert('✅ COGA is already loaded on this page!');
    return;
  }
  
  // Crea un elemento script
  const s = document.createElement('script');
  s.src = 'https://YOUR-NGROK-URL.ngrok.io/coga.min.js';
  s.onload = () => console.log('[COGA] Successfully loaded');
  s.onerror = () => alert('❌ Error loading COGA');
  
  // Lo inyecta en la página
  document.head.appendChild(s);
})();
```

### ¿Qué se inyecta?

**Solo el widget y las intervenciones:**
- ✅ Círculo de colores (green/blue/yellow/orange/red)
- ✅ Panel expandible con métricas
- ✅ Intervenciones (Box Breathing, Eye Rest, Micro-Break)
- ✅ Sistema de detección de estrés

**NO se inyecta:**
- ❌ La página de test/demo
- ❌ HTML extra innecesario

### Compatibilidad

- ✅ **HTTP:** Funciona con localhost
- ✅ **HTTPS:** Funciona con ngrok o servidor HTTPS
- ✅ **CORS:** Habilitado para todos los orígenes
- ✅ **Navegadores:** Chrome, Firefox, Edge, Safari

---

## 📱 Testing en Diferentes Sitios

### Sitios Recomendados para Testing

1. **YouTube** - `https://youtube.com`
   - Bueno para probar durante videos
   - Detecta estrés por scroll rápido

2. **Gmail** - `https://gmail.com`
   - Prueba durante escritura de emails
   - Detecta typing rápido y backspaces

3. **Facebook** - `https://facebook.com`
   - Scroll infinito
   - Muchas interacciones

4. **Reddit** - `https://reddit.com`
   - Bueno para testing de lectura

5. **Twitter/X** - `https://twitter.com`
   - Scroll rápido
   - Muchos clicks

### Cómo Probar el Widget

1. **Carga el bookmark** en el sitio
2. **Espera la calibración** (3 minutos la primera vez)
3. **Genera actividad:**
   - Escribe rápido en campos de texto
   - Haz scroll rápido
   - Haz clicks repetidos
   - Usa backspace frecuentemente
4. **Observa el widget:**
   - Verde = Sin estrés
   - Azul = Normal
   - Amarillo = Elevado
   - Naranja = Alto
   - Rojo = Crítico
5. **Espera una intervención** cuando el nivel suba

---

## 🐛 Troubleshooting

### El widget no aparece

**Problema:** Haces clic en el bookmark pero no pasa nada.

**Soluciones:**
1. Abre la consola del navegador (F12)
2. Busca errores con `[COGA]`
3. Verifica que el servidor esté corriendo
4. Confirma que la URL en el bookmark sea correcta

### Error: "Failed to load script"

**Problema:** Mixed content (HTTP en sitio HTTPS)

**Solución:** Usa ngrok para tener HTTPS:
```bash
ngrok http 8080
```

### El widget no detecta estrés

**Problema:** El círculo se mantiene verde/azul.

**Soluciones:**
1. Completa la calibración de 3 minutos primero
2. Genera más actividad (typing rápido, clicks, scroll)
3. Baja la sensibilidad:
   ```javascript
   window.COGA.setSensitivity('high')
   ```

### Ngrok URL expira

**Problema:** La URL de ngrok cambia cada vez.

**Solución (gratis):** 
- Acepta que la URL cambia cada reinicio
- Actualiza el bookmark con la nueva URL

**Solución (con cuenta):**
1. Crea cuenta en ngrok.com
2. Usa dominio fijo: `ngrok http 8080 --domain=your-domain.ngrok.io`

### El servidor no inicia

**Error:** `EADDRINUSE` (puerto en uso)

**Solución:**
```bash
# Windows
netstat -ano | findstr :8080
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8080 | xargs kill -9
```

---

## 🔒 Seguridad y Privacidad

### ¿Es seguro?

- ✅ **Open Source:** Todo el código es visible
- ✅ **Sin backend:** No hay servidor externo
- ✅ **Sin PII:** No se recopila información personal
- ✅ **Local Storage:** Datos guardados solo en tu navegador
- ✅ **Sin tracking:** No hay analytics externos

### ¿Qué datos se guardan?

**Localmente en tu navegador:**
- Baseline de calibración (anónimo)
- Métricas de estrés (sin contexto de página)
- Historial de intervenciones (sin detalles personales)

**NO se guarda:**
- ❌ URLs visitadas
- ❌ Contenido de páginas
- ❌ Texto escrito
- ❌ Contraseñas
- ❌ Datos personales

---

## 🎨 Personalización

### Ajustar sensibilidad

```javascript
// En la consola del navegador
window.COGA.setSensitivity('low')    // Menos intervenciones
window.COGA.setSensitivity('medium') // Balanceado (default)
window.COGA.setSensitivity('high')   // Más intervenciones
```

### Desactivar intervenciones

```javascript
// Desactivar temporalmente
window.COGA.setEnabled(false)

// Reactivar
window.COGA.setEnabled(true)
```

### Ver estadísticas

```javascript
// Estado actual
window.COGA.getStatus()

// Estadísticas detalladas
await window.COGA.getStatistics()
```

### Resetear todo

```javascript
// Borrar datos y reiniciar
await window.COGA.reset()
location.reload() // Recargar página
```

---

## 📊 Comandos de Consola

### Debug útiles

```javascript
// Ver si COGA está cargado
window.COGA

// Estado completo
console.log(JSON.stringify(window.COGA.getStatus(), null, 2))

// Historial de estrés
window.COGA.stressDetector.getHistory()

// Verificar si está en snooze
window.COGA.interventionManager.annoyanceRules.isSnoozed()

// Forzar intervención (para testing)
    window.COGA.interventionManager.showIntervention('oneBreathReset')
```

---

## 🚀 Próximos Pasos

### Phase 2 (Planificado)
- [ ] Más intervenciones (6 total)
- [ ] Chrome Extension (no necesita bookmarklet)
- [ ] Baselines contextuales (mañana/tarde/noche)
- [ ] Dashboard de insights

### Phase 3 (Futuro)
- [ ] Integración con Whoop
- [ ] Features de equipo
- [ ] API backend
- [ ] Sincronización cross-device

---

## 💡 Tips y Trucos

### Mejor experiencia

1. **Calibración limpia:** En la primera carga, navega normalmente durante 3 minutos
2. **Testing:** Usa `setSensitivity('high')` para ver intervenciones más rápido
3. **Múltiples tabs:** COGA funciona independiente en cada pestaña
4. **Privacidad:** Usa modo incógnito para testing sin afectar datos guardados

### Para desarrollo

```bash
# Build + Watch + Serve simultáneo
# Terminal 1
npm run watch

# Terminal 2
npm run serve

# Terminal 3
ngrok http 8080
```

---

## 📞 Soporte

### Logs de Debug

Todos los logs empiezan con `[COGA]`:

```javascript
// Activar logs verbose (si existe)
localStorage.setItem('COGA_DEBUG', 'true')
```

### Reportar Issues

Si encuentras un problema:
1. Abre consola del navegador (F12)
2. Reproduce el problema
3. Copia los logs con `[COGA]`
4. Incluye versión del navegador y URL donde ocurre

---

## ✅ Checklist de Testing

Antes de considerar completo:

- [ ] Widget aparece en YouTube (HTTPS)
- [ ] Widget aparece en Gmail (HTTPS)
- [ ] Calibración completa funciona (3 min)
- [ ] Detección de estrés cambia colores
- [ ] Las 3 intervenciones se muestran correctamente
- [ ] Box Breathing animation funciona
- [ ] Eye Rest timer funciona
- [ ] Micro-Break suggestions visibles
- [ ] Panel expandible muestra métricas
- [ ] Widget es draggable
- [ ] Dismiss/Complete interventions funciona
- [ ] Cooldown de 8 minutos se respeta
- [ ] Comandos de consola funcionan
- [ ] Reset limpia todos los datos

---

**Version:** 0.1.0  
**Última actualización:** Octubre 2024  
**Status:** ✅ Listo para Testing

