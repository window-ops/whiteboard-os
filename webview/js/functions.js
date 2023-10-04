const iframe = document.getElementById('FRAME');

function Navigate() {
  let url = document.getElementById('URLBAR').value.trim();
  iframe.addEventListener('load', function() {
    document.getElementById('URLBAR').value = iframe.src;
  });
  
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = `https://${url}`;
  }

  iframe.src = url;
}
iframe.addEventListener('load', () => {
  document.getElementById('URLBAR').value = iframe.contentWindow.location.href;
});