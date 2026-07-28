#!/usr/bin/env node

/**
 * KheloPatna & Stitch Local MCP (Model Context Protocol) Server
 * Exposes Native Mobile App & API management tools directly to Antigravity.
 */

const readline = require('readline');

const apiKey = process.env.STITCH_API_KEY || '';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  try {
    const request = JSON.parse(line);
    
    // Handle MCP protocol handshake
    if (request.method === 'initialize') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'stitch-mcp-server',
            version: '1.0.0'
          }
        }
      };
      console.log(JSON.stringify(response));
      return;
    }

    if (request.method === 'tools/list') {
      const response = {
        jsonrpc: '2.0',
        id: request.id,
        result: {
          tools: [
            {
              name: 'stitch_generate_native_app',
              description: 'Generate and build Native Admin App for KheloPatna',
              inputSchema: {
                type: 'object',
                properties: {
                  platform: { type: 'string', enum: ['android', 'ios', 'both'] }
                }
              }
            },
            {
              name: 'stitch_sync_api_endpoints',
              description: 'Sync backend API endpoints with Native App',
              inputSchema: {
                type: 'object',
                properties: {
                  apiUrl: { type: 'string' }
                }
              }
            }
          ]
        }
      };
      console.log(JSON.stringify(response));
      return;
    }

    // Default response for notifications or ping
    if (request.id !== undefined) {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: request.id,
        result: {}
      }));
    }
  } catch (e) {
    // Ignore non-JSON lines
  }
});
