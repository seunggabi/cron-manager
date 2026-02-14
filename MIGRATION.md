# Migration Guide: Client-Server to Electron

## Overview

This document explains the migration from a traditional client-server architecture to Electron desktop app.

## Architecture Changes

### Before: Client-Server

```
┌─────────────┐      HTTP      ┌─────────────┐
│   Frontend  │ ◄──────────────► │   Backend   │
│   (React)   │     (Axios)     │  (Express)  │
│  Port 5173  │                 │  Port 3001  │
└─────────────┘                 └─────────────┘
       │                               │
       │                               │
       ▼                               ▼
   Browser                      Crontab (CLI)
```

### After: Electron

```
┌────────────────────────────────────────────┐
│           Electron Application             │
├────────────────────────────────────────────┤
│  ┌──────────────┐         ┌─────────────┐ │
│  │  Renderer    │   IPC   │    Main     │ │
│  │  (React UI)  │◄───────►│  (Node.js)  │ │
│  │              │         │             │ │
│  └──────────────┘         └─────────────┘ │
│                                  │         │
└──────────────────────────────────┼─────────┘
                                   │
                                   ▼
                            Crontab (CLI)
```

## File Structure Mapping

### Old Structure → New Structure

```
backend/src/services/          → src/main/services/
backend/src/routes/            → src/main/ipc/
frontend/src/                  → frontend/src/ (mostly unchanged)
shared/types/                  → src/shared/types/
```

## Code Changes

### 1. Backend Services (Reused 100%)

**Location**: `backend/src/services/` → `src/main/services/`

No changes needed! The business logic remains identical:
- `crontab.service.ts` - Crontab read/write operations
- `schedule.service.ts` - Schedule validation and parsing

### 2. API Layer (Complete Rewrite)

#### Before: Express Routes

```typescript
// backend/src/routes/jobs.ts
router.get('/', async (req, res) => {
  const jobs = await crontabService.getAllJobs();
  res.json({ success: true, data: jobs });
});
```

#### After: IPC Handlers

```typescript
// src/main/ipc/index.ts
ipcMain.handle('jobs:getAll', async () => {
  try {
    const jobs = await crontabService.getAllJobs();
    return { success: true, data: jobs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
```

### 3. Frontend API Client (Updated)

#### Before: Axios HTTP Client

```typescript
// frontend/src/lib/api.ts (old)
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001',
});

export const jobsApi = {
  getAll: async () => {
    const response = await api.get('/api/jobs');
    return response.data.data;
  },
};
```

#### After: Electron IPC Client

```typescript
// frontend/src/lib/api.ts (new)
export const jobsApi = {
  getAll: async () => {
    const response = await window.electronAPI.jobs.getAll();
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.data;
  },
};
```

### 4. Preload Script (New)

```typescript
// src/preload/index.ts
import { contextBridge, ipcRenderer } from 'electron';

const api = {
  jobs: {
    getAll: () => ipcRenderer.invoke('jobs:getAll'),
    create: (data) => ipcRenderer.invoke('jobs:create', data),
    // ... other methods
  },
};

contextBridge.exposeInMainWorld('electronAPI', api);
```

## Dependencies Changes

### Removed

```json
{
  "express": "^4.18.2",
  "cors": "^2.8.5",
  "axios": "^1.6.5"
}
```

### Added

```json
{
  "electron": "^28.1.0",
  "electron-builder": "^24.9.1",
  "vite-plugin-electron": "^0.28.0",
  "vite-plugin-electron-renderer": "^0.14.5"
}
```

### Kept (Reused)

```json
{
  "croner": "^8.0.1",
  "fs-extra": "^11.2.0",
  "nanoid": "^5.0.4",
  "winston": "^3.11.0",
  "zod": "^3.22.4",
  "react": "^18.3.1",
  "zustand": "^4.4.7"
}
```

## Communication Pattern Changes

### Before: REST API

```typescript
// Request
POST http://localhost:3001/api/jobs
Content-Type: application/json

{
  "name": "Test Job",
  "schedule": "0 * * * *",
  "command": "echo 'test'"
}

// Response
{
  "success": true,
  "data": { "id": "abc123", ... }
}
```

### After: IPC

```typescript
// Renderer Process (Frontend)
const job = await window.electronAPI.jobs.create({
  name: 'Test Job',
  schedule: '0 * * * *',
  command: "echo 'test'"
});

// Main Process receives and processes
// Returns: { success: true, data: { id: "abc123", ... } }
```

## Benefits of Migration

### 1. **No Network Overhead**
- IPC is faster than HTTP
- No serialization/deserialization of HTTP requests
- No CORS issues

### 2. **Simplified Architecture**
- Single process application (Main + Renderer)
- No separate backend server to manage
- Easier deployment (single executable)

### 3. **Better Security**
- No exposed HTTP endpoints
- Context isolation prevents XSS
- Direct system access (no HTTP proxy needed)

### 4. **Native Integration**
- Native menus, notifications, tray icons
- File system access without restrictions
- System-level features (auto-start, etc.)

### 5. **Offline-First**
- No network dependency
- Works completely offline
- Faster startup time

## Development Workflow

### Before

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

### After

```bash
# Single terminal
npm run dev
```

## Build & Distribution

### Before

- Frontend: Build static files, deploy to web server
- Backend: Deploy to server, configure reverse proxy

### After

- Single command: `npm run electron:build`
- Output: Native installers (.dmg, .exe, .AppImage)
- No server setup required

## Testing

### Before

```bash
# Start backend
npm run dev:backend

# In another terminal, start frontend
npm run dev:frontend

# Manual testing in browser
```

### After

```bash
# Single command launches both
npm run dev

# Electron window opens automatically
# DevTools included
```

## Rollback Plan

If you need to revert to client-server:

1. Keep `backend/` and `frontend/` directories
2. Original `package.json` files are preserved
3. Simply run the old scripts:
   ```bash
   npm run dev:backend
   npm run dev:frontend
   ```

## Migration Checklist

- [x] Move backend services to `src/main/services/`
- [x] Create IPC handlers in `src/main/ipc/`
- [x] Create preload script with contextBridge
- [x] Update frontend API client to use IPC
- [x] Configure Vite for Electron
- [x] Setup TypeScript configuration
- [x] Configure electron-builder
- [x] Create development runner script
- [x] Update package.json scripts
- [x] Test all IPC channels
- [x] Verify build process

## New Features Added

1. **Test Job in 1 Minute**
   ```typescript
   await window.electronAPI.jobs.testIn1Minute('echo "test"');
   ```
   - Creates job scheduled 1 minute from now
   - Auto-deletes after execution

2. **Open Logs Folder**
   ```typescript
   await window.electronAPI.logs.open('/path/to/logs');
   ```
   - Opens log directory in native file explorer

## Known Limitations

1. **Multi-User**: Each user needs their own instance (no shared database)
2. **Remote Access**: No web interface (desktop only)
3. **Platform**: Must build separately for macOS, Windows, Linux

## Next Steps

1. Add native menu bar
2. Implement system tray icon
3. Add notifications for job failures
4. Auto-update functionality
5. Create custom icons for each platform
