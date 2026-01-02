/**
 * MCP Server for Mermaid Diagram Visualizer
 * Implements OpenAI's Model Context Protocol (MCP) specification
 * for ChatGPT Apps SDK integration
 */

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { z } from 'zod';
import Papa from 'papaparse';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// ES module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration for ChatGPT origin
const corsOptions = {
  origin: function (origin, callback) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:26',message:'CORS origin check',data:{origin,allowedOrigins:['https://chat.openai.com','https://chatgpt.com','http://localhost:3000'],isNgrok:origin&&origin.includes('ngrok'),isAllowed:!origin||['https://chat.openai.com','https://chatgpt.com','http://localhost:3000'].includes(origin)||origin.includes('ngrok')},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    // Allow ChatGPT origins and ngrok URLs
    if (['https://chat.openai.com', 'https://chatgpt.com', 'http://localhost:3000'].includes(origin) || origin.includes('ngrok')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// #region agent log
app.use((req, res, next) => {
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:37',message:'Incoming request',data:{method:req.method,path:req.path,origin:req.headers.origin,userAgent:req.headers['user-agent'],contentType:req.headers['content-type']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  next();
});
// #endregion
app.use(cors(corsOptions));
// #region agent log
app.use((req, res, next) => {
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:44',message:'After CORS middleware',data:{origin:req.headers.origin,method:req.method,path:req.path},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
  next();
});
// #endregion
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Multer configuration for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/json', 'text/plain'];
    const allowedExtensions = ['.csv', '.json', '.txt'];
    const fileExt = file.originalname.toLowerCase().substring(file.originalname.lastIndexOf('.'));
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only CSV, JSON, and TXT files are allowed.'), false);
    }
  }
});

// MCP Server Name
const SERVER_NAME = 'mermaid-visualizer';
const SERVER_VERSION = '1.0.0';

/**
 * MCP Tool: generate_diagram
 * Converts text or data into Mermaid diagram code
 */
const generateDiagramSchema = z.object({
  text: z.string().min(1, 'Text input is required'),
  diagramType: z.enum(['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie', 'git']).optional()
});

/**
 * Generate Mermaid diagram code from text input
 * Uses proper Mermaid syntax for each diagram type
 */
function generateMermaidCode(text, diagramType = 'flowchart') {
  const normalizedText = text.trim();
  
  // Validate diagram type
  const validTypes = ['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie', 'git'];
  if (diagramType && !validTypes.includes(diagramType)) {
    throw new Error(`Invalid diagram type: ${diagramType}. Valid types are: ${validTypes.join(', ')}`);
  }
  
  // Auto-detect diagram type if not specified
  if (!diagramType) {
    if (normalizedText.toLowerCase().includes('sequence') || normalizedText.includes('->')) {
      diagramType = 'sequence';
    } else if (normalizedText.toLowerCase().includes('class') || normalizedText.includes('{')) {
      diagramType = 'class';
    } else if (normalizedText.toLowerCase().includes('entity') || normalizedText.toLowerCase().includes('relationship')) {
      diagramType = 'er';
    } else {
      diagramType = 'flowchart';
    }
  }

  let mermaidCode = '';

  // Generate proper Mermaid syntax based on type
  if (diagramType === 'flowchart') {
    mermaidCode = `flowchart TD
    Start["${normalizedText}"]
    Start --> Process[Processing]
    Process --> Decision{Success?}
    Decision -->|Yes| End[Complete]
    Decision -->|No| Error[Handle Error]`;
  } else if (diagramType === 'sequence') {
    mermaidCode = `sequenceDiagram
    participant User
    participant System
    User->>System: ${normalizedText}
    System-->>User: Response`;
  } else if (diagramType === 'class') {
    const className = normalizedText.replace(/\s+/g, '');
    mermaidCode = `classDiagram
    class ${className} {
        +String id
        +String name
        +process()
    }`;
  } else if (diagramType === 'er') {
    const entityName = normalizedText.replace(/\s+/g, '_');
    mermaidCode = `erDiagram
    ENTITY {
        string id
        string ${entityName}
    }`;
  } else if (diagramType === 'gantt') {
    mermaidCode = `gantt
    title ${normalizedText}
    dateFormat YYYY-MM-DD
    section Phase 1
    Task 1: 2024-01-01, 7d`;
  } else if (diagramType === 'pie') {
    mermaidCode = `pie title ${normalizedText}
    "Item 1" : 30
    "Item 2" : 25
    "Item 3" : 45`;
  } else if (diagramType === 'git') {
    mermaidCode = `gitGraph
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`;
  } else {
    // Fallback to flowchart
    mermaidCode = `flowchart TD
    Start["${normalizedText}"]
    Start --> Process[Processing]
    Process --> End[Complete]`;
  }

  return { mermaid_code: mermaidCode, diagram_type: diagramType };
}

