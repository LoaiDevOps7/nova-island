// News from the Nova team (main reads and checks news.json): a new item shows once as a toast,
// only when the island is free (on screen, nothing else showing, not open); a click opens its
// link. If it goes by without a click it stays as a card in the System tab until closed with ✕.
(() => {
  const list = document.createElement('div');
  list.className = 'news-list';
  $('.clips').prepend(list);
  let next = null;
  let cards = [];

  function renderCards() {
    list.innerHTML = cards.map((c) => `
      <div class="news-item ${esc(c.type)}" data-id="${esc(c.id)}" title="${esc(c.body || c.title)}">
        <span class="news-dot"></span><b dir="auto">${esc(c.title)}</b>
        <button class="news-x" aria-label="Close">${ICON_X}</button>
      </div>`).join('');
  }

  list.addEventListener('click', (e) => {
    const item = e.target.closest('.news-item');
    if (!item) return;
    if (e.target.closest('.news-x')) bridge.newsDismiss(item.dataset.id);
    else bridge.newsOpen(item.dataset.id);
  });

  const free = () => state.visible && (lastMode === 'idle' || lastMode === 'compact') && !state.pinned;

  function tryShow() {
    if (!next || !free()) return;
    const item = next;
    next = null;
    showToast(`news ${item.type}`, item.title, item.link ? 'Open' : '', 0, 8000);
    if (item.link) state.toastAction = () => bridge.newsOpen(item.id);
    bridge.newsShown(item.id);
  }
  setInterval(tryShow, 5000);

  bridge.onNews((n) => {
    cards = n.cards || [];
    next = n.next;
    renderCards();
    tryShow();
  });
})();
