// This small independent file still runs when the game bundle fails to download.
(() => {
  const retry = () => {
    if (window.__CINDER__?.().state !== undefined) return;
    const overlay = document.querySelector('#overlay');
    overlay.replaceChildren();
    const panel = document.createElement('div'); panel.className = 'panel';
    const title = document.createElement('h2'); title.textContent = 'Загрузка прервана';
    const text = document.createElement('p'); text.textContent = 'Проверьте соединение и повторите загрузку полигона.';
    const button = document.createElement('button'); button.className = 'primary'; button.textContent = 'Повторить загрузку'; button.addEventListener('click', () => location.reload());
    panel.append(title,text,button); overlay.append(panel); overlay.hidden = false;
  };
  setTimeout(retry,15000);
  window.addEventListener('error',event=>{if(event.target instanceof HTMLScriptElement && event.target.type === 'module')retry();},true);
})();
