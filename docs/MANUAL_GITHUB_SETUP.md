# 📋 Guía Manual - Crear Repositorio GitHub y Push de Ramas

## Paso 1: Crear Repositorio en GitHub

1. Ve a **https://github.com/new**
2. Completa el formulario:
   - **Repository name**: `coga-mvp`
   - **Description**: `COGA MVP - Stress Detection & Intervention System`
   - **Visibility**: ✅ **Private** (importante)
   - **NO marques**: "Add a README file"
   - **NO marques**: "Add .gitignore"
   - **NO marques**: "Choose a license"
3. Click en **"Create repository"**

## Paso 2: Configurar Remote Local

Abre tu terminal en el directorio del proyecto y ejecuta:

```bash
# Verificar el remote actual
git remote -v

# Si no existe o está mal configurado, configúralo:
git remote remove origin
git remote add origin https://github.com/sfigueroa16/coga-mvp.git
```

## Paso 3: Hacer Push de Todas las Ramas

Ejecuta estos comandos en orden:

```bash
# 1. Push master branch
git checkout master
git push -u origin master

# 2. Push bookmarklet branch
git checkout bookmarklet
git push -u origin bookmarklet

# 3. Push extension branch
git checkout extension
git push -u origin extension

# 4. Volver a master
git checkout master
```

## Paso 4: Verificar

1. Ve a: **https://github.com/sfigueroa16/coga-mvp**
2. Verifica que aparezcan las 3 ramas:
   - `master`
   - `bookmarklet`
   - `extension`

## 🔐 Si Te Pide Autenticación

Si Git te pide usuario/contraseña, tienes 2 opciones:

### Opción A: Personal Access Token (Recomendado)

1. Ve a: **https://github.com/settings/tokens**
2. Click en **"Generate new token (classic)"**
3. Dale un nombre: `COGA MVP Local`
4. Selecciona el scope: ✅ **`repo`** (full control)
5. Click **"Generate token"**
6. **COPIA EL TOKEN** (solo se muestra una vez)
7. Cuando Git te pida contraseña, **pega el token** (no tu contraseña de GitHub)

### Opción B: GitHub CLI

```bash
# Si no estás autenticado:
gh auth login

# Luego repite los push commands
```

## ✅ Verificación Final

Después de hacer push, verifica:

```bash
# Ver todas las ramas remotas
git branch -r

# Deberías ver:
# origin/master
# origin/bookmarklet
# origin/extension
```

---

## 📝 Estado Actual del Proyecto

- ✅ Código local commitado
- ✅ 3 ramas creadas localmente
- ✅ `.gitignore` configurado correctamente
- ⏳ Solo falta hacer push a GitHub

Una vez completado, empezamos con la implementación de Chrome Extension en la rama `extension` 🚀

