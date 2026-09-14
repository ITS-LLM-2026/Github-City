import { spawn } from 'child_process';

console.log('Starting backend server on port 3001...');
const backend = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

console.log('Starting Vite frontend dev server...');
const frontend = spawn('npx', ['vite'], { stdio: 'inherit', shell: true });

process.on('SIGINT', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  backend.kill();
  frontend.kill();
  process.exit();
});
