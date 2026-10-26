// tsx falls back to os.userInfo() to name its temporary directory on Windows.
// Some restricted Node.js environments cannot resolve the current account, so
// provide the numeric UID API that tsx already prefers on Unix systems.
if (process.platform === 'win32' && typeof process.geteuid !== 'function') {
  process.geteuid = () => 0;
}
