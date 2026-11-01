const http = require('http');

async function test(name, port, path, headers = {}) {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: 'localhost',
      port,
      path,
      headers
    }, (res) => {
      let len = 0;
      res.on('data', chunk => len += chunk.length);
      res.on('end', () => {
        console.log(`[${name}] http://localhost:${port}${path}`);
        console.log(`  Status: ${res.statusCode}`);
        console.log(`  Content-Type: ${res.headers['content-type']}`);
        console.log(`  Content-Disposition: ${res.headers['content-disposition']}`);
        console.log(`  Content-Range: ${res.headers['content-range'] || 'none'}`);
        console.log(`  Accept-Ranges: ${res.headers['accept-ranges'] || 'none'}`);
        console.log(`  Bytes received: ${len}`);
        resolve();
      });
    });
    req.on('error', err => {
      console.error(`[${name}] ERROR:`, err.message);
      resolve();
    });
    req.end();
  });
}

async function run() {
  const docId = '85cc2bee-3749-42c3-938a-aae09f935dc5';
  console.log('--- BACKEND (3000) TESTS ---');
  await test('Backend View (inline)', 3000, `/api/documents/${docId}/file`);
  await test('Backend Download (attachment)', 3000, `/api/documents/${docId}/download`);
  await test('Backend Range Request (206)', 3000, `/api/documents/${docId}/file`, { Range: 'bytes=0-100' });

  console.log('\n--- FRONTEND VITE PROXY (5173) TESTS ---');
  await test('Vite Proxy View (inline)', 5173, `/api/documents/${docId}/file`);
  await test('Vite Proxy Download (attachment)', 5173, `/api/documents/${docId}/download`);
  await test('Vite Worker Serving', 5173, `/pdf.worker.min.js`);
}

run();
