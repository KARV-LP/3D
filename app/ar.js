const viewer = document.querySelector('#karvViewer');
const statusPill = document.querySelector('#statusPill');
const deviceHelp = document.querySelector('#deviceHelp');

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

function setStatus(message, state = '') {
  statusPill.textContent = message;
  statusPill.className = `status-pill ${state}`.trim();
}

function showHelp(message) {
  deviceHelp.textContent = message;
  deviceHelp.hidden = false;
}

viewer.addEventListener('load', () => {
  setStatus('3D pronto', 'ready');

  if (!isMobile) {
    showHelp('Abra este preview em um celular compatível para ativar a câmera e posicionar a poltrona no ambiente.');
    return;
  }

  if (!viewer.canActivateAR) {
    showHelp('O navegador atual não disponibilizou AR. No Android, use Chrome; no iPhone, use Safari.');
  }
});

viewer.addEventListener('error', () => {
  setStatus('Falha no 3D', 'error');
  showHelp('Não foi possível carregar o modelo. Atualize a página e tente novamente.');
});

viewer.addEventListener('ar-status', (event) => {
  const status = event.detail.status;
  if (status === 'session-started') setStatus('AR iniciado', 'ready');
  if (status === 'object-placed') setStatus('KARV posicionada', 'ready');
  if (status === 'failed') {
    setStatus('AR indisponível', 'error');
    showHelp('A sessão AR não pôde ser iniciada neste dispositivo.');
  }
  if (status === 'not-presenting') setStatus('3D pronto', 'ready');
});
