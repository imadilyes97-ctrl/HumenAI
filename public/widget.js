// HumenAI — Widget de chat embeddable
// Usage : <script src="https://humen-ai-pi.vercel.app/widget.js" data-tenant="mon-slug"></script>

(function() {
  var s = document.currentScript;
  var tenant = s && s.getAttribute('data-tenant') ? s.getAttribute('data-tenant') : 'demo';
  var base = 'https://humen-ai-pi.vercel.app';
  var open = false, iframe = null, btn = null;

  function toggle() {
    open = !open;
    if (open) {
      iframe = document.createElement('iframe');
      iframe.src = base + '/api/widget/chat/' + encodeURIComponent(tenant);
      iframe.style.cssText = 'position:fixed;bottom:90px;right:20px;width:380px;height:560px;max-width:calc(100vw-40px);max-height:calc(80vh);border:none;border-radius:16px;box-shadow:0 8px 32px rgba(0,0,0,0.18);z-index:2147483647;overflow:hidden;background:#fff;';
      iframe.allow = 'clipboard-write';
      document.body.appendChild(iframe);
      btn.innerHTML = '✕';
      btn.style.transform = 'rotate(90deg)';
    } else {
      if (iframe) { iframe.remove(); iframe = null; }
      btn.innerHTML = '💬';
      btn.style.transform = 'rotate(0deg)';
    }
  }

  function init() {
    btn = document.createElement('button');
    btn.innerHTML = '💬';
    btn.style.cssText = 'position:fixed;bottom:20px;right:20px;width:60px;height:60px;border-radius:50%;background:#2563eb;color:#fff;font-size:28px;border:none;box-shadow:0 4px 16px rgba(37,99,235,0.4);cursor:pointer;z-index:2147483646;display:flex;align-items:center;justify-content:center;transition:transform .2s;';
    btn.onmouseenter = function(){ btn.style.transform = 'scale(1.1)'; };
    btn.onmouseleave = function(){ btn.style.transform = open ? 'rotate(90deg)' : 'rotate(0deg)'; };
    btn.onclick = toggle;
    document.body.appendChild(btn);
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
