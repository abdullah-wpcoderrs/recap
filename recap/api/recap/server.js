const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

// Load environment variables from .env file
require('dotenv').config();

const PORT = 3000;

// MIME types for different file extensions
const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.svg': 'image/svg+xml'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;

  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Handle API routes
  if (pathname.startsWith('/api/')) {
    try {
      // Import the API handler
      const apiPath = path.join(__dirname, pathname + '.js');
      if (fs.existsSync(apiPath)) {
        // Clear require cache for hot reloading
        delete require.cache[require.resolve(apiPath)];
        const handler = require(apiPath).default;
        
        // Create mock req/res objects similar to Vercel
        const mockReq = {
          method: req.method,
          url: req.url,
          query: parsedUrl.query,
          headers: req.headers
        };
        
        const mockRes = {
          status: (code) => {
            res.statusCode = code;
            return mockRes;
          },
          json: (data) => {
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(data));
          },
          setHeader: (name, value) => {
            res.setHeader(name, value);
          },
          end: () => {
            res.end();
          }
        };
        
        await handler(mockReq, mockRes);
        return;
      }
    } catch (error) {
      console.error('API Error:', error);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Internal server error' }));
      return;
    }
  }

  // Serve static files
  let filePath = path.join(__dirname, pathname === '/' ? 'index.html' : pathname);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    res.statusCode = 404;
    res.end('File not found');
    return;
  }

  // Get file extension and set content type
  const ext = path.extname(filePath).toLowerCase();
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  try {
    const content = fs.readFileSync(filePath);
    res.setHeader('Content-Type', contentType);
    res.end(content);
  } catch (error) {
    res.statusCode = 500;
    res.end('Error reading file');
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔧 API endpoints available at /api/*`);
  console.log('\n💡 To test the API, visit: http://localhost:3000/api/recap?username=elonmusk');
});