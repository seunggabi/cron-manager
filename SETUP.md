# Setup Guide - Cron Manager Electron App

## Quick Start

### 1. Install Dependencies

```bash
cd /Users/seunggabi/seunggabi/project/n8n/cron-manager
npm install
```

### 2. Run Development Mode

```bash
npm run dev
```

This will:
- Start Vite dev server on port 5173
- Compile TypeScript for main process
- Launch Electron app with DevTools

### 3. Build Production App

```bash
# Build renderer and main process
npm run build:dev

# Create distributable package
npm run electron:build
```

## Directory Structure

After setup, your project will look like:

```
cron-manager/
├── src/
│   ├── main/                    # Electron Main Process
│   │   ├── index.ts            # Main entry point
│   │   ├── ipc/
│   │   │   └── index.ts        # IPC handlers
│   │   └── services/
│   │       ├── crontab.service.ts
│   │       └── schedule.service.ts
│   ├── preload/                # Preload scripts
│   │   ├── index.ts
│   │   └── types.d.ts
│   └── shared/                 # Shared types
│       └── types/
│           └── index.ts
├── frontend/                    # React UI (Renderer)
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── lib/
│   │   │   └── api.ts          # IPC communication
│   │   └── store/
│   │       └── jobStore.ts
│   └── index.html
├── scripts/
│   └── dev-runner.ts           # Development launcher
├── build/                      # Icons (add your own)
│   ├── icon.icns              # macOS icon
│   ├── icon.ico               # Windows icon
│   └── icon.png               # Linux icon
├── dist/                       # Built renderer (created on build)
├── dist-electron/              # Built main/preload (created on build)
├── release/                    # Packaged apps (created on build)
├── package.json
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts
├── electron-builder.json
└── README.md
```

## Development Tools

### VSCode Configuration

Create `.vscode/settings.json`:

```json
{
  "typescript.tsdk": "node_modules/typescript/lib",
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```

### Debug Configuration

Create `.vscode/launch.json`:

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Debug Main Process",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "runtimeExecutable": "${workspaceFolder}/node_modules/.bin/electron",
      "args": ["."],
      "outputCapture": "std"
    }
  ]
}
```

## Building Icons

### macOS (.icns)

```bash
# Create iconset
mkdir icon.iconset
sips -z 16 16     icon.png --out icon.iconset/icon_16x16.png
sips -z 32 32     icon.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32     icon.png --out icon.iconset/icon_32x32.png
sips -z 64 64     icon.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128   icon.png --out icon.iconset/icon_128x128.png
sips -z 256 256   icon.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256   icon.png --out icon.iconset/icon_256x256.png
sips -z 512 512   icon.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512   icon.png --out icon.iconset/icon_512x512.png
sips -z 1024 1024 icon.png --out icon.iconset/icon_512x512@2x.png

# Convert to icns
iconutil -c icns icon.iconset -o build/icon.icns
```

### Windows (.ico)

Use a tool like ImageMagick:

```bash
convert icon.png -define icon:auto-resize=256,128,96,64,48,32,16 build/icon.ico
```

### Linux (.png)

```bash
cp icon.png build/icon.png
```

## Troubleshooting

### 1. TypeScript Errors

```bash
# Check for type errors
npm run type-check

# Clean and reinstall
rm -rf node_modules dist dist-electron
npm install
```

### 2. Electron Won't Start

```bash
# Check Node.js version (must be >= 18)
node --version

# Clear Electron cache
rm -rf ~/Library/Application\ Support/cron-manager

# Reinstall Electron
npm install electron --save-dev
```

### 3. Vite Build Errors

```bash
# Clean Vite cache
rm -rf node_modules/.vite
npm run build:dev
```

### 4. IPC Communication Issues

Check these points:
1. Preload script is loaded: Check `dist-electron/preload/index.js` exists
2. Context bridge is working: Open DevTools, check `window.electronAPI`
3. IPC handlers are registered: Check `src/main/ipc/index.ts`

Debug in renderer:

```javascript
// Open DevTools (Cmd+Option+I on Mac)
console.log(window.electronAPI); // Should show API object
```

### 5. Build Fails on macOS

```bash
# Install macOS build tools
xcode-select --install

