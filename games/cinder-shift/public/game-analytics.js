
  // Send a clean page address; campaign labels are separate from contact/form query strings.
  function analyticsContext() {
    const context = {
      site: 'nuts.bid',
      page_type: 'game',
      page_location: location.origin + location.pathname,
      page_referrer: '',
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    };
    try { const ref = new URL(document.referrer); context.page_referrer = ref.origin + ref.pathname; } catch (_) {}
    const query = new URLSearchParams(location.search);
    for (const [utm, field] of Object.entries({utm_source:'campaign_source', utm_medium:'campaign_medium', utm_campaign:'campaign_name', utm_content:'campaign_content', utm_term:'campaign_term'})) {
      const value = query.get(utm);
      if (value && /^[a-zA-Z0-9_. -]{1,100}$/.test(value) && !/\d{7}/.test(value)) context[field] = value;
    }
    if (query.get('codex_test') === 'seo_20261107') { context.debug_mode = true; context.test_run = 'seo_20261107'; }
    return context;
  }
  function analyticsPage() {
    return {site: location.hostname.replace(/^www\./, ''), language: document.documentElement.lang || 'en', page_path: location.pathname};
  }
(() => {
  'use strict';
  if (window.nutsGameAnalytics) return;
  window.nutsGameAnalytics = true;
  if (location.hostname !== 'nuts.bid') return;
  const id = 'G-HETCM80ZLX';
  const key = 'nuts_analytics_consent_v1';
  let choice = null;
  let loaded = false;
  try { choice = localStorage.getItem(key); } catch (_) {}
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('consent', 'default', {analytics_storage:'denied', ad_storage:'denied', ad_user_data:'denied', ad_personalization:'denied'});
  function apply(value) {
    choice = value;
    try { localStorage.setItem(key, value); } catch (_) {}
    window['ga-disable-' + id] = value !== 'granted';
    window.gtag('consent', 'update', {analytics_storage: value === 'granted' ? 'granted' : 'denied'});
    if (value !== 'granted' || loaded) return;
    loaded = true;
    const test = new URLSearchParams(location.search).get('codex_test') === 'seo_20261107';
    window.gtag('js', new Date());
    window.gtag('config', id, {
      ...analyticsContext(),
      page_location: location.origin + location.pathname,
      page_referrer: document.referrer ? new URL(document.referrer).origin + new URL(document.referrer).pathname : '',
      allow_google_signals: false, allow_ad_personalization_signals: false,
      ...(test ? {debug_mode:true, test_run:'seo_20261107'} : {})
    });
    const tag = document.createElement('script');
    tag.async = true;
    tag.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.appendChild(tag);
  }
  if (choice) apply(choice);
  document.addEventListener('DOMContentLoaded', () => {
    const ru = document.documentElement.lang === 'ru';
    const settings = document.createElement('button');
    settings.type = 'button'; settings.className = 'game-analytics-settings';
    settings.textContent = ru ? 'Настройки аналитики' : 'Analytics preferences';
    function show() {
      if (document.querySelector('.game-analytics-consent')) return;
      const banner = document.createElement('aside');
      banner.className = 'game-analytics-consent';
      banner.setAttribute('aria-label', settings.textContent);
      const text = document.createElement('p');
      text.textContent = ru ? 'Разрешить статистику посещений и игровых действий? Игра работает и без аналитики.' : 'Allow visit and gameplay statistics? The game also works without analytics.';
      banner.appendChild(text);
      for (const value of ['denied', 'granted']) {
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = value === 'granted' ? (ru ? 'Разрешить' : 'Allow analytics') : (ru ? 'Нет, спасибо' : 'No thanks');
        button.addEventListener('click', () => { apply(value); banner.remove(); settings.focus(); });
        banner.appendChild(button);
      }
      document.body.appendChild(banner);
    }
    settings.addEventListener('click', show);
    document.body.appendChild(settings);
    if (!choice) show();
  });
})();
