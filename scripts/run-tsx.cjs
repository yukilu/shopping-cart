const { spawn } = require('node:child_process');
const path = require('node:path');

const preload = path.join(__dirname, 'tsx-windows-preload.cjs').replaceAll('\\', '/');
const inheritedNodeOptions = process.env.NODE_OPTIONS ?? '';
const preloadOption = `--require=${preload}`;
const child = spawn(
  process.execPath,
  [require.resolve('tsx/cli'), ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_OPTIONS: `${inheritedNodeOptions} ${preloadOption}`.trim(),
    },
  },
);

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
  } else {
    process.exitCode = code ?? 1;
  }
});
