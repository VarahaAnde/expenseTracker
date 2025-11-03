# Server Setup Guide

## Quick Summary: What This Server Does

1. **Serves your frontend files** (HTML/CSS/JS) to the browser
2. **Provides API endpoints** for reading/writing transactions
3. **Stores data** in a CSV file (`backend/data/transactions.csv`)

## Parts You Need to Customize

### 1. Port Number (Line ~7)
```javascript
const PORT = 3000;  // Change if 3000 is already in use
```
**Why:** If you're running other apps on port 3000, change to 3001, 8080, etc.

### 2. Frontend Folder Path (Line ~9-10)
```javascript
const FRONTEND_PATH = path.join(__dirname, '..', 'frontend');
```
**Already updated** to point to `frontend` folder based on your structure.

**If your structure is different:**
- If HTML is in `public` folder: `path.join(__dirname, '..', 'public')`
- If HTML is in root: `path.join(__dirname, '..')`

### 3. HTML Filename (Line ~73)
```javascript
res.sendFile(path.join(FRONTEND_PATH, 'expenseTracker.html'));
```
**Make sure** this matches your actual HTML filename exactly.

## Initial Setup Steps

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Start the server:**
   ```bash
   npm start
   ```
   or
   ```bash
   node server.js
   ```

3. **Visit in browser:**
   ```
   http://localhost:3000
   ```

## How It Works: Request Flow

### When user adds a transaction:
1. Frontend JavaScript calls: `POST /api/transactions` with transaction data
2. Server validates the data (required fields, valid number)
3. Server generates unique ID
4. Server adds to memory array
5. Server appends to CSV file
6. Server sends back the created transaction
7. Frontend updates the UI

### When page loads/refreshes:
1. Frontend JavaScript calls: `GET /api/transactions`
2. Server reads from CSV file (if first time) or from memory
3. Server sends JSON array of all transactions
4. Frontend displays them in the table

## Data Storage

- **Location:** `backend/data/transactions.csv`
- **Format:** CSV (Comma-Separated Values)
- **Structure:** First row is headers, each row after is a transaction
- **Example:**
  ```
  id,date,category,payee,amount,notes
  123,2025-10-02,Groceries,Trader Joe's,-42.18,Bought food
  124,2025-10-02,Income,Paycheck,500,Monthly salary
  ```

## Important Notes

- **In-Memory Cache:** Transactions are loaded into memory on server start. If you edit CSV manually, restart server to reload.
- **No Database:** This uses a simple CSV file. For production apps, you'd use PostgreSQL, MongoDB, etc.
- **No Authentication:** Anyone can access the API. For production, add authentication/authorization.

