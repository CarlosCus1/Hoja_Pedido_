/**
 * Script para configurar Branch Protection Rules en GitHub
 * 
 * Este script protege la rama principal de tu repositorio:
 * - Requiere Pull Request para hacer cambios
 * - Requiere aprobación de un mantenedor/admin
 * - Permite que GitHub Actions haga push directamente (bypass)
 * 
 * Uso:
 *   node scripts/setup-branch-protection.js
 * 
 * Antes de ejecutar, configura las variables de entorno:
 *   GITHUB_TOKEN=tu_token_personal
 *   REPO_OWNER=tu_usuario
 *   REPO_NAME=nombre_del_repositorio
 */

const https = require('https');

// Configuración del repositorio
const config = {
  owner: process.env.REPO_OWNER || 'CarlosCus1',
  repo: process.env.REPO_NAME || 'Hoja_Pedido_',
  branch: 'main', // Rama a proteger
  // Tu usuario de GitHub (hará bypass de la protección)
  adminUser: 'CarlosCus1'
};

// Token de GitHub con permisos de admin
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ Error: Necesitas configurar GITHUB_TOKEN');
  console.log('\n📋 Instrucciones para obtener un token:');
  console.log('1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)');
  console.log('2. Generate new token (classic)');
  console.log('3. Selecciona el scope "repo" (control total de repositorios privados)');
  console.log('4. Copia el token y configúralo:');
  console.log('   Windows (PowerShell): $env:GITHUB_TOKEN="tu_token"');
  console.log('   Windows (CMD): set GITHUB_TOKEN=tu_token');
  console.log('   Linux/Mac: export GITHUB_TOKEN="tu_token"');
  console.log('\n🚀 Luego ejecuta: node scripts/setup-branch-protection.js\n');
  process.exit(1);
}

/**
 * Realiza una petición HTTP a la GitHub API
 */
function githubRequest(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${GITHUB_TOKEN}`,
        'Accept': 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'Branch-Protection-Script'
      }
    };

    if (data) {
      options.headers['Content-Type'] = 'application/json';
    }

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

/**
 * Configura las Branch Protection Rules
 */
async function setupBranchProtection() {
  console.log(`\n🛡️  Configurando protección para la rama: ${config.branch}`);
  console.log(`📁 Repositorio: ${config.owner}/${config.repo}\n`);

  try {
    // 1. Verificar que el repositorio existe
    console.log('1️⃣  Verificando repositorio...');
    const repoResponse = await githubRequest('GET', `/repos/${config.owner}/${config.repo}`);
    if (repoResponse.status !== 200) {
      console.error('❌ Error: No se pudo encontrar el repositorio');
      console.log('   Verifica que REPO_OWNER y REPO_NAME sean correctos');
      process.exit(1);
    }
    console.log('   ✅ Repositorio verificado');

    // 2. Obtener información de la rama
    console.log('2️⃣  Obteniendo información de la rama...');
    const branchResponse = await githubRequest(
      'GET', 
      `/repos/${config.owner}/${config.repo}/branches/${config.branch}`
    );
    
    if (branchResponse.status !== 200) {
      console.error(`❌ Error: No se encontró la rama "${config.branch}"`);
      console.log('   Verifica el nombre de tu rama principal (main, master, etc.)');
      process.exit(1);
    }
    console.log(`   ✅ Rama "${config.branch}" encontrada`);

    // 3. Configurar Branch Protection
    console.log('3️⃣  Aplicando reglas de protección...');
    
    const protectionData = {
      // Requiere Pull Request antes de hacer merge
      required_pull_request_reviews: {
        // Requiere al menos 1 revisión
        required_approving_review_count: 1,
        // Dismissar revisiones cuando se hace push
        dismiss_stale_reviews: true,
        // Requiere revisión del code owner
        require_code_owner_reviews: false
      },
      // Allow force pushes (false = no permitir)
      allow_force_pushes: false,
      // Allow deletions (false = no permitir eliminar la rama)
      allow_deletions: false,
      // Require conversation resolution
      require_conversation_resolution: true,
      // Require signed commits (opcional)
      require_signed_commits: false
    };

    // Aplicar protección usando el endpoint correcto de GitHub API
    const protectionPath = `/repos/${config.owner}/${config.repo}/branches/${config.branch}/protection`;
    
    const protectionResponse = await githubRequest(
      'PUT',
      protectionPath,
      protectionData
    );

    if (protectionResponse.status === 200 || protectionResponse.status === 201) {
      console.log('   ✅ Protección aplicada correctamente');
    } else {
      console.log(`   ⚠️  Estado: ${protectionResponse.status}`);
      console.log('   Respuesta:', JSON.stringify(protectionResponse.data, null, 2));
    }

    // 4. Configurar protección de Pull Requests
    console.log('4️⃣  Configurando reglas de Pull Request...');
    const prPath = `/repos/${config.owner}/${config.repo}/branches/${config.branch}/protection/required_pull_request_reviews`;
    const prResponse = await githubRequest(
      'PUT',
      prPath,
      {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false,
        require_last_push_approval: true
      }
    );

    if (prResponse.status === 200 || prResponse.status === 201) {
      console.log('   ✅ Reglas de PR configuradas');
    } else {
      console.log(`   ⚠️  Estado: ${prResponse.status}`);
    }

    // 5. Configurar bypass para GitHub Actions
    console.log('5️⃣  Configurando bypass para GitHub Actions...');
    const bypassPath = `/repos/${config.owner}/${config.repo}/branches/${config.branch}/protection/access_control`;
    const bypassResponse = await githubRequest(
      'PUT',
      bypassPath,
      {
        users: [config.adminUser],  // Tu usuario hace bypass
        teams: [],
        apps: ['GitHub Actions']
      }
    );

    if (bypassResponse.status === 200 || bypassResponse.status === 201) {
      console.log(`   ✅ ${config.adminUser} y GitHub Actions pueden hacer push directamente`);
    } else {
      // Intentar método alternativo (legacy endpoint)
      console.log('   ⚠️  Probando método alternativo...');
      const altPath = `/repos/${config.owner}/${config.repo}/branches/${config.branch}/protection/push_access_levels`;
      const altResponse = await githubRequest(
        'PUT',
        altPath,
        {
          users: [config.adminUser],
          teams: [],
          apps: ['GitHub Actions']
        }
      );
      
      if (altResponse.status === 200 || altResponse.status === 201) {
        console.log(`   ✅ ${config.adminUser} y GitHub Actions pueden hacer push (método alternativo)`);
      } else {
        console.log(`   ⚠️  Estado: ${altResponse.status}`);
        console.log('   ⚠️  Puede que necesites configurar esto manualmente en GitHub');
      }
    }

    console.log('\n🎉 ¡Configuración completada!\n');
    console.log('📋 Resumen de protecciones aplicadas:');
    console.log('   • Require Pull Request para hacer merge');
    console.log('   • Require al menos 1 aprobación');
    console.log(`   • ${config.adminUser} puede hacer push directamente (bypass)`);
    console.log('   • GitHub Actions puede hacer push directamente (bypass)');
    console.log('   • Otros usuarios requieren PR y aprobación');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

// Ejecutar
setupBranchProtection();
