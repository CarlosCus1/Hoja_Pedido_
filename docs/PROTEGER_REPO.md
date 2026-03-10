# 🛡️ Guía para Proteger tu Repositorio GitHub

## Situación Actual
Tu repositorio está publicado en GitHub Pages y necesitas protegerlo de cambios no autorizados:
- ❌ No pueden editar directamente el repo
- ✅ Solo tú (admin) puedes hacer merge de cambios
- ✅ Cualquier PR requiere tu aprobación

---

## Método 1: Usar el Script Automático (Recomendado) 🚀

### Paso 1: Obtener un Token de GitHub

1. Ve a **GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)**
2. Clic en **"Generate new token (classic)"**
3. Dale un nombre al token (ej: "Branch Protection")
4. Selecciona el scope **`repo`** (control total de repositorios privados y públicos)
5. Clic en **"Generate token"**
6. **⚠️ IMPORTANTE**: Copia el token inmediatamente, ya que solo se muestra una vez

### Paso 2: Configurar el Entorno

Abre una terminal en la raíz del proyecto y ejecuta:

**Windows (PowerShell):**
```powershell
$env:GITHUB_TOKEN = "ghp_tu_token_aqui"
$env:REPO_OWNER = "tu_usuario_github"
$env:REPO_NAME = "Hoja_de_Pedido"
node scripts/setup-branch-protection.js
```

**Windows (CMD):**
```cmd
set GITHUB_TOKEN=ghp_tu_token_aqui
set REPO_OWNER=tu_usuario_github
set REPO_NAME=Hoja_de_Pedido
node scripts/setup-branch-protection.js
```

**Linux/Mac:**
```bash
export GITHUB_TOKEN="ghp_tu_token_aqui"
export REPO_OWNER="tu_usuario_github"
export REPO_NAME="Hoja_de_Pedido"
node scripts/setup-branch-protection.js
```

---

## Método 2: Configurar Manualmente en GitHub ⚙️

Si prefieres hacerlo desde la interfaz de GitHub:

### Paso 1: Acceder a Configuración
1. Ve a tu repositorio en GitHub
2. Clic en **Settings** (Configuración)
3. En el menú izquierdo, busca **"Branches"**

### Paso 2: Crear Regla de Protección
1. Clic en **"Add branch protection rule"**
2. En **Branch name pattern**, escribe: `main`
3. Configura las siguientes opciones:

| Opción | Configuración |
|--------|---------------|
| ✅ Require pull request reviews before merging | Activado |
| ✅ Require approvals | **1** |
| ✅ Dismiss stale reviews when new commits are pushed | Activado |
| ✅ Require review from code owners | ❌ (opcional) |
| ✅ Include administrators | **Activado** (importante!) |
| ✅ Restrict who can push | **Ninguno** (solo admins pueden hacer push) |
| ✅ Allow force pushes | ❌ Desactivado |
| ✅ Allow deletions | ❌ Desactivado |
| ✅ Require conversation resolution before merging | ✅ Activado |

4. Clic en **"Create"**

---

## 📋 ¿Qué Protecciones se Aplican?

Una vez configurado, tu repositorio tendrá:

| Protección | Descripción |
|------------|-------------|
| 🔒 **No pushes directos de usuarios** | Nadie puede hacer push directamente a `main` |
| 📝 **Pull Request requerido** | Todo cambio debe ser vía PR |
| ✅ **Revisión obligatoria** | Al menos 1 persona debe aprobar el PR |
| ⚡ **GitHub Actions puede actualizar** | Tus workflows de stock funcionan normalmente |
| 👑 **Tú controlas los merges** | Solo tú decides qué se acepta |

---

## 🤔 ¿Qué pueden hacer los colaboradores?

| Acción | ¿Permitido? |
|--------|-------------|
| Fork del repositorio | ✅ Sí |
| Crear branches | ✅ Sí |
| Crear Pull Requests | ✅ Sí |
| Hacer push a main | ❌ NO |
| Mergear PRs | ❌ NO (solo tú) |

---

## 🔧 Solución de Problemas

### Error: "Resource not found"
- Verifica que el nombre del repositorio sea correcto
- Asegúrate de que tienes permisos de admin en el repositorio

### Error: "Not Found"
- Verifica que la rama `main` existe en tu repositorio
- Si usas `master` en lugar de `main`, cambia la configuración

### El token no funciona
- Asegúrate de haber seleccionado el scope `repo`
- Verifica que el token no haya expirado
- Confirma que eres owner/admin del repositorio

---

## ⚡ Acceso Rápido

Para configurar manualmente sin seguir tutorial:
```
https://github.com/TU_USUARIO/Hoja_de_Pedido/settings/branches
```

---

## 🔐 Notas sobre los Workflows (GitHub Actions)

**Tu configuración actual:**
- [`update-stock.yml`](.github/workflows/update-stock.yml) - Actualiza el stock automáticamente cada hora
- [`deploy-frontend.yml`](.github/workflows/deploy-frontend.yml) - Despliega el frontend a GitHub Pages

**¿Qué sucede con las protecciones?**

| Workflow | Con protecciones | ¿Funciona? |
|----------|------------------|------------|
| update-stock.yml | Push a main y gh-pages | ✅ SÍ |
| deploy-frontend.yml | Push a gh-pages | ✅ SÍ |

**¿Por qué funcionan?**
- El script configura `include_administrators: false` y `enforce_admins: false`
- Esto permite que los **GitHub Actions** (tu workflow) puedan hacer push directamente
- Pero **usuarios normales** (colaboradores) NO pueden hacer push sin PR

**Resultado:**
- ✅ El stock se actualiza automáticamente (tu workflow funciona)
- ✅ Nadie puede manipular el repo sin tu aprobación
- ✅ GitHub Pages sigue funcionando perfectamente

---

## 📞 Notas Importantes

1. **GitHub Pages**: Tu sitio seguirá funcionando normalmente, las protecciones no afectan GitHub Pages
2. **Tu flujo de trabajo**: 
   - Crea un branch para tus cambios
   - Haz PR cuando esté listo
   - Approva y mergea tú mismo
3. **Colaboradores**: Si alguien quiere contribuir, te hará un PR y tú decides si aceptarlo

---

*Última actualización: 2026-03-10*