/**
 * Generate flowchart diagram
 */
function generateFlowchart(text) {
  const lines = text.split('\n').filter(line => line.trim());
  let flowchart = 'flowchart TD\n';
  
  // Simple heuristic: if text contains arrows or steps, parse them
  if (text.includes('->') || text.includes('→')) {
    const steps = text.split(/[->→]/).map(s => s.trim()).filter(s => s);
    steps.forEach((step, index) => {
      const nodeId = `A${index}`;
      flowchart += `    ${nodeId}["${step}"]\n`;
      if (index < steps.length - 1) {
        flowchart += `    ${nodeId} --> A${index + 1}\n`;
      }
    });
  } else {
    // Create simple nodes from lines
    lines.forEach((line, index) => {
      const nodeId = `A${index}`;
      flowchart += `    ${nodeId}["${line}"]\n`;
      if (index < lines.length - 1) {
        flowchart += `    ${nodeId} --> A${index + 1}\n`;
      }
    });
  }
  
  return flowchart;
}

/**
 * Generate sequence diagram
 */
function generateSequence(text) {
  const lines = text.split('\n').filter(line => line.trim());
  let sequence = 'sequenceDiagram\n';
  
  // Extract participants and messages
  const participants = new Set();
  lines.forEach(line => {
    if (line.includes('->') || line.includes('→')) {
      const parts = line.split(/[->→]/).map(s => s.trim());
      if (parts.length >= 2) {
        participants.add(parts[0]);
        participants.add(parts[1]);
      }
    }
  });
  
  participants.forEach(participant => {
    sequence += `    participant ${participant.replace(/\s+/g, '')} as ${participant}\n`;
  });
  
  lines.forEach(line => {
    if (line.includes('->') || line.includes('→')) {
      const parts = line.split(/[->→]/).map(s => s.trim());
      if (parts.length >= 2) {
        const from = parts[0].replace(/\s+/g, '');
        const to = parts[1].replace(/\s+/g, '');
        const message = parts[2] || 'message';
        sequence += `    ${from}->>${to}: ${message}\n`;
      }
    }
  });
  
  return sequence;
}

/**
 * Generate class diagram
 */
