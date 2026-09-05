import { createServer } from 'node:http';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { buildCasuarMcpServer } from './build-server.js';

const http = createServer(async (req, res) => {
  if (req.url !== '/mcp') {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }

  const expected = process.env.CASUAR_MCP_TOKEN;
  const auth = req.headers.authorization;
  if (!expected || auth !== `Bearer ${expected}`) {
    res.statusCode = 401;
    res.setHeader('WWW-Authenticate', 'Bearer realm="casuar-mcp"');
    res.end('Unauthorized');
    return;
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = buildCasuarMcpServer();
  await server.connect(transport);

  try {
    await transport.handleRequest(req, res);
  } finally {
    await transport.close();
    await server.close();
  }
});

const port = Number(process.env.CASUAR_MCP_PORT ?? 8787);
http.listen(port, () => console.log(`Casuar MCP listening on :${port}/mcp`));
