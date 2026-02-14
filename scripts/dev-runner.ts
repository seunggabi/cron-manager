import { spawn, ChildProcess } from 'child_process';
import { join } from 'path';
import electron from 'electron';

let viteProcess: ChildProcess | null = null;
let electronProcess: ChildProcess | null = null;

const rootDir = join(__dirname, '..');

function startVite() {
  console.log('Starting Vite dev server...');

  viteProcess = spawn('npx', ['vite'], {
    cwd: rootDir,
    stdio: 'inherit',
    shell: true,
  });

  viteProcess.on('exit', (code) => {
    console.log(`Vite process exited with code ${code}`);
  });
}

function startElectron() {
  console.log('Starting Electron...');

  // Wait a bit for Vite to start
  setTimeout(() => {
    electronProcess = spawn(
      electron as any,
      ['.'],
      {
        cwd: rootDir,
        stdio: 'inherit',
        env: {
          ...process.env,
          NODE_ENV: 'development',
        },
      }
    );

    electronProcess.on('exit', (code) => {
      console.log(`Electron process exited with code ${code}`);
      cleanup();
    });
  }, 3000);
}

function cleanup() {
  if (viteProcess) {
    viteProcess.kill();
    viteProcess = null;
  }
  if (electronProcess) {
    electronProcess.kill();
    electronProcess = null;
  }
  process.exit(0);
}

// Handle termination signals
process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);

// Start the development environment
startVite();
startElectron();