function generateClassDiagram(text) {
  const lines = text.split('\n').filter(line => line.trim());
  let classDiagram = 'classDiagram\n';
  
  lines.forEach(line => {
    if (line.includes('class') || line.includes('{')) {
      const className = line.replace(/class\s+/i, '').replace(/\s*\{.*/, '').trim();
      if (className) {
        classDiagram += `    class ${className.replace(/\s+/g, '')} {\n`;
        classDiagram += `        +${className}\n`;
        classDiagram += `    }\n`;
      }
    } else if (line.trim()) {
      const className = line.trim().replace(/\s+/g, '');
      classDiagram += `    class ${className}\n`;
    }
  });
  
  return classDiagram;
}

/**
 * Generate ER diagram
 */
function generateERDiagram(text) {
  const lines = text.split('\n').filter(line => line.trim());
  let erDiagram = 'erDiagram\n';
  
  lines.forEach(line => {
    if (line.toLowerCase().includes('entity')) {
      const entityName = line.replace(/entity\s*/i, '').trim().replace(/\s+/g, '');
      if (entityName) {
        erDiagram += `    ${entityName} {\n`;
        erDiagram += `        string id\n`;
        erDiagram += `    }\n`;
      }
    }
  });
  
  return erDiagram;
}

/**
 * Generate Gantt chart
 */
function generateGantt(text) {
  return `gantt
    title Gantt Chart
    dateFormat YYYY-MM-DD
    section Section
    Task 1 :a1, 2024-01-01, 30d
    Task 2 :a2, after a1, 20d`;
}

/**
 * Generate pie chart
 */
function generatePieChart(text) {
  const lines = text.split('\n').filter(line => line.trim());
  let pie = 'pie title Distribution\n';
  
  lines.forEach((line, index) => {
    const parts = line.split(/[:,\t]/).map(s => s.trim());
    if (parts.length >= 2) {
      const label = parts[0];
      const value = parts[1] || '10';
      pie += `    "${label}" : ${value}\n`;
    } else if (line.trim()) {
      pie += `    "${line.trim()}" : 10\n`;
    }
  });
  
  return pie;
}

/**
 * Generate git graph
 */
function generateGitGraph(text) {
  return `gitGraph
    commit
    branch develop
    checkout develop
    commit
    commit
    checkout main
    merge develop
    commit`;
}

/**
 * MCP Tool: parse_file
 * Parses uploaded CSV/JSON/TXT and converts to Mermaid
 */
const parseFileSchema = z.object({
  file_content: z.string().min(1, 'File content is required'),
  file_type: z.enum(['csv', 'json', 'txt'])
});

/**
 * Parse file content and convert to Mermaid diagram
 */
function parseFileToMermaid(fileContent, fileType) {
  let parsedData = {};
  let mermaidCode = '';

  try {
    switch (fileType.toLowerCase()) {
      case 'csv':
        const csvResult = Papa.parse(fileContent, {
          header: true,
          skipEmptyLines: true
        });
        parsedData = csvResult.data;
        
        // Convert CSV to flowchart
        if (csvResult.data.length > 0) {
          const headers = Object.keys(csvResult.data[0]);
          mermaidCode = 'flowchart TD\n';
          csvResult.data.forEach((row, index) => {
            const nodeId = `Node${index}`;
            const label = Object.values(row).join(', ');
            mermaidCode += `    ${nodeId}["${label}"]\n`;
            if (index < csvResult.data.length - 1) {
              mermaidCode += `    ${nodeId} --> Node${index + 1}\n`;
            }
          });
        }
        break;

      case 'json':
        parsedData = JSON.parse(fileContent);
        
        // Convert JSON to flowchart or class diagram
        if (Array.isArray(parsedData)) {
          mermaidCode = 'flowchart TD\n';
          parsedData.forEach((item, index) => {
            const nodeId = `Node${index}`;
            const label = typeof item === 'object' ? JSON.stringify(item).substring(0, 50) : String(item);
            mermaidCode += `    ${nodeId}["${label}"]\n`;
            if (index < parsedData.length - 1) {
              mermaidCode += `    ${nodeId} --> Node${index + 1}\n`;
            }
          });
        } else if (typeof parsedData === 'object') {
          mermaidCode = 'classDiagram\n';
          Object.keys(parsedData).forEach(key => {
            const className = key.replace(/\s+/g, '');
            mermaidCode += `    class ${className} {\n`;
            mermaidCode += `        +${key}\n`;
            mermaidCode += `    }\n`;
          });
        }
        break;

      case 'txt':
        const lines = fileContent.split('\n').filter(line => line.trim());
        parsedData = { lines: lines };
        mermaidCode = generateFlowchart(fileContent);
        break;

      default:
        throw new Error(`Unsupported file type: ${fileType}`);
    }
  } catch (error) {
    throw new Error(`Failed to parse ${fileType} file: ${error.message}`);
  }

  return { mermaid_code: mermaidCode, parsed_data: parsedData };
}

/**
 * MCP JSON-RPC Handler Function
 * Handles MCP protocol requests (tools/list, tools/call, resources/list, resources/read)
 * This function can be called by both the /mcp endpoint and REST wrapper endpoints
 */
async function handleMCPRequest(req, res) {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:371',message:'MCP handler entry',data:{method:req.method,path:req.path,body:req.body,headers:Object.keys(req.headers)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
  // #endregion
  try {
    const { method, params, id } = req.body;
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:375',message:'Parsed MCP request body',data:{method,params:params?Object.keys(params):null,id,hasMethod:!!method,hasId:typeof id!=='undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion

    // MCP protocol uses JSON-RPC 2.0
    if (!method || typeof id === 'undefined') {
      // #region agent log
      fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:377',message:'Invalid MCP request - missing method or id',data:{hasMethod:!!method,hasId:typeof id!=='undefined',body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
      // #endregion
      return res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32600,
          message: 'Invalid Request'
        },
        id: null
      });
    }

    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
            resources: {}
          },
          serverInfo: {
            name: SERVER_NAME,
            version: SERVER_VERSION
          }
        };
        break;

      case 'tools/list':
        result = {
          tools: [
            {
              name: 'generate_diagram',
              description: 'Convert text or data into Mermaid diagram code',
              inputSchema: {
                type: 'object',
                properties: {
                  text: {
                    type: 'string',
                    description: 'Text or data to convert into a Mermaid diagram'
                  },
                  diagramType: {
                    type: 'string',
                    enum: ['flowchart', 'sequence', 'class', 'er', 'gantt', 'pie', 'git'],
                    description: 'Type of diagram to generate (optional, auto-detected if not provided)'
                  }
                },
                required: ['text']
              },
              _meta: {
                'openai/outputTemplate': 'template://mermaid-viewer'
              }
            },
            {
              name: 'parse_file',
              description: 'Parse uploaded CSV/JSON/TXT and convert to Mermaid',
              inputSchema: {
                type: 'object',
                properties: {
                  file_content: {
                    type: 'string',
                    description: 'Content of the uploaded file'
                  },
                  file_type: {
                    type: 'string',
                    enum: ['csv', 'json', 'txt'],
                    description: 'Type of the file (csv, json, or txt)'
                  }
                },
                required: ['file_content', 'file_type']
              },
              _meta: {
                'openai/outputTemplate': 'template://mermaid-viewer'
              }
            }
          ]
        };
        break;

      case 'tools/call':
        const { name, arguments: toolArgs } = params || {};
        
        if (!name) {
          return res.status(400).json({
            jsonrpc: '2.0',
            error: {
              code: -32602,
              message: 'Invalid params: tool name is required'
            },
            id
          });
        }

        try {
          if (name === 'generate_diagram') {
            const validated = generateDiagramSchema.parse(toolArgs);
            const { text, diagramType = 'flowchart' } = validated;
            let mermaidCode = '';
            
            if (diagramType === 'flowchart') {
              // Detect pattern and generate appropriate flowchart
              const lowerText = text.toLowerCase();
              
              if (lowerText.includes('login') || lowerText.includes('sign in')) {
                mermaidCode = `flowchart TD
    A[User Opens App] --> B[Enter Credentials]
    B --> C{Valid Credentials?}
    C -->|Yes| D[Generate Session]
    C -->|No| E[Show Error Message]
    D --> F[Redirect to Dashboard]
    E --> B`;
              } else if (lowerText.includes('register') || lowerText.includes('signup')) {
                mermaidCode = `flowchart TD
    A[User Clicks Register] --> B[Fill Registration Form]
    B --> C[Submit Information]
    C --> D{Validation Check}
    D -->|Valid| E[Create Account]
    D -->|Invalid| F[Show Errors]
    E --> G[Send Verification Email]
    F --> B
    G --> H[User Verifies Email]
    H --> I[Account Activated]`;
              } else if (lowerText.includes('payment') || lowerText.includes('checkout')) {
                mermaidCode = `flowchart TD
    A[Add Items to Cart] --> B[Proceed to Checkout]
    B --> C[Enter Payment Details]
    C --> D[Process Payment]
    D --> E{Payment Success?}
    E -->|Yes| F[Order Confirmed]
    E -->|No| G[Payment Failed]
    F --> H[Send Receipt]
    G --> C`;
              } else {
                // Generic workflow
                const title = text.substring(0, 40);
                mermaidCode = `flowchart TD
    A[Start: ${title}] --> B[Receive Input]
    B --> C{Validate Input}
    C -->|Valid| D[Process Request]
    C -->|Invalid| E[Return Error]
    D --> F[Execute Action]
    F --> G[Return Success]
    E --> H[End]
    G --> H`;
              }
            } else if (diagramType === 'sequence') {
              const lowerText = text.toLowerCase();
              
              if (lowerText.includes('api') || lowerText.includes('request')) {
                mermaidCode = `sequenceDiagram
    participant Client
    participant API
    participant Database
    Client->>API: ${text}
    API->>Database: Query Data
    Database-->>API: Results
    API-->>Client: JSON Response`;
              } else if (lowerText.includes('order') || lowerText.includes('pizza')) {
                mermaidCode = `sequenceDiagram
    participant Customer
    participant Website
    participant Kitchen
    participant Delivery
    Customer->>Website: Place Order
    Website->>Kitchen: Send Order Details
    Kitchen->>Kitchen: Prepare Food
    Kitchen->>Delivery: Ready for Pickup
    Delivery->>Customer: Deliver Order
    Customer->>Website: Confirm Receipt`;
              } else {
                mermaidCode = `sequenceDiagram
    participant User
    participant System
    participant Service
    User->>System: ${text}
    System->>Service: Process Request
    Service-->>System: Return Data
    System-->>User: Display Result`;
              }
            } else if (diagramType === 'class') {
              const className = text.replace(/\s+/g, '');
              mermaidCode = `classDiagram
    class ${className} {
        -id: String
        -name: String
        -createdAt: Date
        +create()
        +update()
        +delete()
        +find()
    }
    class Database {
        +save()
        +query()
    }
    ${className} --> Database`;
            } else if (diagramType === 'er') {
              mermaidCode = `erDiagram
    USER ||--o{ ORDER : places
    USER {
        int id
        string name
        string email
    }
    ORDER ||--|{ ORDER_ITEM : contains
    ORDER {
        int id
        int user_id
        date created_at
    }
    ORDER_ITEM {
        int id
        int order_id
        int product_id
        int quantity
    }
    PRODUCT ||--o{ ORDER_ITEM : "ordered in"
    PRODUCT {
        int id
        string name
        decimal price
    }`;
            } else if (diagramType === 'gantt') {
              mermaidCode = `gantt
    title ${text}
    dateFormat YYYY-MM-DD
    section Planning
    Requirements Gathering: 2024-01-01, 7d
    Design Phase: 2024-01-08, 10d
    section Development
    Backend Development: 2024-01-18, 14d
    Frontend Development: 2024-01-25, 14d
    section Testing
    QA Testing: 2024-02-08, 7d
    User Acceptance: 2024-02-15, 5d`;
            }
            
            result = {
              content: [{
                type: 'text',
                text: `Generated ${diagramType} diagram: ${text}`
              }],
              _meta: {
                'openai/outputTemplate': 'template://mermaid-viewer'
              },
              mermaid_code: mermaidCode,
              diagram_type: diagramType,
              input_text: text,
              isError: false
            };
          } else if (name === 'parse_file') {
            const validated = parseFileSchema.parse(toolArgs);
            const parseResult = parseFileToMermaid(validated.file_content, validated.file_type);
            
            // Create user-friendly message based on file type
            const fileTypeName = validated.file_type.toUpperCase();
            const userMessage = `Parsed ${fileTypeName} file and generated Mermaid diagram`;
            
            result = {
              content: [
                {
                  type: 'text',
                  text: userMessage
                }
              ],
              mermaid_code: parseResult.mermaid_code,
              parsed_data: parseResult.parsed_data,
              _meta: {
                'openai/outputTemplate': 'template://mermaid-viewer'
              },
              isError: false
            };
          } else {
            throw new Error(`Unknown tool: ${name}`);
          }
        } catch (error) {
          if (error instanceof z.ZodError) {
            return res.status(400).json({
              jsonrpc: '2.0',
              error: {
                code: -32602,
                message: 'Invalid params',
                data: error.errors
              },
              id
            });
          }
          throw error;
        }
        break;

      case 'resources/list':
        result = {
          resources: [
            {
              uri: 'template://mermaid-viewer',
              name: 'Mermaid Diagram Viewer',
              description: 'Interactive UI component for viewing and editing Mermaid diagrams',
              mimeType: 'text/html'
            }
          ]
        };
        break;

      case 'resources/read':
        const { uri } = params || {};
        
        if (uri === 'template://mermaid-viewer') {
          try {
            const templatePath = join(__dirname, 'templates', 'mermaid-viewer.html');
            const templateContent = readFileSync(templatePath, 'utf8');
            result = {
              contents: [
                {
                  uri: 'template://mermaid-viewer',
                  mimeType: 'text/html',
                  text: templateContent
                }
              ]
            };
          } catch (error) {
            return res.status(500).json({
              jsonrpc: '2.0',
              error: {
                code: -32603,
                message: `Failed to read resource: ${error.message}`
              },
              id
            });
          }
        } else {
          return res.status(404).json({
            jsonrpc: '2.0',
            error: {
              code: -32601,
              message: `Resource not found: ${uri}`
            },
            id
          });
        }
        break;

      default:
        return res.status(400).json({
          jsonrpc: '2.0',
          error: {
            code: -32601,
            message: `Method not found: ${method}`
          },
          id
        });
    }

    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:595',message:'Sending MCP response',data:{method,hasResult:!!result,resultKeys:result?Object.keys(result):null,id},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion
    res.json({
      jsonrpc: '2.0',
      result,
      id
    });

  } catch (error) {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:603',message:'MCP handler error',data:{error:error.message,stack:error.stack,body:req.body},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
    // #endregion
    console.error('MCP handler error:', error);
    res.status(500).json({
      jsonrpc: '2.0',
      error: {
        code: -32603,
        message: `Internal error: ${error.message}`
      },
      id: req.body?.id || null
    });
  }
}

