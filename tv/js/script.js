const apps = document.querySelectorAll('.app');
let focusedAppIndex = 0;

// Select Apps

function focusApp(index) {
  apps[index].focus();
}

function handleKeyDown(event) {
  if (event.key === 'ArrowRight') {
    focusedAppIndex = (focusedAppIndex + 1) % apps.length;
    focusApp(focusedAppIndex);
  } else if (event.key === 'ArrowLeft') {
    focusedAppIndex = (focusedAppIndex - 1 + apps.length) % apps.length;
    focusApp(focusedAppIndex);
  } else if (event.key === 'Enter') {
    const app = apps[focusedAppIndex];
    openApp(app);
  }
}

// Open App 

function openApp(app) {
  const appUrl = app.getAttribute('data-url');
  const lightbox = document.createElement('div');
  lightbox.classList.add('lightbox');
  const lightboxContent = document.createElement('div');
  lightboxContent.classList.add('lightbox-content');
  lightboxContent.innerHTML = `
    <iframe class="app-frame" src="${appUrl}" frameborder="0"></iframe>
  `;
  lightbox.appendChild(lightboxContent);
  const titleBar = document.createElement('div');
  titleBar.classList.add('title-bar');
  titleBar.innerHTML = `
    <h2>${app.querySelector('h2').textContent}</h2>
  `;
  lightbox.appendChild(titleBar);
  const closeButton = document.createElement('div');
  closeButton.classList.add('close-button');
  closeButton.innerHTML = '&times;';
  titleBar.appendChild(closeButton);
  document.body.appendChild(lightbox);
  closeButton.addEventListener('click', () => {
    document.body.removeChild(lightbox);
  });
  lightbox.addEventListener('click', (event) => {
    if (event.target === lightbox) {
      document.body.removeChild(lightbox);
    }
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      document.body.removeChild(lightbox);
    }
  });
}

// Focus Selected App

apps.forEach((app, index) => {
  app.addEventListener('keydown', handleKeyDown);
  app.addEventListener('click', () => {
    focusedAppIndex = index;
    focusApp(focusedAppIndex);
  });
});

focusApp(focusedAppIndex);