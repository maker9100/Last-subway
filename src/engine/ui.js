import { STATIONS, COLLECTIONS, EMOTES } from '../../shared/constants.js';
import { activeTrains, trainState, stationBoard, countdown, clockText } from '../../shared/schedule.js';
import { eventName } from '../seasons/environment.js';
import { ticketText } from '../interactions/actions.js';
const $ = id => document.getElementById(id);
const element = (tag, text = '', className = '') => { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; };
const SEASON_NAMES = { spring: '봄', summer: '여름', autumn: '가을', winter: '겨울' };
const EMOTE_NAMES = ['손 흔들기', '고개 숙여 인사', '박수', '춤추기', '앉기'];
const POSE_NAMES = { cup: '따뜻한 한 잔', book: '독서 중', sit: '쉬는 중', lie: '하늘 바라보는 중', watch: '풍경 감상 중', fish: '낚시 중', kite: '연 날리는 중', build: '눈사람 만드는 중', swing: '그네 타는 중', scope: '망원경 보는 중', sled: '모래 썰매 타는 중' };
export class UI extends EventTarget {
  constructor(storage) {
    super(); this.storage = storage; this.dialog = $('modal'); this.chatForm = $('chat-form'); this.chatInput = $('chat-input');
    $('nickname').value = storage.get('lt-nickname') || '';
    $('modal-close').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => { this.routeNodes = null; if (this.modalActivity) { this.modalActivity = null; this.dispatchEvent(new Event('activityend')); } this.dispatchEvent(new Event('blocking')); });
    this.chatForm.addEventListener('submit', e => {
      e.preventDefault(); const text = this.chatInput.value.trim();
      if (text) this.dispatchEvent(new CustomEvent('sendchat', { detail: text }));
      this.chatInput.value = ''; this.closeChat();
    });
    this.chatInput.addEventListener('keydown', e => { if (e.code === 'Escape') { e.preventDefault(); e.stopPropagation(); this.closeChat(); } });
    $('route-button').addEventListener('click', () => this.route());
    $('collection-button').addEventListener('click', () => this.collection());
    $('settings-button').addEventListener('click', () => this.settings());
    $('touch-chat').addEventListener('click', () => this.openChat());
    $('touch-wave').addEventListener('click', () => this.menu('인사와 이모션', EMOTES.map((emote, i) => ({ label: EMOTE_NAMES[i], action: () => this.dispatchEvent(new CustomEvent('emote', { detail: emote })) }))));
  }
  blocking() { return !$('login').hidden || this.dialog.open || !this.chatForm.hidden; }
  start() { $('login').hidden = true; $('hud').hidden = false; this.dispatchEvent(new Event('blocking')); }
  connection(text) { $('network').textContent = text; $('login-status').textContent = text; }
  prompt(text) { $('prompt').textContent = text; $('prompt').hidden = !text; }
  toast(text) {
    const node = element('div', text, 'toast'); $('notifications').append(node);
    while ($('notifications').childElementCount > 4) $('notifications').firstElementChild.remove();
    setTimeout(() => node.remove(), 5500);
  }
  modal(title) {
    this.closeChat(); $('modal-title').textContent = title; $('modal-body').replaceChildren(); this.routeNodes = null;
    if (!this.dialog.open) this.dialog.showModal(); this.dispatchEvent(new Event('blocking'));
    return $('modal-body');
  }
  menu(title, options) {
    const body = this.modal(title);
    for (const option of options) { const button = element('button', option.label, 'menu-option'); button.addEventListener('click', () => { this.dialog.close(); option.action(); }); body.append(button); }
  }
  ticketPicker(current, select) { this.menu('목적지를 선택해 주세요', STATIONS.filter(s => s.id !== current).map(s => ({ label: `${s.name}행 티켓 발권`, action: () => select(s.id) }))); }
  reading() {
    const pages = [
      '첫 번째 메모 · 열차를 기다리며\n\n중앙역의 시계는 늘 같은 속도로 움직인다. 누군가에게는 느리고, 누군가에게는 조금 빠르게. 벤치 끝에 가방을 내려놓고 전광판을 올려다보았다. 다음 열차까지 남은 시간만큼은 아무것도 하지 않아도 괜찮았다.',
      '두 번째 메모 · 창가의 자리\n\n초원의 풍차가 멀어지고 하얀 숲이 다가왔다. 창문에는 책장을 넘기는 손이 희미하게 비쳤다. 목적지를 지나쳐도 괜찮다는 안내를 듣고 처음으로 티켓을 주머니 깊숙이 넣었다. 오늘은 조금 더 멀리 가기로 했다.',
      '세 번째 메모 · 다시 출발하는 곳\n\n모래 언덕 뒤로 익숙한 역의 지붕이 보였다. 처음 출발했던 곳이지만 같은 풍경은 아니었다. 맞은편 여행자가 조용히 손을 흔들었다. 돌아온다는 건, 다시 시작할 자리가 있다는 뜻인지도 몰랐다.'
    ];
    const body = this.modal('여행자의 작은 메모'); this.modalActivity = 'books'; let index = 0;
    const page = element('p', '', 'book-page'), indicator = element('small', '', 'muted');
    const previous = element('button', '이전 장', 'setting-option'), next = element('button', '다음 장', 'setting-option');
    const draw = () => { page.textContent = pages[index]; indicator.textContent = `${index + 1} / ${pages.length}`; previous.disabled = index === 0; next.disabled = index === pages.length - 1; };
    previous.addEventListener('click', () => { index--; draw(); }); next.addEventListener('click', () => { index++; draw(); });
    body.append(page, previous, next, indicator); draw();
  }
  openChat() { if (this.dialog.open || !$('login').hidden) return; this.chatForm.hidden = false; this.dispatchEvent(new Event('blocking')); this.chatInput.focus(); }
  closeChat() { if (this.chatForm.hidden) return; this.chatForm.hidden = true; this.chatInput.blur(); this.dispatchEvent(new Event('blocking')); }
  chat(message) {
    const row = element('div', '', 'chat-row'); row.append(element('b', `${message.nickname}  `), document.createTextNode(message.text));
    $('chat-log').append(row); while ($('chat-log').childElementCount > 40) $('chat-log').firstElementChild.remove(); $('chat-log').scrollTop = $('chat-log').scrollHeight;
  }
  ticket(ticket) {
    $('ticket').hidden = !ticket;
    if (ticket) $('ticket').textContent = `${ticketText(ticket)} · 발권 ${clockText(ticket.issuedAt, false)}`;
  }
  setLocation(location, nickname) {
    this.location = location;
    const station = STATIONS.find(s => s.id === location.stationId);
    $('place').textContent = location.kind === 'train' ? '열차 객실' : location.kind === 'submarine' ? '잠수함' : station?.name || '여행 중';
    $('channel').textContent = `${nickname} · 채널 ${location.channel}`;
  }
  route() {
    const body = this.modal('순환선 · 지금 열차는');
    body.append(element('p', '중앙역에서 일곱 테마역을 거쳐 돌아옵니다. 5분 간격 · 한 바퀴 60분 · 각 역 1분 정차.', 'muted'));
    const list = element('div', '', 'route-list');
    this.routeNodes = STATIONS.map((s, i) => {
      const row = element('div', '', 'route-row'); const name = element('strong', `${String(i + 1).padStart(2, '0')}  ${s.name}`); const status = element('span');
      const trains = element('small'); row.append(name, status, trains); list.append(row); return { status, trains };
    });
    body.append(list, element('p', '중앙역 도착 시 다음 운행 번호로 이어집니다. 내리지 않으면 계속 순환합니다.', 'muted'));
  }
  collection() {
    const body = this.modal('여행 수집 도감'); let data;
    try { data = JSON.parse(this.storage.get('lt-collection') || '{}'); } catch { data = {}; }
    const names = { flower: '초원의 꽃', fish: '바다 물고기', shell: '해변의 조개', deepfish: '심해 생물', fruit: '정글 과일', cactus: '사막 열매' };
    for (const [key, items] of Object.entries(COLLECTIONS)) {
      const section = element('section', '', 'collection-section'); const found = Array.isArray(data?.[key]) ? data[key] : [];
      section.append(element('h3', `${names[key]}  ${items.filter(v => found.includes(v)).length}/${items.length}`));
      for (const item of items) section.append(element('span', found.includes(item) ? item : '미발견', found.includes(item) ? 'collected' : 'uncollected'));
      body.append(section);
    }
  }
  settings() {
    const body = this.modal('여행 설정'); body.append(element('h3', '화면 해상도'));
    for (const scale of [1, 2, 3]) { const button = element('button', scale === 1 ? '원본 해상도' : `픽셀 ${scale}분의 1`, 'setting-option'); button.addEventListener('click', () => { this.dispatchEvent(new CustomEvent('scale', { detail: scale })); this.storage.set('lt-scale', String(scale)); }); body.append(button); }
    const label = element('label', '소리 크기', 'volume-label'); const slider = document.createElement('input'); slider.type = 'range'; slider.min = '0'; slider.max = '1'; slider.step = '0.05'; slider.value = this.storage.get('lt-volume') || '0.3';
    slider.addEventListener('input', () => { this.dispatchEvent(new CustomEvent('volume', { detail: Number(slider.value) })); this.storage.set('lt-volume', slider.value); }); label.append(slider); body.append(label);
    body.append(element('p', 'WASD 이동 / Shift 빠르게 걷기 / 마우스 시점 / E 상호작용·마치기 / F 가까운 사람에게 인사 / 1~5 이모션 / Enter 채팅 / M 노선도 / Esc 마우스 해제', 'muted'));
    body.append(element('p', '활동 중에는 E로 마친 뒤 이동할 수 있어요. 모바일은 왼쪽 스틱으로 걷고 화면 오른쪽을 드래그해 둘러보세요.', 'muted'));
  }
  update(now, calendar, player, count, roomCount) {
    if (!this.location) return;
    $('clock').textContent = clockText(now);
    $('season-label').textContent = `${SEASON_NAMES[calendar.season]}${calendar.event ? ` · ${eventName(calendar.event)}` : ''}`;
    const l = this.location;
    let title, detail;
    if (l.kind === 'station') {
      const board = stationBoard(l.stationId, now);
      title = board.docked ? `${board.status}  ${countdown(board.remaining)}` : `도착까지  ${countdown(board.remaining)}`;
      detail = board.docked ? '플랫폼 문 앞에서 E키로 탑승' : `다음 도착 ${clockText(board.nextArrival, false)} · 5분 간격`;
    } else if (l.kind === 'train') {
      const train = trainState(l.trainId, now), from = STATIONS.find(s => s.id === train.stationId), to = STATIONS.find(s => s.id === train.nextStationId);
      title = train.stopped ? `${from.name} · ${train.status === 'warning' ? '곧 출발' : '정차 중'}` : `${from.name} → ${to.name}`;
      detail = `${train.stopped ? '출발까지' : '도착까지'} ${countdown(train.remaining)}${train.stopped && player?.ticket?.destination === train.stationId ? ' · 목적지예요! 문 앞에서 E키로 하차' : train.stopped ? ' · 문 앞에서 E키로 하차 가능' : ''}`;
    } else { title = '잠수함 · 수중 여행'; detail = `${STATIONS.find(s => s.id === l.to)?.name} 도착까지 ${countdown(l.endsAt - now)}`; }
    if (calendar.event === 'newyear') detail += ' · 새로운 한 해, 좋은 여행 되세요!';
    if (calendar.event === 'seollal') detail += ' · 새해 복 많이 받으세요';
    $('board-status').textContent = title; $('board-detail').textContent = detail;
    $('self-state').textContent = `${POSE_NAMES[player?.pose] || ''}${player?.suit ? ' · 잠수복 착용' : ''}  |  이곳 ${roomCount}명 · 전체 ${count}명`;
    if (this.routeNodes) {
      const trains = activeTrains(now);
      STATIONS.forEach((station, i) => {
        const board = stationBoard(station.id, now);
        this.routeNodes[i].status.textContent = `${board.status} ${countdown(board.remaining)}`;
        const here = trains.filter(t => t.stationId === station.id);
        this.routeNodes[i].trains.textContent = here.map(t => `#${t.id} ${t.stopped ? '정차' : `→ ${STATIONS.find(s => s.id === t.nextStationId).name}`}`).join('  /  ') || '접근 중인 열차 없음';
      });
    }
  }
}
