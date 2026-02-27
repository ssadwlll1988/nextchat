import { JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { MCPClientLogger } from "./logger";

const logger = new MCPClientLogger();

// 同步导入fetch-event-source
let fetchEventSource: any;
try {
  // 尝试CommonJS导入
  fetchEventSource = require("@fortaine/fetch-event-source").fetchEventSource;
  logger.info("Using fetch-event-source for SSE connections");
} catch (error) {
  logger.error(`Error loading fetch-event-source: ${error}`);
  throw new Error("fetch-event-source is required for SSE connections");
}

export class SseClientTransport {
  private url: string;
  private abortController: AbortController | null = null;
  private connected: boolean = false;
  private endpointUrl: string | null = null;
  public onmessage?: (message: JSONRPCMessage) => void;
  public onerror?: (error: Error) => void;
  public onclose?: () => void;

  constructor(url: string) {
    this.url = url;
  }

  async start(): Promise<void> {
    logger.info(`Connecting to SSE MCP server at ${this.url}...`);
    
    if (!fetchEventSource) {
      throw new Error("fetch-event-source is not available");
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.abortController = new AbortController();

        fetchEventSource(this.url, {
          signal: this.abortController.signal,
          onopen: (response: Response) => {
            logger.info(`SSE connection opened with status: ${response.status}`);
            // 连接已建立，但还没有收到endpoint事件
          },
          onmessage: (event: { event: string; data: string }) => {
            if (event.event === "endpoint") {
              // 从SSE事件中获取端点URL
              this.endpointUrl = this.resolveEndpointUrl(this.url, event.data);
              logger.info(`Received endpoint URL: ${this.endpointUrl}`);
              this.connected = true;
              resolve();
            } else if (event.event === "message" && this.onmessage) {
              try {
                // 尝试解析JSON消息
                const data = JSON.parse(event.data);
                this.onmessage(data);
              } catch (error) {
                // 忽略非JSON消息，这可能是服务器的心跳或其他信息
                logger.debug(`Non-JSON SSE message: ${event.data}`);
              }
            } else {
              logger.debug(`Received SSE event: ${event.event}`);
            }
          },
          onerror: (error: any) => {
            logger.error(`SSE connection error: ${error}`);
            if (this.onerror) {
              this.onerror(new Error(`SSE connection error: ${error}`));
            }
            if (!this.connected) {
              reject(new Error(`Failed to connect to SSE MCP server: ${error}`));
            }
          },
          onclose: () => {
            logger.info("SSE connection closed");
            this.connected = false;
            if (this.onclose) {
              this.onclose();
            }
          },
        });
      } catch (error) {
        logger.error(`Error creating SSE connection: ${error}`);
        reject(new Error(`Failed to create SSE connection: ${error}`));
      }
    });
  }

  private resolveEndpointUrl(baseUrl: string, endpointPath: string): string {
    // 解析基础URL
    const baseUrlObj = new URL(baseUrl);
    // 确保endpointPath是绝对路径
    const endpointPathNormalized = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
    // 构建完整的端点URL
    return `${baseUrlObj.origin}${endpointPathNormalized}`;
  }

  async send(message: JSONRPCMessage): Promise<void> {
    if (!this.connected || !this.endpointUrl) {
      throw new Error("SSE transport not connected or endpoint URL not received");
    }

    // 使用从SSE事件中获取的端点URL发送POST请求
    try {
      // 设置请求超时
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时

      // 发送POST请求到端点URL
      const response = await fetch(this.endpointUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(message),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        logger.error(`POST request to endpoint failed: ${response.statusText}`);
        throw new Error(`Failed to send message: ${response.statusText}`);
      }

      logger.info(`POST request to endpoint successful: ${response.status}`);
    } catch (error) {
      logger.error(`Error sending message: ${error}`);
      throw error;
    }
  }

  async close(): Promise<void> {
    logger.info("Closing SSE connection");
    
    if (this.abortController) {
      this.abortController.abort();
    }
    
    this.abortController = null;
    this.connected = false;
    this.endpointUrl = null;
    
    if (this.onclose) {
      this.onclose();
    }
  }
}
