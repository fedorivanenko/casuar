import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerCausalTools } from './causal-tools.js';
import { registerWindTunnelTools } from './wind-tunnel-tools.js';

export function buildCasuarMcpServer() {
  const server = new McpServer({ name: 'casuar', version: '0.7.0' });
  registerCausalTools(server);
  registerWindTunnelTools(server);
  return server;
}