/**
 * OAuth discovery (required by ChatGPT even for no-auth apps)
 * These endpoints prevent ChatGPT connector errors during app registration
 */
app.get('/.well-known/oauth-authorization-server', (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:826',message:'OAuth authorization server discovery',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  res.status(404).json({ 
    error: 'not_configured',
    message: 'OAuth not required for this connector'
  });
});

app.get('/.well-known/openid-configuration', (req, res) => {
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:835',message:'OpenID configuration discovery',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  // #endregion
  res.status(404).json({ 
    error: 'not_configured',
    message: 'OAuth not required for this connector'
  });
});

/**
 * MCP JSON-RPC Endpoint
 * Main endpoint for MCP protocol requests
 */

// GET /mcp - Info endpoint for browser/validation
app.get('/mcp', (req, res) => {
  res.json({
    name: "Mermaid Visualizer MCP Server",
    version: "1.0.0",
    status: "healthy",
    protocol: "MCP (Model Context Protocol)",
    description: "Convert text and data into beautiful Mermaid diagrams",
    endpoints: {
      health: `${req.protocol}://${req.get('host')}/health`,
      mcp_post: `${req.protocol}://${req.get('host')}/mcp`
    },
    capabilities: [
      "generate_diagram",
      "parse_file"
    ],
    supported_diagram_types: ["flowchart", "sequence", "class", "er", "gantt"],
    usage: {
      method: "POST",
      content_type: "application/json",
      example: {
        jsonrpc: "2.0",
        method: "tools/list",
        id: 1
      }
    }
  });
});

