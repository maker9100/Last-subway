import { interactionsFor, COLLECTIONS, stationById } from '../../shared/constants.js';
import { C } from '../../shared/protocol.js';
export function createInteractions(location, context) {
  return interactionsFor(location).map(def => ({
    ...def, position: { x: def.x, y: def.y, z: def.z },
    canInteract(player) { return location.kind !== 'submarine' && (def.id !== 'deepfish' || player.suit); },
    onInteract(player) {
      if (def.id === 'route') { context.ui.route(); return; }
      if (def.id === 'ticket') {
        context.ui.ticketPicker(location.stationId, destination => context.net.send({ type: C.INTERACT, id: def.id, option: destination }));
        return;
      }
      if (def.id === 'coffee' && context.calendar()?.event === 'chuseok') {
        context.ui.menu('자판기', [{ label: '따뜻한 커피', action: () => context.net.send({ type: C.INTERACT, id: 'coffee' }) }, { label: '송편과 따뜻한 차', action: () => context.net.send({ type: C.INTERACT, id: 'coffee', option: 'songpyeon' }) }]);
        return;
      }
      context.net.send({ type: C.INTERACT, id: def.id });
    },
    onEnd() { context.net.send({ type: C.END }); }
  }));
}
export function saveCollection(message, ui, storage) {
  const list = COLLECTIONS[message.category];
  if (!list?.includes(message.item)) return;
  let data;
  try { data = JSON.parse(storage.get('lt-collection') || '{}'); } catch { data = {}; }
  if (!data || typeof data !== 'object' || Array.isArray(data)) data = {};
  const existing = Array.isArray(data[message.category]) ? data[message.category] : [];
  data[message.category] = [...new Set([...existing, message.item])];
  const saved = storage.set('lt-collection', JSON.stringify(data));
  ui.toast(`${message.item} 수집!${saved ? '' : ' 저장 공간을 사용할 수 없어 이번 기록은 보관하지 못했어요.'}`);
}
export function ticketText(ticket) { return ticket ? `${stationById(ticket.destination)?.name || '목적지'}행 티켓` : '티켓 없음'; }
