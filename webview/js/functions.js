function Navigate() {
  let url = document.getElementById('URLBAR').value.trim();
  const iframe = document.getElementById('FRAME');
  iframe.addEventListener('load', function() {
    document.getElementById('URLBAR').value = iframe.src;
  });
  
  if (!url.startsWith('https://') && !url.startsWith('http://')) {
    url = `https://${url}`;
  }

  iframe.src = url;
}