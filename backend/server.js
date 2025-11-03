// =============================================================================
// SERVER SETUP - Basic Express Server for Expense Tracker
// =============================================================================
// This server handles:
// 1. Serving your HTML/CSS/JS files to the browser
// 2. Providing API endpoints to read/write transaction data
// 3. Storing data in a CSV file (simple file-based database)
// =============================================================================

// -----------------------------------------------------------------------------
// STEP 1: IMPORT REQUIRED MODULES
// -----------------------------------------------------------------------------
// These are Node.js modules that come built-in or are installed via npm
// WHY NEEDED:
// - express: Web framework to create REST API endpoints and serve files
// - fs: File system operations to read/write CSV file
// - path: Cross-platform path handling (Windows uses \, Unix uses /)
const express = require('express');
const fs = require('fs');
const path = require('path');

// -----------------------------------------------------------------------------
// STEP 2: INITIALIZE EXPRESS APP AND SET CONFIGURATION
// -----------------------------------------------------------------------------
// WHY NEEDED: Creates the web server that listens for HTTP requests
const app = express();
const PORT = 3000;  // ⚠️ CUSTOMIZE: Change if port 3000 is already in use

// -----------------------------------------------------------------------------
// STEP 3: DEFINE FILE PATHS (IMPORTANT - MAY NEED CUSTOMIZATION)
// -----------------------------------------------------------------------------
// WHY NEEDED: Tells server where to find/save files
// __dirname = the folder where server.js is located (backend folder)
// ⚠️ CUSTOMIZE THESE PATHS based on your folder structure:
// - If HTML/CSS/JS are in 'frontend' folder, change 'public' to 'frontend'
// - If you want data stored elsewhere, adjust 'data' folder name
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');  // ⚠️ UPDATED: Points to frontend folder
const CSV_PATH = path.join(__dirname, 'data', 'transactions.csv');  // Where transactions are saved

// -----------------------------------------------------------------------------
// STEP 4: ENSURE DATA FILE EXISTS (CSV Initialization)
// -----------------------------------------------------------------------------
// WHY NEEDED: Creates the CSV file and data folder if they don't exist yet
// Without this, the app would crash on first run if data folder doesn't exist
function ensureCsv() {
  const dir = path.dirname(CSV_PATH);  // Get 'backend/data' folder path
  if (!fs.existsSync(dir)) {
    // Create 'data' folder if it doesn't exist (recursive = create parent folders too)
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(CSV_PATH)) {
    // Create CSV file with header row if it doesn't exist
    // Header row defines column names: id, date, category, payee, amount, notes
    fs.writeFileSync(CSV_PATH, 'id,date,category,payee,amount,notes\n', 'utf8');
  }
}

// -----------------------------------------------------------------------------
// STEP 5: CSV HELPER FUNCTIONS (Data Reading/Writing)
// -----------------------------------------------------------------------------
// WHY NEEDED: CSV is a simple text format. These functions convert between:
// - CSV lines (strings) ↔ JavaScript objects (usable in code)

// Convert one CSV line into a JavaScript object
// Example: "123,2025-10-02,Groceries,Trader Joe's,-42.18,Bought food"
// Becomes: { id: "123", date: "2025-10-02", category: "Groceries", ... }
function parseCsvLine(line) {
  const [id, date, category, payee, amount, notes] = line.split(',');
  return { 
    id, 
    date, 
    category, 
    payee, 
    amount: Number(amount),  // Convert string to number (important for calculations)
    notes: notes ?? ''       // Use empty string if notes is null/undefined
  };
}

// Convert a JavaScript object back into a CSV line string
// WHY NEEDED: When saving new transactions, convert object → CSV format
function toCsvLine(rec) {
  // Helper: Remove commas from strings (would break CSV format) and clean up
  const safe = s => String(s ?? '').replace(/,/g, ' ').trim();
  return [
    safe(rec.id), 
    safe(rec.date), 
    safe(rec.category),
    safe(rec.payee), 
    String(Number(rec.amount) || 0),  // Ensure amount is valid number
    safe(rec.notes)
  ].join(',') + '\n';  // Join with commas, add newline
}

