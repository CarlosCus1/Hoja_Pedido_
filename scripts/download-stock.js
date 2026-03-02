import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import xlsx from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const STOCK_URL = 'http://appweb.cipsa.com.pe:8054/AlmacenStock/DownLoadFiles?value={%22%20%22:%22%22,%22parametroX1%22:%220%22,%22parametroX2%22:%220%22}';

function formatSKU(sku) {
  if (!sku) return null;
  let cleanSKU = String(sku).trim();
  cleanSKU = cleanSKU.replace(/[^a-zA-Z0-9]/g, '');
  if (!cleanSKU) return null;
  return cleanSKU;
}

function downloadFile(url, timeout = 120000) {
  return new Promise((resolve, reject) => {
    console.log('Descargando stock desde appweb...');
    
    const request = http.get(url, {
      timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    }, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }
      
      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => resolve(Buffer.concat(chunks)));
      response.on('error', reject);
    });
    
    request.on('error', reject);
    request.on('timeout', () => {
      request.destroy();
      reject(new Error('Timeout'));
    });
  });
}

async function main() {
  try {
    console.log('=== Descargando stock (almacén VES) ===');
    
    const buffer = await downloadFile(STOCK_URL);
    
    console.log('Parseando Excel...');
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Leer el Excel como array de arrays
    const rawData = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
    
    console.log(`Filas totales: ${rawData.length}`);
    
    // Buscar la fila donde empiezan los datos
    let dataStartRow = -1;
    for (let i = 0; i < Math.min(20, rawData.length); i++) {
      const row = rawData[i];
      if (row && row.some(cell => /^\d{5,6}$/.test(String(cell || '').trim()))) {
        dataStartRow = i;
        break;
      }
    }
    
    if (dataStartRow === -1) {
      throw new Error('No se encontraron datos');
    }
    
    const headers = rawData[dataStartRow - 1];
    
    // Buscar índices de columnas
    let skuIndex = -1;
    let almacenIndex = -1;
    let disponibleIndex = -1;
    
    headers.forEach((cell, idx) => {
      const cellStr = String(cell || '').toUpperCase().trim();
      if (cellStr.includes('ARTÍCULO') || cellStr.includes('ARTICULO')) {
        skuIndex = idx - 1; // El código está en la columna anterior al nombre
      }
      if (cellStr.includes('ALMACEN') || cellStr.includes('ALMACÉN')) {
        almacenIndex = idx;
      }
      if (cellStr.includes('DISPONIBLE')) {
        disponibleIndex = idx;
      }
    });
    
    // Valores por defecto
    if (skuIndex === -1) skuIndex = 1;
    if (almacenIndex === -1) almacenIndex = 9;
    if (disponibleIndex === -1) disponibleIndex = 18;
    
    // Procesar datos - solo almacén VES
    const stockData = [];
    
    for (let i = dataStartRow; i < rawData.length; i++) {
      const row = rawData[i];
      if (!row || row.length === 0) continue;
      
      const almacen = String(row[almacenIndex] || '').trim().toUpperCase();
      const sku = formatSKU(row[skuIndex]);
      const disponible = parseInt(row[disponibleIndex], 10) || 0;
      
      // Solo almacén VES
      if (almacen === 'VES' && sku) {
        stockData.push({ sku, disponible });
      }
    }
    
    console.log(`Productos procesados (almacén VES): ${stockData.length}`);
    
    if (stockData.length > 0) {
      // Guardar JSON
      const outputPath = path.join(__dirname, '..', 'public', 'stock_data.json');
      const output = {
        timestamp: new Date().toISOString(),
        almacen: 'VES',
        count: stockData.length,
        data: stockData
      };
      
      fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));
      console.log(`✅ Stock guardado: ${outputPath}`);
    } else {
      console.log('⚠️ No se encontraron productos para almacén VES');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
