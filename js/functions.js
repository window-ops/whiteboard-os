function CloseWhiteboard() {
  document.getElementById("Whiteboard").style.display = "none";
  document.getElementById("CloseWebView").style.display = "none";

  if (document.getElementById("Whiteboard").style.display == "block" && document.getElementById("WebView").style.display == "block") {
    document.getElementById("OpenWebView").style.display = "none";
    document.getElementById("OpenWhiteboard").style.display = "none";
  }
  else {
    document.getElementById("OpenWebView").style.display = "block";
    document.getElementById("OpenWhiteboard").style.display = "block";
  }
}

function CloseWebView() {
  document.getElementById("WebView").style.display = "none";
  document.getElementById("CloseWhiteboard").style.display = "none";

  if (document.getElementById("Whiteboard").style.display == "block" && document.getElementById("WebView").style.display == "block") {
    document.getElementById("OpenWebView").style.display = "none";
    document.getElementById("OpenWhiteboard").style.display = "none";
  }
  else {
    document.getElementById("OpenWebView").style.display = "block";
    document.getElementById("OpenWhiteboard").style.display = "block";
  }
}

function OpenWhiteboard() {
  document.getElementById("Whiteboard").style.display = "block";
  document.getElementById("CloseWebView").style.display = "block";

  if (document.getElementById("WebView").style.display == "block") {
    document.getElementById("OpenWebView").style.display = "none";
  }
  else {
    document.getElementById("OpenWebView").style.display = "block";
  }
  document.getElementById("OpenWhiteboard").style.display = "none";
}

function OpenWebView() {
  document.getElementById("WebView").style.display = "block";
  document.getElementById("CloseWhiteboard").style.display = "block";
  
  if (document.getElementById("Whiteboard").style.display == "none") {
    document.getElementById("OpenWhiteboard").style.display = "block";
  }
  else if (document.getElementById("Whiteboard").style.display == "block") {
    document.getElementById("OpenWhiteboard").style.display = "none";
  }
  document.getElementById("OpenWebView").style.display = "none";
}

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

function ShutdownOptions() {
  document.getElementById("ShutdownOptionsMenu").style.display = "block";
  document.getElementById("Whiteboard").style.display = "none";
  document.getElementById("WebView").style.display = "none";
}

function Shutdown() {
  window.close()
}

function Restart() {
  window.location.reload()
}

function CancelShutdownOpenWhiteboard() {
  document.getElementById("ShutdownOptionsMenu").style.display = "none";
  OpenWhiteboard()
  CloseWebView()
}

function CancelShutdownOpenWebView() {
  document.getElementById("ShutdownOptionsMenu").style.display = "none";
  CloseWhiteboard()
  OpenWebView()
}

function CancelShutdownOpenBoth() {
  document.getElementById("ShutdownOptionsMenu").style.display = "none";
  OpenWhiteboard()
  OpenWebView()
}