// Load all transactions from CSV file into memory
// WHY NEEDED: 
// - Reads CSV file
// - Skips header row (first line)
// - Converts each line to JavaScript object
// - Returns array of all transactions
function loadAll() {
  ensureCsv();  // Make sure file exists before reading
  const raw = fs.readFileSync(CSV_PATH, 'utf8').trim();  // Read entire file as text
  const lines = raw.split('\n');                          // Split into array of lines
  const rows = lines.slice(1).filter(Boolean);            // Skip header, remove empty lines
  return rows.map(parseCsvLine);                          // Convert each line to object
}

// Append one new transaction to the CSV file
// WHY NEEDED: When user adds transaction, save it to file permanently
function appendOne(rec) {
  fs.appendFileSync(CSV_PATH, toCsvLine(rec), 'utf8');  // Add to end of file
}

// -----------------------------------------------------------------------------
// STEP 6: LOAD DATA INTO MEMORY
// -----------------------------------------------------------------------------
// WHY NEEDED: Keep all transactions in memory for fast API responses
// When server starts, load all existing transactions
// ⚠️ NOTE: This is a simple approach. For production apps, you'd use a real database
let transactions = loadAll();

// -----------------------------------------------------------------------------
// STEP 7: MIDDLEWARE SETUP
// -----------------------------------------------------------------------------
// WHY NEEDED: Middleware = code that runs on every request before route handlers

// Parse JSON request bodies (when frontend sends data)
// Example: Frontend sends { "amount": 50, "category": "Groceries" }
// This middleware converts JSON string → JavaScript object (req.body)
app.use(express.json());

// Serve static files (HTML, CSS, JS, images)
// WHY NEEDED: When browser requests /expenseTracker.html, serve the file
// FRONTEND_PATH tells Express where your frontend files are located
app.use(express.static(FRONTEND_PATH));

// -----------------------------------------------------------------------------
// STEP 8: API ENDPOINTS (Routes)
// -----------------------------------------------------------------------------
// WHY NEEDED: Define URLs that frontend can call to get/send data

// GET /api/transactions - Retrieve all transactions
// Frontend calls: fetch('/api/transactions')
// Returns: JSON array of all transactions
app.get('/api/transactions', (req, res) => {
  res.json(transactions);  // Send transactions array as JSON
});

// POST /api/transactions - Add a new transaction
// Frontend calls: fetch('/api/transactions', { method: 'POST', body: {...} })
// WHY NEEDED: This is how users add new expenses/income
app.post('/api/transactions', (req, res) => {
  // Extract data from request body (frontend sends this)
  const { date, category, payee, amount, notes } = req.body || {};
  
  // VALIDATION: Check required fields are present
  // WHY NEEDED: Prevent saving invalid/incomplete data
  if (!date || !category || amount === undefined) {
    return res.status(400).json({ error: 'date, category, and amount are required' });
  }
  
  // VALIDATION: Ensure amount is a valid number
  const numAmt = Number(amount);
  if (Number.isNaN(numAmt)) {
    return res.status(400).json({ error: 'amount must be a number' });
  }

  // Generate unique ID for this transaction
  // WHY NEEDED: Each transaction needs unique identifier
  // Uses crypto.randomUUID() if available (better), otherwise uses timestamp
  const id = (global.crypto?.randomUUID?.() || Date.now().toString());
  
  // Create transaction object with all data
  const rec = { 
    id, 
    date, 
    category, 
    payee: payee || '',    // Default to empty string if not provided
    amount: numAmt,        // Use validated number
    notes: notes || '' 
  };

  // Save to memory (for immediate API responses)
  transactions.push(rec);
  
  // Save to file (for persistence - survives server restart)
  appendOne(rec);
  
  // Send back the created transaction as confirmation
  res.json(rec);
});

// -----------------------------------------------------------------------------
// STEP 9: SERVE HTML PAGE AS HOME ROUTE
// -----------------------------------------------------------------------------
// WHY NEEDED: When user visits http://localhost:3000/, show the expense tracker page
// ⚠️ CUSTOMIZE: Make sure filename matches your HTML file
app.get('/', (_req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'expenseTracker.html'));  // ⚠️ UPDATE if different filename
});

// -----------------------------------------------------------------------------
// STEP 10: START THE SERVER
// -----------------------------------------------------------------------------
// WHY NEEDED: Actually starts listening for HTTP requests on the specified port
// Once this runs, you can visit http://localhost:PORT in your browser
app.listen(PORT, () => {
  console.log(`Running at http://localhost:${PORT}`);
  // After starting, call ensureCsv() to make sure data file exists
  ensureCsv();
});
