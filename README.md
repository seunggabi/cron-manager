# Cron Manager - Electron Desktop App

A modern GUI-based crontab manager built with Electron, React, and TypeScript.

## Features

- 📝 Visual cron job management
- 🔄 Real-time crontab synchronization
- ⏰ Schedule validation and preview
- 🧪 Test jobs (1-minute test execution with auto-cleanup)
- 📊 Cron expression presets
- 🌍 Environment variable support
- 📁 Working directory configuration
- 📋 Log file management
- 🏷️ Job tagging and organization

## Architecture

### Electron Structure

```
cron-manager/
├── src/
│   ├── main/              # Main Process (Node.js)
│   │   ├── index.ts       # Electron main entry
│   │   ├── ipc/           # IPC handlers
│   │   │   └── index.ts
│   │   └── services/      # Business logic
│   │       ├── crontab.service.ts
│   │       └── schedule.service.ts
│   ├── preload/           # Preload scripts (Context Bridge)
│   │   ├── index.ts
│   │   └── types.d.ts
│   └── shared/            # Shared types
│       └── types/
│           └── index.ts
├── frontend/              # Renderer Process (React)
│   └── src/
│       ├── App.tsx
│       ├── lib/
│       │   └── api.ts     # IPC communication layer
│       └── store/
│           └── jobStore.ts
├── dist/                  # Built renderer (production)
├── dist-electron/         # Built main & preload (production)
└── release/               # Packaged applications
```

### IPC Channels

#### Jobs
- `jobs:getAll` - Get all cron jobs
- `jobs:create` - Create a new job
- `jobs:update` - Update existing job
- `jobs:delete` - Delete a job
- `jobs:toggle` - Enable/disable a job
- `jobs:run` - Run job immediately (test mode)
- `jobs:sync` - Sync with current crontab
- `jobs:testIn1Minute` - Create test job that auto-deletes

#### Schedule
- `schedule:parse` - Validate and parse cron expression
- `schedule:getPresets` - Get predefined schedule presets

#### Logs
- `logs:open` - Open log directory in file explorer

## Development

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn

### Installation

```bash
npm install
```

### Development Mode

Run the app in development mode with hot-reload:

```bash
npm run dev
```

This will:
1. Start Vite dev server (port 5173)
2. Compile TypeScript (main process)
3. Launch Electron with DevTools

### Build for Production

Build the renderer and main process:

```bash
npm run build:dev
```

### Package Application

Package for current platform:

```bash
npm run package
```

Build distributables:

```bash
# macOS
npm run electron:build:mac

# Windows
npm run electron:build:win

# Linux
npm run electron:build:linux

# All platforms
npm run electron:build
```

## Project Migration

This project was migrated from a client-server architecture to Electron:

### Before (Client-Server)
- **Frontend**: React app (Vite) - HTTP client
- **Backend**: Express server - REST API
- **Communication**: Axios HTTP requests

### After (Electron)
- **Main Process**: Backend logic via IPC
- **Renderer Process**: React UI
- **Communication**: IPC (Inter-Process Communication)

### Key Changes

1. **Removed**: Express, Axios, CORS
2. **Added**: Electron, IPC handlers, Context Bridge
3. **Modified**: API client (`frontend/src/lib/api.ts`) - now uses `window.electronAPI`
4. **Reused**: All business logic from `backend/src/services/`
5. **Reused**: All React components from `frontend/src/`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development mode |
| `npm run build` | Build and package application |
| `npm run build:dev` | Build without packaging |
| `npm run package` | Package app (no installer) |
| `npm run electron:build` | Build installers for all platforms |
| `npm run electron:build:mac` | Build macOS DMG |
| `npm run electron:build:win` | Build Windows installer |
| `npm run electron:build:linux` | Build Linux packages |
| `npm run lint` | Run ESLint |
| `npm run type-check` | TypeScript type checking |

## Configuration

### electron-builder.json

Customize build settings:
- App ID, name, version
- Icon paths (build/icon.{icns,ico,png})
- Target platforms and formats
- Installer options

### vite.config.ts

Configure Vite build:
- Electron plugin settings
- Renderer build output
- Dev server port
- Path aliases

## Security

This app follows Electron security best practices:

- ✅ Context Isolation enabled
- ✅ Node Integration disabled in renderer
- ✅ Preload script with contextBridge
- ✅ Sandbox mode (can be toggled)
- ✅ External links open in browser

## Testing

### Test Job Feature

The app includes a "Test in 1 Minute" feature:

```typescript
await window.electronAPI.jobs.testIn1Minute('echo "Hello World"', {
  env: { TEST_VAR: 'value' },
  workingDir: '/tmp'
});
```

This will:
1. Create a cron job scheduled 1 minute from now
2. Execute the command at the scheduled time
3. Auto-delete the job after 2 minutes

## Troubleshooting

### App won't start

```bash
# Clean build
rm -rf dist dist-electron node_modules
npm install
npm run dev
```

### IPC communication errors

Check that:
1. Preload script is loaded correctly
2. `contextBridge.exposeInMainWorld` is called
3. `window.electronAPI` is available in renderer

### TypeScript errors

```bash
npm run type-check
```

## License

MIT

## Author

seunggabi
