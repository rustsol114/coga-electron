# 🎉 ¡COGA Widget Listo para Usar!

## ✅ Estado Actual

```
✅ Proyecto construido exitosamente
✅ Servidor corriendo en http://localhost:8080
✅ Script disponible: coga.min.js (91 KB)
✅ CORS habilitado para todos los sitios
✅ Listo para inyectar en cualquier página web
```

---

## 🚀 Empezar AHORA (2 Opciones)

### 🔵 Opción A: Testing Rápido (Solo HTTP)

**Tiempo: 1 minuto**

1. Abre tu navegador
2. Ve a: **`http://localhost:8080`**
3. Arrastra el botón morado a tu barra de marcadores
4. Ve a cualquier sitio HTTP y haz clic en el bookmark

**⚠️ Limitación:** No funciona en sitios HTTPS (YouTube, Gmail, etc.)

---

### ⭐ Opción B: Testing Real (Incluye HTTPS) - RECOMENDADO

**Tiempo: 5 minutos**

#### 1️⃣ Instalar ngrok

```bash
npm install -g ngrok
```

O descarga desde: https://ngrok.com/download

#### 2️⃣ Abrir una NUEVA terminal

**Windows (CMD o PowerShell):**
```bash
cd C:\Users\sauls\Documents\Free-lancer\coga-mvp
ngrok http 8080
```

**O usa el script helper:**
```bash
start-ngrok.bat
```

#### 3️⃣ Copiar la URL HTTPS

Verás algo como:
```
Forwarding    https://abc123.ngrok.io -> http://localhost:8080
              ^^^^^^^^^^^^^^^^^^^^^^
              COPIA ESTA URL
```

#### 4️⃣ Abrir la URL en tu Navegador

1. Pega la URL de ngrok en tu navegador
2. Verás la página de COGA con el botón morado
3. **Arrastra el botón** a tu barra de marcadores

#### 5️⃣ ¡Probar!

**Ve a YouTube:**
1. Abre https://youtube.com
2. Haz clic en tu bookmark "Load COGA"
3. ¡El widget debería aparecer en la esquina! 🎉

**Prueba también:**
- Gmail (https://gmail.com)
- Facebook (https://facebook.com)
- Twitter (https://twitter.com)
- Reddit (https://reddit.com)
- Cualquier sitio web

---

## 🎮 Cómo Usar el Widget

### Primera Vez

1. **Calibración (3 minutos):**
   - El widget mostrará un círculo con progreso
   - Navega normalmente durante estos 3 minutos
   - Después, la detección estará activa

2. **Observa el Color:**
   - 🟢 Verde = Sin estrés
   - 🔵 Azul = Normal
   - 🟡 Amarillo = Elevado
   - 🟠 Naranja = Alto
   - 🔴 Rojo = Crítico

3. **Haz Clic en el Círculo:**
   - Ver métricas detalladas
   - Cambiar configuración
   - Ver estadísticas

### Generar Estrés (Para Testing)

Para ver las intervenciones más rápido:

1. **Escribe muy rápido** en cualquier campo de texto
2. **Borra con backspace** muchas veces
3. **Haz scroll** muy rápido
4. **Haz clicks** repetidos en el mismo lugar
5. **Mueve el mouse** muy rápido

### Intervenciones

Cuando el estrés suba, verás:

1. **🫁 Box Breathing** - Respiración 4-4-4-4
2. **👁️ Eye Rest** - Descanso visual 20-20-20
3. **🧘 Micro-Break** - Pausa de 30 segundos

---

## 🔧 Comandos Útiles (Consola del Navegador)

Presiona **F12** en el sitio donde cargaste el widget y usa:

```javascript
// Ver estado
window.COGA.getStatus()

// Ver estadísticas
await window.COGA.getStatistics()

// Más intervenciones (para testing)
await window.COGA.setSensitivity('high')

// Menos intervenciones
await window.COGA.setSensitivity('low')

// Desactivar temporalmente
await window.COGA.setEnabled(false)

// Resetear todo
await window.COGA.reset()
```

---

## 📊 Servidores Activos

### Terminal 1 (Ya corriendo):
```
COGA Server
http://localhost:8080
```

### Terminal 2 (Abrir para ngrok):
```bash
ngrok http 8080
```

---

## 🐛 Problemas?

### El widget no aparece

1. Abre la consola (F12)
2. Busca errores con `[COGA]`
3. Verifica que el bookmark apunte a la URL correcta

### "Error loading COGA"

- Verifica que `npm run serve` esté corriendo
- Si usas ngrok, asegúrate que la terminal de ngrok esté activa

### El círculo no cambia de color

- Espera 3 minutos para la calibración
- Genera más actividad (typing rápido, clicks)
- Baja la sensibilidad: `window.COGA.setSensitivity('high')`

### Ngrok URL cambia cada vez

- Es normal en la versión gratuita
- Actualiza el bookmark con la nueva URL
- O crea una cuenta en ngrok para URL fija

---

## 📚 Más Información

- **Guía rápida:** `INSTRUCCIONES-RAPIDAS.md`
- **Guía completa:** `BOOKMARKLET.md`
- **Documentación:** `README.md`
- **Resumen técnico:** `DEPLOYMENT-SUMMARY.md`

---

## ✅ Checklist

- [ ] Servidor corriendo (http://localhost:8080) ✅
- [ ] Build completado ✅
- [ ] Ngrok instalado
- [ ] Ngrok corriendo (opcional, solo para HTTPS)
- [ ] Bookmark creado
- [ ] Probado en al menos 1 sitio
- [ ] Widget aparece correctamente
- [ ] Calibración completada
- [ ] Intervención probada

---

## 🎯 Siguiente Paso

### Ahora mismo:

```
1. Abre tu navegador
2. Ve a http://localhost:8080 (o la URL de ngrok si ya lo iniciaste)
3. Arrastra el botón morado
4. Ve a YouTube y haz clic en el bookmark
5. ¡Disfruta! 🎉
```

---

**¿Listo?** 🚀

**Para HTTP:**  → `http://localhost:8080`

**Para HTTPS:** → Abre nueva terminal → `ngrok http 8080` → Copia URL HTTPS

---

**Estado:** ✅ TODO LISTO  
**Fecha:** Octubre 28, 2024  
**Version:** 0.1.0

