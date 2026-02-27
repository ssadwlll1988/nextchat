import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { MCPClientLogger } from "./logger";
import { ListToolsResponse, McpRequestMessage, ServerConfig } from "./types";
import { SseClientTransport } from "./sse-transport";
import { z } from "zod";

const logger = new MCPClientLogger();

export async function createClient(
  id: string,
  config: ServerConfig,
): Promise<Client> {
  logger.info(`Creating client for ${id}...`);

  let transport;
  if (config.transport === "sse" && config.url) {
    // SSE 网络模式
    logger.info(`Using SSE transport for ${id} at ${config.url}`);
    transport = new SseClientTransport(config.url);
  } else if (config.command) {
    // 本地进程模式
    logger.info(`Using stdio transport for ${id} with command ${config.command}`);
    transport = new StdioClientTransport({
      command: config.command,
      args: config.args || [],
      env: {
        ...Object.fromEntries(
          Object.entries(process.env)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v]) => [k, v as string]),
        ),
        ...(config.env || {}),
      },
    });
  } else {
    throw new Error(`Invalid MCP server config for ${id}: either command (for stdio) or url (for sse) must be provided`);
  }

  const client = new Client(
    {
      name: `nextchat-mcp-client-${id}`,
      version: "1.0.0",
    },
    {
      capabilities: {},
    },
  );
  await client.connect(transport);
  return client;
}

export async function removeClient(client: Client) {
  logger.info(`Removing client...`);
  await client.close();
}

export async function listTools(client: Client): Promise<ListToolsResponse> {
  try {
    return await client.listTools();
  } catch (error) {
    logger.error(`Failed to list tools: ${error}`);
    // 返回空的工具列表，这样客户端仍然可以初始化
    return { tools: [] };
  }
}

export async function executeRequest(
  client: Client,
  request: McpRequestMessage,
) {
  try {
    return await client.request(request, z.any());
  } catch (error) {
    logger.error(`Failed to execute request: ${error}`);
    throw error;
  }
}
