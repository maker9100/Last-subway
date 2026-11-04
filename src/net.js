import { C, S, validServer } from '../shared/protocol.js';
export const safeStorage = {
  get(key, session = false) { try { return (session ? sessionStorage : localStorage).getItem(key); } catch { return null; } },
  set(key, value, session = false) { try { (session ? sessionStorage : localStorage).setItem(key, value); return true; } catch { return false; } }
};
export class Network extends EventTarget {
  constructor() {
    super();
    this.offset = 0; this.attempt = 0; this.pending = new Map(); this.ready = false;
    this.token = safeStorage.get('lt-session', true) || '';
    this.onVisibility = () => { if (!document.hidden) { if (this.socket?.readyState === 1) this.sync(); else if (!this.socket || this.socket.readyState === 3) this.connect(); } };
    document.addEventListener('visibilitychange', this.onVisibility);
    this.syncInterval = setInterval(() => this.sync(), 30_000);
  }
  emit(type, detail) { this.dispatchEvent(new CustomEvent(type, { detail })); }
  now() { return Date.now() + this.offset; }
  start(nickname) { this.nickname = nickname; this.stopped = false; this.connect(); }
  connect() {
    if (this.stopped || !this.nickname || (this.socket && this.socket.readyState < 2)) return;
    clearTimeout(this.retry);
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const socket = new WebSocket(`${protocol}//${location.host}/ws`);
    this.socket = socket;
    this.ready = false;
    this.emit('status', '접속 중');
    socket.addEventListener('open', () => { this.send({ type: C.HELLO, nickname: this.nickname, token: this.token }, true); this.sync(); });
    socket.addEventListener('message', event => {
      try {
        const m = JSON.parse(event.data);
        if (!validServer(m)) return;
        if (m.type === S.TIME) {
          const request = this.pending.get(m.nonce);
          if (!request) return;
          this.pending.delete(m.nonce);
          const rtt = performance.now() - request.perf;
          if (rtt > 5000) return;
          this.offset = m.serverTime + rtt / 2 - Date.now();
          this.latency = Math.round(rtt);
          this.emit('sync', this.latency);
        } else if (m.type === S.WELCOME) {
          this.offset = m.serverTime - Date.now();
          this.id = m.id; this.token = m.token; this.attempt = 0;
          safeStorage.set('lt-session', m.token, true);
          this.emit(m.type, m);
          this.sync();
        } else {
          if (m.type === S.ROOM) { this.ready = true; this.emit('status', '연결됨'); }
          if (m.type === S.ERROR) { this.stopped = true; this.emit('status', m.text); }
          this.emit(m.type, m);
        }
      } catch (error) { console.warn('수신 메시지 처리 오류', error.message); }
    });
    socket.addEventListener('error', () => this.emit('status', '서버 연결 확인 중'));
    socket.addEventListener('close', () => {
      if (this.socket !== socket) return;
      this.ready = false;
      this.emit('offline', null);
      if (this.stopped) return;
      const delay = Math.min(30_000, 700 * 2 ** this.attempt++) + Math.random() * 400;
      this.emit('status', `연결 끊김 · ${Math.ceil(delay / 1000)}초 후 재접속`);
      this.retry = setTimeout(() => this.connect(), delay);
    });
  }
  send(message, force = false) {
    if (this.socket?.readyState !== 1 || (!force && !this.ready)) return false;
    this.socket.send(JSON.stringify(message));
    return true;
  }
  sync() {
    if (this.socket?.readyState !== 1) return;
    const nonce = `${performance.now()}-${Math.random()}`;
    this.pending.clear();
    this.pending.set(nonce, { perf: performance.now() });
    this.send({ type: C.SYNC, nonce, clientTime: Date.now() }, true);
  }
  dispose() {
    this.stopped = true;
    clearTimeout(this.retry); clearInterval(this.syncInterval);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.socket?.close();
  }
}
