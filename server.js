/**
 * server.js
 * Simple HTTP server to serve COGA script with CORS enabled
 * This allows the bookmarklet to inject COGA into any webpage
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const HOST = '0.0.0.0'; // Listen on all interfaces for ngrok

const server = http.createServer((req, res) => {
  // Enable CORS for all origins (required for bookmarklet to work)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Serve the main script
  if (req.url === '/coga.min.js') {
    const scriptPath = path.join(__dirname, 'extension', 'coga.min.js');

    if (!fs.existsSync(scriptPath)) {
      console.error('coga.min.js not found in extension/.');
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('coga.min.js not found. Run "npm run build:extension" first.');
      return;
    }
    
    fs.readFile(scriptPath, (err, data) => {
      if (err) {
        console.error('Error reading coga.min.js:', err);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Unable to read coga.min.js.');
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache', // Prevent caching during development
        'X-COGA-Script-Source': 'extension',
      });
      res.end(data);
    });
    return;
  }

  // Serve source map
  if (req.url === '/coga.min.js.map') {
    const filePath = path.join(__dirname, 'extension', 'coga.min.js.map');
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Source map not found');
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
    return;
  }

  // Serve static CSS files
  if (req.url.startsWith('/styles/')) {
    const cssFile = req.url.substring(1); // Remove leading /
    const filePath = path.join(__dirname, 'public', cssFile);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('CSS file not found');
        return;
      }
      
      res.writeHead(200, { 
        'Content-Type': 'text/css',
        'Cache-Control': 'no-cache'
      });
      res.end(data);
    });
    return;
  }

  // Serve JavaScript files
  if (req.url.startsWith('/scripts/')) {
    const jsFile = req.url.substring(1);
    const filePath = path.join(__dirname, 'public', jsFile);
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Script file not found');
        return;
      }
      
      // Generate dynamic URL based on request header (for ngrok)
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const publicUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
      
      // Replace placeholders in JavaScript files
      const processedData = data.replace(/\{\{PUBLIC_URL\}\}/g, publicUrl);
      
      res.writeHead(200, { 
        'Content-Type': 'application/javascript',
        'Cache-Control': 'no-cache'
      });
      res.end(processedData);
    });
    return;
  }

  // Serve landing page
  if (req.url === '/' || req.url === '/landing.html') {
    const filePath = path.join(__dirname, 'public', 'landing.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Landing page not found');
        return;
      }
      
      // Generate dynamic URL based on request header (for ngrok)
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const publicUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
      
      // Replace placeholders
      const html = data
        .replace(/\{\{PUBLIC_URL\}\}/g, publicUrl);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    return;
  }

  // Serve old bookmarklet page for backward compatibility
  if (req.url === '/bookmarklet.html') {
    const filePath = path.join(__dirname, 'public', 'bookmarklet.html');
    
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Bookmarklet page not found');
        return;
      }
      
      // Generate dynamic URL based on request header (for ngrok)
      const host = req.headers['x-forwarded-host'] || req.headers.host;
      const protocol = req.headers['x-forwarded-proto'] || 'http';
      const publicUrl = process.env.PUBLIC_URL || `${protocol}://${host}`;
      
      // Replace placeholders
      const html = data
        .replace(/\{\{PUBLIC_URL\}\}/g, publicUrl);
      
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    return;
  }

  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Start server
server.listen(PORT, HOST, () => {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🚀 COGA Script Server');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`📡 Server running on: http://localhost:${PORT}`);
  console.log(`📦 Serving: extension/coga.min.js`);
  console.log('');
  console.log('🔖 Next Steps:');
  console.log(`   1. Visit http://localhost:${PORT} to get the bookmarklet`);
  console.log('   2. Drag the button to your bookmarks bar');
  console.log('   3. Visit any website and click the bookmark');
  console.log('');
  if (process.env.PUBLIC_URL) {
    console.log(`🌐 Public URL: ${process.env.PUBLIC_URL}`);
  } else {
    console.log('💡 To use with ngrok:');
    console.log('   1. Install: npm install -g ngrok');
    console.log('   2. Run: ngrok http 8080');
    console.log('   3. Set PUBLIC_URL env var and restart server');
  }
  console.log('═══════════════════════════════════════════════════════');
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down server...');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

