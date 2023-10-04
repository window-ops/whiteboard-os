const iframe = document.getElementById('FRAME');
iframe.addEventListener('load', () => {
  document.getElementById('URLBAR').value = iframe.contentWindow.location.href;
});
function Navigate() {
  let url = document.getElementById('URLBAR').value.trim();
  
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = `https://${url}`;
  }

  iframe.src = url;
}