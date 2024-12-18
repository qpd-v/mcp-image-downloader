#!/usr/bin/env node
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ErrorCode,
  ListToolsRequestSchema,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import axios from 'axios';
import sharp from 'sharp';
import fs from 'fs-extra';
import path from 'path';

interface DownloadImageArgs {
  url: string;
  outputPath: string;
}

interface OptimizeImageArgs {
  inputPath: string;
  outputPath: string;
  width?: number;
  height?: number;
  quality?: number;
}

class ImageDownloaderServer {
  private server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'mcp-image-downloader',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  private isDownloadImageArgs(args: unknown): args is DownloadImageArgs {
    if (!args || typeof args !== 'object') return false;
    const a = args as Record<string, unknown>;
    return (
      typeof a.url === 'string' &&
      typeof a.outputPath === 'string'
    );
  }

  private isOptimizeImageArgs(args: unknown): args is OptimizeImageArgs {
    if (!args || typeof args !== 'object') return false;
    const a = args as Record<string, unknown>;
    return (
      typeof a.inputPath === 'string' &&
      typeof a.outputPath === 'string' &&
      (a.width === undefined || typeof a.width === 'number') &&
      (a.height === undefined || typeof a.height === 'number') &&
      (a.quality === undefined || typeof a.quality === 'number')
    );
  }

  private setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'download_image',
          description: 'Download an image from a URL to a specified path',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL of the image to download',
              },
              outputPath: {
                type: 'string',
                description: 'Path where to save the image',
              },
            },
            required: ['url', 'outputPath'],
          },
        },
        {
          name: 'optimize_image',
          description: 'Create an optimized version of an image',
          inputSchema: {
            type: 'object',
            properties: {
              inputPath: {
                type: 'string',
                description: 'Path to the input image',
              },
              outputPath: {
                type: 'string',
                description: 'Path where to save the optimized image',
              },
              width: {
                type: 'number',
                description: 'Target width (maintains aspect ratio if only width is specified)',
              },
              height: {
                type: 'number',
                description: 'Target height (maintains aspect ratio if only height is specified)',
              },
              quality: {
                type: 'number',
                description: 'JPEG/WebP quality (1-100)',
                minimum: 1,
                maximum: 100,
              },
            },
            required: ['inputPath', 'outputPath'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      switch (request.params.name) {
        case 'download_image':
          if (!this.isDownloadImageArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for download_image');
          }
          return this.handleDownloadImage(request.params.arguments);
        case 'optimize_image':
          if (!this.isOptimizeImageArgs(request.params.arguments)) {
            throw new McpError(ErrorCode.InvalidParams, 'Invalid arguments for optimize_image');
          }
          return this.handleOptimizeImage(request.params.arguments);
        default:
          throw new McpError(
            ErrorCode.MethodNotFound,
            `Unknown tool: ${request.params.name}`
          );
      }
    });
  }

  private async handleDownloadImage(args: DownloadImageArgs) {
    try {
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(args.outputPath));

      // Download image
      const response = await axios({
        method: 'GET',
        url: args.url,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        },
        timeout: 30000,
      });

      // Save image
      await fs.writeFile(args.outputPath, response.data);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully downloaded image to ${args.outputPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Download error:', errorMessage);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to download image: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  private async handleOptimizeImage(args: OptimizeImageArgs) {
    try {
      // Ensure output directory exists
      await fs.ensureDir(path.dirname(args.outputPath));

      // Read input image
      let transformer = sharp(args.inputPath);

      // Resize if dimensions specified
      if (args.width || args.height) {
        transformer = transformer.resize(args.width, args.height, {
          fit: 'inside',
          withoutEnlargement: true,
        });
      }

      // Set quality if specified
      if (args.quality) {
        transformer = transformer.jpeg({ quality: args.quality }).webp({ quality: args.quality });
      }

      // Save optimized image
      await transformer.toFile(args.outputPath);

      return {
        content: [
          {
            type: 'text',
            text: `Successfully optimized image to ${args.outputPath}`,
          },
        ],
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Optimization error:', errorMessage);
      return {
        content: [
          {
            type: 'text',
            text: `Failed to optimize image: ${errorMessage}`,
          },
        ],
        isError: true,
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Image Downloader MCP server running on stdio');
  }
}

const server = new ImageDownloaderServer();
server.run().catch(console.error);