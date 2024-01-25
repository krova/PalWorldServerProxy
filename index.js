// PalWorldServerProxy by krova
// UDP Proxy for Pal World server that suspends the process when no one is connected.
// https://github.com/krova/PalWorldServerProxy
//
// Credit to Jimbly - based on https://github.com/Jimbly/CryoFallSleepingProxy/tree/master

const assert = require('assert');
const child_process = require('child_process');
const proxy = require('udp-proxy');

const PROXY_OPTIONS = {
  address: '127.0.0.1', // address to proxy to
  port: 8212, // port to proxy to
  ipv6: false,

  localaddress: '0.0.0.0', // address to listen on
  localport: 8211, // port to listen on
  localipv6: false,

  //proxyaddress: '0.0.0.0', // address to send outgoing messages from
  timeOutTime: 10000
};

// If you want to skip running the server exe manually, set the full path to your PalServer.exe below, eg:
// const PAL_EXEC = 'C:/PalWorld/PalServer.exe';
const PAL_EXEC = undefined;
const IDLE_TIME = 30 * 1000; // Go to sleep after 30 seconds of idling
const PAL_OPTIONS = [
    '-useperfthreads',
    '-NoAsyncLoadingThread',
    '-UseMultithreadForDS'
];

let serverParentProcess;
let timeout;
let server_up;
let palWorldPid;

if (PAL_EXEC) {
  serverParentProcess = child_process.execFile(PAL_EXEC, PAL_OPTIONS, (error, stdout, stderr) => {
    if (error) {
      throw error;
    }
    console.log(stdout);
  });
}

const MAX_RETRIES = 10;
const DELAY_BETWEEN_RETRIES = 1000;
for (let i = 0; i < MAX_RETRIES; i++) {
  try {
    palWorldPid = detectPID();
    break;
  } catch (error) {
    console.error(`Attempt ${i + 1}/${MAX_RETRIES} failed`);
    new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_RETRIES));
  }
}

if (palWorldPid == undefined) {
  console.error(`Actual server process did not start.`);
  return 1;
}

const CMD_WAKE_UP = `bin\\pssuspend64.exe -r ${palWorldPid} -nobanner`;
const CMD_SLEEP = `bin\\pssuspend64.exe ${palWorldPid} -nobanner`;
server_up = true;
setTimeout(checkShutdown, IDLE_TIME);

var cleanExit = function() { process.exit() };
process.on('SIGINT', cleanExit); // catch ctrl-c
process.on('SIGTERM', cleanExit); // catch kill
process.on('exit', function() {
  console.log('Shutting down the server processes.');
  if (serverParentProcess) {
    serverParentProcess.kill();
  }
  process.kill(palWorldPid);
  console.log('Server processes have been shut down. Exiting...');
});

function detectPID() {
  let output = child_process.execSync('tasklist /fi "imagename eq PalServer-*" /fo csv /nh', { encoding: 'utf8' });
  let lines = output.trim().split('\n');
  if (lines.length !== 1) {
    console.log(output);
    throw new Error('Could not find single running server process');
  }
  let columns = lines[0].split('","');
  assert.equal(columns.length, 5);
  return Number(columns[1]);
}

function runCmd(cmd) {
  let ret = child_process.spawnSync(cmd, { encoding: 'utf8', shell: true });
  let { stdout, stderr, status, error } = ret;
  if (error || stderr) {
    console.log(`ERROR WAKING/SLEEPING (exit status=${status})`);
    console.log(error, stderr, stdout);
  } else {
    console.log(stdout);
  }
}

function checkShutdown() {
  timeout = null;
  let num_connections = Object.keys(server.connections).length;
  if (num_connections) {
    return;
  }
  if (server_up) {
    console.log('Timeout expired - SERVER GOING TO SLEEP');
    runCmd(CMD_SLEEP);
    server_up = false;
  }
}

let server = proxy.createServer(PROXY_OPTIONS);

server.on('listening', function (details) {
  console.log('UDP Sleeping Proxy by: Jimbly (adapted for PalWorld by krova)');
  console.log(`udp-proxy-server ready on ${details.server.family}  ${details.server.address}:${details.server.port}`);
  console.log(`traffic is forwarded to ${details.target.family}  ${details.target.address}:${details.target.port}`);
});

server.on('bound', function (details) {
  console.log(`Proxying from ${details.peer.address}:${details.peer.port} via ${details.route.address}:${details.route.port}, #connections=${Object.keys(server.connections).length}`);
  if (!server_up) {
    console.log('Client connect - SERVER WAKING UP');
    runCmd(CMD_WAKE_UP);
    server_up = true;
  }
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
});

server.on('proxyClose', function (peer) {
  let num_connections = Object.keys(server.connections).length - 1;
  console.log(`Disconnecting socket from ${peer && peer.address}, #connections=${num_connections}`);
  if (timeout) {
    clearTimeout(timeout);
    timeout = null;
  }
  if (num_connections <= 0) {
    timeout = setTimeout(checkShutdown, IDLE_TIME);
  }
});

server.on('proxyError', function (err) {
  console.log(`ProxyError! ${err}`);
});

server.on('error', function (err) {
  console.log(`Error! ${err}`);
});
