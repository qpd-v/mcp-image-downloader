# MCP Image Downloader

An MCP server that provides tools for downloading and optimizing images. Built using the Model Context Protocol (MCP), this server enables AI assistants to download images from URLs and perform basic image optimization tasks.

## Features

- Download images from URLs with proper error handling
- Optimize images with options for:
  - Resizing (maintaining aspect ratio)
  - Quality adjustment (JPEG/WebP)
  - Format conversion

## Installation

```bash
# Clone the repository
git clone https://github.com/qpd-v/mcp-image-downloader.git
cd mcp-image-downloader

# Install dependencies
npm install

# Build the project
npm run build
```

## Usage

### As an MCP Server

Add the server to your MCP configuration (e.g., in Claude Desktop's config):

```json
{
  "mcpServers": {
    "image-downloader": {
      "command": "node",
      "args": ["/path/to/mcp-image-downloader/build/index.js"]
    }
  }
}
```

### Available Tools

#### download_image
Downloads an image from a URL to a specified path.

Parameters:
- `url`: URL of the image to download
- `outputPath`: Path where to save the image

#### optimize_image
Creates an optimized version of an image.

Parameters:
- `inputPath`: Path to the input image
- `outputPath`: Path where to save the optimized image
- `width` (optional): Target width (maintains aspect ratio if only width is specified)
- `height` (optional): Target height (maintains aspect ratio if only height is specified)
- `quality` (optional): JPEG/WebP quality (1-100)

## Development

```bash
# Run in development mode
npm run start

# Build the project
npm run build
```

## Requirements

- Node.js 16 or higher
- NPM or compatible package manager

## License

MIT License - see the [LICENSE](LICENSE) file for details.

## Author

qpd-v

## Version

0.1.0 - Initial release