# Set permissions
chmod +x node_modules/.bin/electron-builder
```

## Testing the App

### 1. Manual Testing

```bash
npm run dev
```

Then test each feature:
- [ ] Create a new cron job
- [ ] Edit existing job
- [ ] Toggle job enabled/disabled
- [ ] Delete job
- [ ] Run job immediately
- [ ] Test job in 1 minute
- [ ] Sync with crontab
- [ ] Open logs folder
- [ ] Schedule validation
- [ ] Preset selection

### 2. Type Checking

```bash
npm run type-check
```

### 3. Linting

```bash
npm run lint
```

## Environment Variables

### Development

The app automatically sets `NODE_ENV=development` in dev mode.

Check in renderer:

```javascript
console.log(process.env.NODE_ENV); // 'development' or 'production'
```

### Custom Variables

Add to `scripts/dev-runner.ts`:

```typescript
env: {
  ...process.env,
  NODE_ENV: 'development',
  CUSTOM_VAR: 'value',
}
```

## Performance Tips

### 1. Optimize Bundle Size

```bash
# Analyze bundle
npm run build:dev
npx vite-bundle-visualizer
```

### 2. Lazy Loading

In React components:

```typescript
import { lazy, Suspense } from 'react';

const HeavyComponent = lazy(() => import('./HeavyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HeavyComponent />
    </Suspense>
  );
}
```

### 3. Enable Compression

In `electron-builder.json`:

```json
{
  "compression": "maximum"
}
```

## Security Checklist

- [x] Context isolation enabled
- [x] Node integration disabled
- [x] Sandbox enabled (optional)
- [x] Preload script validates inputs
- [x] IPC handlers sanitize data
- [x] External links open in browser
- [x] File paths are validated

## Deployment

### Code Signing (macOS)

```bash
# Get your Developer ID
security find-identity -v -p codesigning

# Update electron-builder.json
{
  "mac": {
    "identity": "Developer ID Application: Your Name (TEAM_ID)"
  }
}
```

### Notarization (macOS)

```bash
# Set credentials
export APPLE_ID="your@email.com"
export APPLE_ID_PASSWORD="app-specific-password"
export APPLE_TEAM_ID="TEAM_ID"

# Build with notarization
npm run electron:build:mac
```

### Auto-Update

Add `electron-updater`:

```bash
npm install electron-updater
```

Configure in `src/main/index.ts`:

```typescript
import { autoUpdater } from 'electron-updater';

autoUpdater.checkForUpdatesAndNotify();
```

## Common Tasks

### Change App Name

1. Update `package.json`:
   ```json
   {
     "name": "your-app-name",
     "productName": "Your App Name"
   }
   ```

2. Update `electron-builder.json`:
   ```json
   {
     "appId": "com.yourcompany.yourapp",
     "productName": "Your App Name"
   }
   ```

### Add Menu Bar

Create `src/main/menu.ts`:

```typescript
import { Menu, app } from 'electron';

export function createMenu() {
  const template: MenuItemConstructorOptions[] = [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
```

### Add System Tray

In `src/main/index.ts`:

```typescript
import { Tray } from 'electron';

let tray: Tray | null = null;

function createTray() {
  tray = new Tray(join(__dirname, 'icon.png'));
  tray.setToolTip('Cron Manager');
  tray.on('click', () => {
    mainWindow?.show();
  });
}
```

## Resources

- [Electron Documentation](https://www.electronjs.org/docs)
- [electron-builder Documentation](https://www.electron.build/)
- [Vite Documentation](https://vitejs.dev/)
- [React Documentation](https://react.dev/)

## Support

For issues or questions:
1. Check existing documentation
2. Review TypeScript errors
3. Enable DevTools for debugging
4. Check Electron/Vite logs

## Next Steps

1. Customize app icon (build/icon.*)
2. Add your branding
3. Configure auto-updates
4. Setup CI/CD for builds
5. Add analytics (optional)
6. Create installer customization
