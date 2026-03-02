const express = require('express');
const cors = require('cors');
const xlsx = require('xlsx');
const https = require('https');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Habilitar CORS para permitir solicitudes desde el frontend
app.use(cors());
app.use(express.json());

// Función para descargar archivo desde una URL
function downloadFile(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const options = {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    };
    
    protocol.get(url, options, (response) => {
      // Manejar redirecciones
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location)
          .then(resolve)
          .catch(reject);
        return;
      }
      
      if (response.statusCode !== 200) {
        reject(new Error(`Error HTTP: ${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      response.on('error', reject);
    }).on('error', reject);
  });
}

// Endpoint: Descargar stock desde appweb
app.get('/api/stock/appweb', async (req, res) => {
  try {
    console.log('Descargando desde appweb...');
    
    const url = 'http://appweb.cipsa.com.pe:8054/AlmacenStock/DownLoadFiles?value={%22%20%22:%22%22,%22parametroX1%22:%220%22,%22parametroX2%22:%220%22}';
    
    const buffer = await downloadFile(url);
    console.log('Archivo descargado, parseando...');
    
    // Parsear Excel
    const workbook = xlsx.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(worksheet);
    
    // Procesar datos
    const stockData = rawData
      .filter(row => row.Column2 && row.Column2 !== 'Total' && row.Column2 !== 'TOTAL')
      .map(row => ({
        sku: String(row.Column2).trim(),
        nombre: row.Column3 || '',
        disponible: parseInt(row.Column19, 10) || 0,
        almacen: row.Column10 || '',
        predespacho: parseInt(row.Column17, 10) || 0
      }));
    
    console.log(`Stock procesado: ${stockData.length} productos`);
    
    res.json({
      success: true,
      count: stockData.length,
      data: stockData
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint: Descargar stock desde Google Drive
app.get('/api/stock/drive', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'Se requiere la URL de Google Drive'
      });
    }
    
    console.log('Descargando desde Google Drive:', url);
    
    // Extraer ID del archivo
    let fileId = '';
    if (url.includes('/d/')) {
      const parts = url.split('/d/');
      const secondPart = parts[1].split('/');
      fileId = secondPart[0];
    } else if (url.includes('file/d/')) {
      const parts = url.split('file/d/');
      const secondPart = parts[1].split('/');
      fileId = secondPart[0];
    }
    
    if (!fileId) {
      throw new Error('No se pudo extraer el ID del archivo');
    }
    
    // URL de descarga directa
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
    
    const buffer = await downloadFile(downloadUrl);
    console.log('Archivo descargado, parseando...');
    
    // Intentar parsear como Excel o JSON
    let stockData;
    try {
      // Intentar como Excel
      const workbook = xlsx.read(buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawData = xlsx.utils.sheet_to_json(worksheet);
      
      stockData = rawData
        .filter(row => row.Column2 && row.Column2 !== 'Total' && row.Column2 !== 'TOTAL')
        .map(row => ({
          sku: String(row.Column2).trim(),
          nombre: row.Column3 || '',
          disponible: parseInt(row.Column19, 10) || 0
        }));
    } catch (e) {
      // Intentar como JSON
      const jsonStr = buffer.toString('utf-8');
      const jsonData = JSON.parse(jsonStr);
      
      stockData = Array.isArray(jsonData) ? jsonData : jsonData.productos || jsonData.stock || [];
      
      stockData = stockData.map(item => ({
        sku: String(item.sku || item.codigo || item.Column2 || '').trim(),
        nombre: item.nombre || item.nombre_producto || '',
        disponible: parseInt(item.disponible || item.stock || item.Column19 || 0, 10)
      })).filter(item => item.sku);
    }
    
    console.log(`Stock procesado: ${stockData.length} productos`);
    
    res.json({
      success: true,
      count: stockData.length,
      data: stockData
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Endpoint: Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Stock API corriendo en http://localhost:${PORT}`);
  console.log('Endpoints disponibles:');
  console.log(`  - GET http://localhost:${PORT}/api/stock/appweb`);
  console.log(`  - GET http://localhost:${PORT}/api/stock/drive?url=...`);
});