// #region agent log
app.options('/mcp', (req, res) => {
  fetch('http://127.0.0.1:7242/ingest/56a9e989-8fa0-4cf3-a7bb-742b0d43a189',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'server.js:612',message:'OPTIONS preflight request',data:{origin:req.headers.origin,method:req.method,accessControlRequestMethod:req.headers['access-control-request-method'],accessControlRequestHeaders:req.headers['access-control-request-headers']},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});
// #endregion
app.post('/mcp', handleMCPRequest);

/**
 * File Upload Endpoint
 * Handles file uploads and returns parsed data
 */
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'No file uploaded'
      });
    }

    const fileContent = req.file.buffer.toString('utf8');
    const fileType = req.file.originalname.split('.').pop()?.toLowerCase() || 'txt';

    if (!['csv', 'json', 'txt'].includes(fileType)) {
      return res.status(400).json({
        error: 'Invalid file type. Only CSV, JSON, and TXT files are supported.'
      });
    }

    const result = parseFileToMermaid(fileContent, fileType);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({
      error: `Failed to process file: ${error.message}`
    });
  }
});

/**
 * Health Check Endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    server: SERVER_NAME,
    version: SERVER_VERSION,
    timestamp: new Date().toISOString()
  });
});

/**
 * Serve template resource directly (alternative endpoint)
 */
