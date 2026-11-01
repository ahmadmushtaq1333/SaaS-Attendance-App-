const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PREVIEW_DIR = __dirname;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.apk': 'application/vnd.android.package-archive',
};

const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // API endpoint to save WebGL-rendered icons directly from headless browser
  if (req.method === 'POST' && urlPath === '/api/save_icon') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const base64Data = payload.data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const targetPath = path.resolve(__dirname, '..', 'mobile', 'assets', payload.name);
        fs.writeFileSync(targetPath, buffer);
        console.log('Saved icon asset:', payload.name, buffer.length, 'bytes');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, name: payload.name, size: buffer.length }));
      } catch (err) {
        console.error('Error saving icon:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  let filename = urlPath === '/' ? 'index.html' : urlPath.replace(/^\//, '');
  if (urlPath === '/download') {
    filename = 'quorum.apk';
  }

  const filePath = path.join(PREVIEW_DIR, filename);

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found: ' + filename);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const stat = fs.statSync(filePath);

  if (ext === '.apk') {
    res.writeHead(200, {
      'Content-Type': 'application/vnd.android.package-archive',
      'Content-Disposition': 'attachment; filename="' + path.basename(filePath) + '"',
      'Content-Length': stat.size,
    });
    fs.createReadStream(filePath).pipe(res);
    return;
  }

  res.writeHead(200, {
    'Content-Type': mimeTypes[ext] || 'application/octet-stream',
    'Content-Length': stat.size,
  });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('Quorum Mobile Server running:');
  console.log('  Web Preview: http://192.168.1.8:' + PORT);
  console.log('  Direct APK:  http://192.168.1.8:' + PORT + '/quorum.apk');
});
