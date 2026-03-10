/**
 * Script para configurar Branch Protection Rules para gh-pages
 * 
 * Este script protege la rama gh-pages haciendo que sea de solo lectura:
 * - Nadie puede hacer push directo
 * - Solo GitHub Actions puede escribir mediante el workflow
 * 
 * Uso:
 *   node scripts/setup-gh-pages-protection.js
 * 
 * Antes de ejecutar, configura las variables de entorno:
 *   GITHUB_TOKEN=tu_token_personal
 *   REPO_OWNER=tu_usuario
 *   REPO_NAME=nombre_del_repositorio
 */

const https = require('https');

const config = {
  owner: process.env.REPO_OWNER || 'TU_USUARIO_GITHUB',
  repo: process.env.REPO_NAME || 'TU_REPOSITORIO',
  branch: 'gh-pages',
};

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

if (!GITHUB_TOKEN) {
  console.error('❌ Error: Necesitas configurar GITHUB_TOKEN');
  console.log('\n📋 Instrucciones para obtener un token:');
  console.log('1. Ve a GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)');
  console.log('2. Generate new token (classic)');
  console.log('3. Selecciona el scope "repo"');
  console.log('4. Configúralo:');
  console.log('   Windows (PowerShell): $env:GITHUB_TOKEN="tu_token"');
  console.log('   Linux/Mac: export GITHUB_TOKEN="tu_token"');
  console.log('\n🚀 Luego ejecuta: node scripts/setup-gh-pages-protection.js\n');
  process.exit(1);
}

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
        'User-Agent': 'GhPages-Protection-Script'
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

async function setupGhPagesProtection() {
  console.log(`\n🛡️  Configurando protección para la rama: gh-pages`);
  console.log(`📁 Repositorio: ${config.owner}/${config.repo}\n`);

  try {
    // 1. Verificar que gh-pages existe
    console.log('1️⃣  Verificando rama gh-pages...');
    const branchResponse = await githubRequest(
      'GET', 
      `/repos/${config.owner}/${config.repo}/branches/${config.branch}`
    );
    
    if (branchResponse.status !== 200) {
      console.error(`❌ Error: No se encontró la rama "${config.branch}"`);
      console.log('   Asegúrate de que el workflow haya corrido al menos una vez');
      process.exit(1);
    }
    console.log(`   ✅ Rama "${config.branch}" encontrada`);

    // 2. Configurar protección para gh-pages (más restrictiva)
    console.log('2️⃣  Aplicando reglas de protección (solo lectura)...');
    
    const protectionData = {
      required_pull_request_reviews: {
        required_approving_review_count: 1,
        dismiss_stale_reviews: true,
        require_code_owner_reviews: false
      },
      required_status_checks: null,
      restrictions: null, // Nadie puede hacer push directo
      allow_force_pushes: false,
      allow_deletions: false,
      require_conversation_resolution: true,
      require_signed_commits: false
    };

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
    }

    // 3. Habilitar protección para admins
    console.log('3️⃣  Habilitando protección para administradores...');
    const adminPath = `/repos/${config.owner}/${config.repo}/branches/${config.branch}/protection/enforce_admins`;
    const adminResponse = await githubRequest(
      'PUT',
      adminPath,
      { enabled: true }
    );

    if (adminResponse.status === 200) {
      console.log('   ✅ Los administradores también necesitan PR');
    }

    console.log('\n🎉 ¡Configuración de gh-pages completada!\n');
    console.log('📋 Resumen de protecciones:');
    console.log('   • Require Pull Request para hacer merge');
    console.log('   • Require al menos 1 aprobación');
    console.log('   • No se permiten pushes directos');
    console.log('   • Incluye administradores\n');
    console.log('⚠️  IMPORTANTE: Necesitas actualizar el workflow para usar un token');
    console.log('   con permisos de escritura bypassing la protección.');
    console.log('   Configura GITHUB_TOKEN con el valor de tu Personal Access Token.');

  } catch (error) {
    console.error('❌ Error durante la configuración:', error.message);
    process.exit(1);
  }
}

setupGhPagesProtection();
