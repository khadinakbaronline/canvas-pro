# Mermaid Diagram Visualizer

A production-ready ChatGPT app using OpenAI's Apps SDK (MCP protocol) that converts text and data into interactive Mermaid diagrams.

## Features

- **Generate Diagrams**: Convert text descriptions into Mermaid diagram code (flowchart, sequence, class, ER, Gantt, pie, git)
- **Parse Files**: Upload and parse CSV, JSON, or TXT files to generate diagrams
- **Interactive UI**: Edit, preview, and download diagrams as PNG
- **Dark Mode**: Automatic dark mode support based on system preferences
- **MCP Compliant**: Follows OpenAI's Model Context Protocol specification exactly

## Project Structure

```
canvas-pro/
├── server.js              # Main MCP server with Express
├── package.json           # Dependencies and scripts
├── railway.json          # Railway deployment config
├── .gitignore            # Git ignore rules
├── README.md             # This file
└── public/
    └── mermaid-viewer.html  # UI template component
```

## Setup

### Prerequisites

- Node.js 18.0.0 or higher
- npm or yarn

### Installation

1. **Clone or navigate to the project directory**

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set environment variables (optional):**
   ```bash
   # Create .env file (optional)
   PORT=3000
   ```

4. **Start the server:**
   ```bash
   npm start
   ```

   The server will start on `http://localhost:3000` (or the port specified in `PORT` environment variable).

## Local Development

For development with auto-reload:

```bash
npm run dev
```

## Deployment

### Railway Deployment

1. **Install Railway CLI** (if not already installed):
   ```bash
   npm i -g @railway/cli
   ```

2. **Login to Railway:**
   ```bash
   railway login
   ```

3. **Initialize Railway project:**
   ```bash
   railway init
   ```

4. **Deploy:**
   ```bash
   railway up
   ```

5. **Get your deployment URL:**
   ```bash
   railway domain
   ```

The `railway.json` file is already configured with:
- Build command: `npm install`
- Start command: `node server.js`
- Health check endpoint: `/health`

### Environment Variables

Set these in Railway dashboard or via CLI:

- `PORT` (optional): Server port (defaults to 3000)

## Connecting from ChatGPT

1. **Get your server URL** from Railway deployment

2. **In ChatGPT Developer Mode:**
   - Navigate to your app settings
   - Add MCP server URL: `https://your-railway-url.railway.app/mcp`
   - The server will be available for ChatGPT to use

3. **Test the connection:**
   - Ask ChatGPT to generate a Mermaid diagram
   - ChatGPT will use the `generate_diagram` tool
   - The diagram will render in the interactive UI component

## API Reference

### MCP Endpoints

#### `POST /mcp`

Main MCP JSON-RPC endpoint. Handles:
- `tools/list` - Lists available tools
- `tools/call` - Executes a tool
- `resources/list` - Lists available resources
- `resources/read` - Reads a resource

#### `GET /health`

Health check endpoint. Returns:
```json
{
  "status": "healthy",
  "server": "mermaid-visualizer",
  "version": "1.0.0",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

#### `POST /upload`

File upload endpoint. Accepts multipart/form-data with a `file` field.

**Response:**
```json
{
  "success": true,
  "mermaid_code": "flowchart TD\n...",
  "parsed_data": {...}
}
```

#### `GET /template/mermaid-viewer`

Serves the UI template component directly.

### MCP Tools

#### `generate_diagram`

Converts text or data into Mermaid diagram code.

**Input:**
```json
{
  "text": "User login -> Authentication -> Dashboard",
  "diagramType": "flowchart"  // Optional: flowchart, sequence, class, er, gantt, pie, git
}
```

**Output:**
```json
{
  "mermaid_code": "flowchart TD\n    A[\"User login\"] --> B[\"Authentication\"] --> C[\"Dashboard\"]",
  "diagram_type": "flowchart"
}
```

#### `parse_file`

Parses uploaded CSV/JSON/TXT and converts to Mermaid.

**Input:**
```json
{
  "file_content": "name,age\nJohn,30\nJane,25",
  "file_type": "csv"
}
```

**Output:**
```json
{
  "mermaid_code": "flowchart TD\n    Node0[\"name,age\"] --> Node1[\"John,30\"] --> Node2[\"Jane,25\"]",
  "parsed_data": [
    {"name": "John", "age": "30"},
    {"name": "Jane", "age": "25"}
  ]
}
```

### MCP Resources

#### `template://mermaid-viewer`

Interactive UI component for viewing and editing Mermaid diagrams.

**Features:**
- Renders Mermaid diagrams
- Edit code in textarea
- Download as PNG
- Regenerate diagrams
- Dark mode support

## Usage Examples

### Generate a Flowchart

Ask ChatGPT:
```
"Create a flowchart showing the user registration process"
```

ChatGPT will call `generate_diagram` with:
```json
{
  "text": "user registration process",
  "diagramType": "flowchart"
}
```

### Parse a CSV File

Upload a CSV file through the file upload endpoint or ask ChatGPT to parse it. The server will automatically convert it to a Mermaid diagram.

### Edit and Download

1. The diagram renders in the interactive UI
2. Edit the Mermaid code in the textarea
3. Click "Refresh Diagram" to see changes
4. Click "Download PNG" to save as image

## Security

- **Input Validation**: All inputs validated using Zod schemas
- **File Upload Limits**: Max 5MB file size, type validation
- **CORS**: Enabled for ChatGPT origin only
- **Error Handling**: Comprehensive error handling with user-friendly messages

## Troubleshooting

### Server won't start

- Check Node.js version: `node --version` (must be >= 18.0.0)
- Verify dependencies: `npm install`
- Check port availability: Ensure PORT is not in use

### MCP connection fails

- Verify server is running: Check `/health` endpoint
- Check CORS settings: Ensure ChatGPT origin is allowed
- Verify MCP endpoint: Test `POST /mcp` with proper JSON-RPC format

### Diagrams not rendering

- Check browser console for errors
- Verify Mermaid library loaded: Check network tab
- Ensure tool output format is correct: Should contain `mermaid_code` field

### File upload fails

- Check file size: Must be < 5MB
- Verify file type: Only CSV, JSON, TXT allowed
- Check file encoding: Should be UTF-8

## Development

### Code Style

- ES modules (`import`/`export`)
- Async/await for async operations
- Comprehensive error handling
- Comments explaining MCP protocol parts

### Testing

Test the server locally:

```bash
# Health check
curl http://localhost:3000/health

# List tools
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'

# Call generate_diagram tool
curl -X POST http://localhost:3000/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/call","params":{"name":"generate_diagram","arguments":{"text":"A -> B -> C"}},"id":2}'
```

## License

MIT

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review OpenAI Apps SDK documentation: https://developers.openai.com/apps-sdk
3. Check MCP specification: https://modelcontextprotocol.io

