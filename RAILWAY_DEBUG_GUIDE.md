# Railway Debugging Guide for ChatGPT Apps

## Step 1: Install and Login to Railway CLI

The Railway CLI is already installed. Now you need to login:

```bash
railway login
```

This will open a browser window for authentication. After logging in, you'll be authenticated.

## Step 2: Link Your Project

Navigate to your project directory and link it to Railway:

```bash
cd C:\Users\Khadin Akbar\canvas-pro
railway link
```

Select your Railway project from the list.

## Step 3: Access Logs

### View Recent Logs

```bash
# View deployment logs
railway logs --deploy

# View all logs (streaming)
railway logs

# View last 100 lines
railway logs --lines 100

# Filter for errors only
railway logs --filter "error"
```

### View Specific Service Logs

```bash
# List services
railway service

# View logs for specific service
railway logs --service <service-name>
```

## Step 4: Debug Diagram Loading Issues

### Common Issues and Solutions

#### Issue 1: Widget Not Receiving Tool Output

**Check in logs:**
```bash
railway logs --filter "toolOutput\|structuredContent\|mermaid_code"
```

**Verify in code:**
- Tool result includes `structuredContent.mermaid_code`
- Resource template has correct `mimeType: 'text/html+skybridge'`
- Widget reads from `window.openai.toolOutput.structuredContent.mermaid_code`

#### Issue 2: MCP Request Failures

**Check MCP endpoint logs:**
```bash
railway logs --filter "MCP\|tools/call\|resources/read"
```

**Look for:**
- 424 errors (protocol version mismatch)
- 500 errors (server errors)
- CORS errors

#### Issue 3: Widget Not Rendering

**Check resource loading:**
```bash
railway logs --filter "resources/read\|template://mermaid-viewer"
```

**Verify:**
- Resource URI matches: `template://mermaid-viewer`
- MIME type is exactly: `text/html+skybridge`
- Template file exists and is readable

## Step 5: Real-time Debugging

### Monitor All Requests

```bash
# Stream all logs in real-time
railway logs --follow

# Filter for POST requests to /mcp
railway logs --follow --filter "POST /mcp"
```

### Check Tool Calls

```bash
# Monitor tool execution
railway logs --follow --filter "tools/call\|Tool Call"
```

## Step 6: Test Endpoints Directly

### Test Health Endpoint

```bash
curl https://canvas-pro-production.up.railway.app/health
```

### Test MCP Endpoint

```bash
curl -X POST https://canvas-pro-production.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/list",
    "id": 1
  }'
```

### Test Tool Call

```bash
curl -X POST https://canvas-pro-production.up.railway.app/mcp \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "generate_diagram",
      "arguments": {
        "text": "test diagram",
        "diagramType": "flowchart"
      }
    },
    "id": 2
  }'
```

## Step 7: Check Widget Template

### Verify Tool Output Structure

The widget expects this structure:

```javascript
{
  structuredContent: {
    mermaid_code: "...",
    diagram_type: "flowchart"
  }
}
```

### Debug Widget Initialization

Add console logging to widget:

```javascript
console.log('Tool output:', window.openai?.toolOutput);
console.log('Structured content:', window.openai?.toolOutput?.structuredContent);
console.log('Mermaid code:', window.openai?.toolOutput?.structuredContent?.mermaid_code);
```

## Step 8: Common Fixes

### Fix 1: Protocol Version Mismatch

If you see 424 errors, ensure your server supports the protocol version ChatGPT requests:

```javascript
// In initialize handler
const supportedVersions = ['2024-11-05', '2025-03-26', '2025-11-25'];
const protocolVersion = supportedVersions.includes(clientProtocolVersion) 
  ? clientProtocolVersion 
  : '2025-11-25';
```

### Fix 2: Widget Not Loading

Check resource metadata:

```javascript
metadata: {
  'openai/widgetDescription': 'Interactive Mermaid diagram viewer',
  'openai/widgetPrefersBorder': true,
  'openai/widgetDomain': 'https://canvas-pro-production.up.railway.app',
  'openai/widgetCSP': {
    connect_domains: ['https://cdn.jsdelivr.net'],
    resource_domains: ['https://cdn.jsdelivr.net', 'https://*.oaistatic.com']
  }
}
```

### Fix 3: Tool Output Not Accessible

Ensure tool result structure:

```javascript
result = {
  content: [{ type: 'text', text: 'Message' }],
  structuredContent: {
    mermaid_code: mermaidCode,
    diagram_type: diagramType
  },
  _meta: {} // Component-only metadata
};
```

## Step 9: Railway Dashboard

You can also access logs via Railway Dashboard:

1. Go to https://railway.app
2. Select your project
3. Click on your service
4. Go to "Logs" tab
5. Filter and search logs

## Step 10: Export Logs for Analysis

```bash
# Export logs to file
railway logs --lines 1000 > logs.txt

# Export with timestamps
railway logs --lines 1000 --json > logs.json
```

## Quick Debugging Commands

```bash
# Check if project is linked
railway status

# View environment variables
railway variables

# View deployments
railway deployments

# View specific deployment logs
railway logs --deployment <deployment-id>

# Restart service
railway restart
```

## Next Steps

1. Run `railway login` in your terminal (interactive)
2. Run `railway link` to link your project
3. Run `railway logs --follow` to monitor in real-time
4. Test your app in ChatGPT and watch the logs
5. Look for errors related to:
   - Tool calls
   - Resource loading
   - Widget initialization
   - Mermaid rendering