app.get('/template/mermaid-viewer', (req, res) => {
  try {
    const templatePath = join(__dirname, 'templates', 'mermaid-viewer.html');
    const templateContent = readFileSync(templatePath, 'utf8');
    res.setHeader('Content-Type', 'text/html');
    res.send(templateContent);
  } catch (error) {
    console.error('Template serve error:', error);
    res.status(500).json({
      error: `Failed to serve template: ${error.message}`
    });
  }
});

/**
 * REST API Wrapper Endpoints
 * These provide REST-style endpoints that wrap MCP protocol calls
 */

/**
 * POST /tools/list - List available tools
 */
app.post('/tools/list', async (req, res) => {
  try {
    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/list',
      id: req.body?.id || Date.now()
    };
    
    // Create a wrapper response that extracts the result
    const wrapperRes = {
      json: (data) => {
        if (data.result && data.result.tools) {
          res.json(data.result);
        } else if (data.error) {
          res.status(400).json(data.error);
        } else {
          res.json(data);
        }
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    
    // Call the MCP handler
    await handleMCPRequest({ body: mcpRequest }, wrapperRes);
  } catch (error) {
    console.error('Tools list error:', error);
    res.status(500).json({
      error: `Failed to list tools: ${error.message}`
    });
  }
});

/**
 * POST /tools/call - Execute a tool
 */
app.post('/tools/call', async (req, res) => {
  try {
    const { name, arguments: toolArgs } = req.body;
    
    if (!name) {
      return res.status(400).json({
        error: 'Tool name is required'
      });
    }
    
    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name,
        arguments: toolArgs || {}
      },
      id: req.body?.id || Date.now()
    };
    
    const wrapperRes = {
      json: (data) => {
        if (data.result && data.result.content) {
          // Extract the actual result from MCP response
          const content = data.result.content[0];
          if (content && content.text) {
            try {
              const parsed = JSON.parse(content.text);
              res.json(parsed);
            } catch (e) {
              res.json({ result: content.text });
            }
          } else {
            res.json(data.result);
          }
        } else if (data.error) {
          res.status(400).json(data.error);
        } else {
          res.json(data);
        }
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    
    await handleMCPRequest({ body: mcpRequest }, wrapperRes);
  } catch (error) {
    console.error('Tool call error:', error);
    res.status(500).json({
      error: `Failed to call tool: ${error.message}`
    });
  }
});

/**
 * POST /resources/list - List available resources
 */
app.post('/resources/list', async (req, res) => {
  try {
    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'resources/list',
      id: req.body?.id || Date.now()
    };
    
    const wrapperRes = {
      json: (data) => {
        if (data.result && data.result.resources) {
          res.json(data.result);
        } else if (data.error) {
          res.status(400).json(data.error);
        } else {
          res.json(data);
        }
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    
    await handleMCPRequest({ body: mcpRequest }, wrapperRes);
  } catch (error) {
    console.error('Resources list error:', error);
    res.status(500).json({
      error: `Failed to list resources: ${error.message}`
    });
  }
});

/**
 * POST /resources/read - Read a resource
 */
app.post('/resources/read', async (req, res) => {
  try {
    const { uri } = req.body;
    
    if (!uri) {
      return res.status(400).json({
        error: 'Resource URI is required'
      });
    }
    
    const mcpRequest = {
      jsonrpc: '2.0',
      method: 'resources/read',
      params: { uri },
      id: req.body?.id || Date.now()
    };
    
    const wrapperRes = {
      json: (data) => {
        if (data.result && data.result.contents) {
          res.json(data.result);
        } else if (data.error) {
          res.status(400).json(data.error);
        } else {
          res.json(data);
        }
      },
      status: (code) => ({
        json: (data) => res.status(code).json(data)
      })
    };
    
    await handleMCPRequest({ body: mcpRequest }, wrapperRes);
  } catch (error) {
    console.error('Resource read error:', error);
    res.status(500).json({
      error: `Failed to read resource: ${error.message}`
    });
  }
});

/**
 * Error handling middleware
 */
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

/**
 * Start server
 */
app.listen(PORT, () => {
  console.log(`MCP Server "${SERVER_NAME}" running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`MCP endpoint: http://localhost:${PORT}/mcp`);
});

