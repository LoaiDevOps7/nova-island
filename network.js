// Network companion: is there a link (Wi-Fi name / cable), and does it actually reach the
// internet. Wi-Fi details come from netsh; the internet check is Windows' own
// connectivity probe, tried only every 15 s (every 5 s while offline, to notice the return fast).
const os = require('os');
const { execFile } = require('child_process');

const PROBE = 'http://www.msftconnecttest.com/connecttest.txt';
const LINK_MS = 5000;

let send = () => {};
let enabled = true;
let timer = null;
let state = { link: 'none', ssid: '', signal: 0, internet: null, since: Date.now() };
let lastProbe = 0;

function wifi() {
  return new Promise((resolve) => {
    execFile('netsh.exe', ['wlan', 'show', 'interfaces'], { windowsHide: true, timeout: 4000 }, (_e, out) => {
      const text = String(out || '');
      const field = (name) => (text.match(new RegExp(`^\\s*${name}\\s*:\\s*(.+)$`, 'mi')) || [])[1]?.trim() || '';
      const connected = /^\s*State\s*:\s*connected/mi.test(text);
      resolve(connected ? { ssid: field('SSID'), signal: parseInt(field('Signal'), 10) || 0 } : null);
    });
  });
}

// any non-internal IPv4 address = some link is up
function hasLink() {
  return Object.values(os.networkInterfaces()).flat().some((a) => a && a.family === 'IPv4' && !a.internal && !a.address.startsWith('169.254.'));
}

async function probe() {
  try {
    const r = await fetch(PROBE, { signal: AbortSignal.timeout(4000), cache: 'no-store' });
    return r.ok && (await r.text()).startsWith('Microsoft Connect Test');
  } catch {
    return false;
  }
}

async function poll() {
  clearTimeout(timer);
  if (!enabled) return;
  const w = await wifi();
  const link = w ? 'wifi' : hasLink() ? 'ethernet' : 'none';
  let internet = state.internet;
  const offline = internet === false || link === 'none';
  if (link === 'none') internet = false;
  else if (Date.now() - lastProbe > (offline ? 5000 : 15000) || link !== state.link || (w && w.ssid !== state.ssid)) {
    lastProbe = Date.now();
    internet = await probe();
  }
  const next = { link, ssid: w?.ssid || '', signal: w?.signal || 0, internet };
  const changed = next.link !== state.link || next.ssid !== state.ssid || next.internet !== state.internet;
  const prev = state;
  state = { ...next, since: changed ? Date.now() : state.since };
  if (changed || Math.abs(next.signal - prev.signal) >= 10) send('network', { ...state, prev: changed ? prev : null });
  timer = setTimeout(poll, LINK_MS);
}

function setEnabled(on) {
  if (on === enabled) return;
  enabled = on;
  if (on) poll();
  else clearTimeout(timer);
}

function start(sender, on = true) {
  send = sender;
  enabled = on;
  if (on) poll();
}

module.exports = { start, setEnabled, snapshot: () => state };
