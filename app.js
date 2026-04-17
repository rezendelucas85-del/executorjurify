const STORAGE_KEY = 'juri-audiencias';
const state = { hearings: [], alertIds: new Set(), activeFiles: {} };

const elements = {
  agendaTab: document.getElementById('agendaTab'),
  historyTab: document.getElementById('historyTab'),
  modal: document.getElementById('modal'),
  printPreview: document.getElementById('printPreview'),
  alertBar: document.getElementById('alertBar'),
  alertText: document.getElementById('alertText'),
  newHearingBtn: document.getElementById('newHearingBtn'),
  exportBtn: document.getElementById('exportBtn'),
  modalClose: document.getElementById('modalClose'),
  cancelBtn: document.getElementById('cancelBtn'),
  hearingForm: document.getElementById('hearingForm'),
  date: document.getElementById('date'),
  time: document.getElementById('time'),
  vara: document.getElementById('vara'),
  type: document.getElementById('type'),
  judge: document.getElementById('judge'),
  process: document.getElementById('process'),
  notes: document.getElementById('notes'),
  documents: document.getElementById('documents'),
  filePreview: document.getElementById('filePreview'),
  previewList: document.getElementById('previewList'),
  closePreview: document.getElementById('closePreview'),
  printBtn: document.getElementById('printBtn'),
  closePrintPreview: document.getElementById('closePrintPreview'),
  tabs: document.querySelectorAll('.tab')
};

function loadData() {
  try {
    const serialized = localStorage.getItem(STORAGE_KEY);
    state.hearings = serialized ? JSON.parse(serialized) : [];
  } catch (error) {
    state.hearings = [];
  }
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.hearings));
  render();
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatTime(timeString) {
  return timeString.slice(0,5);
}

function formatDateTime(date, time) {
  const combined = new Date(`${date}T${time}`);
  return combined.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function sortHearings(list) {
  return [...list].sort((a,b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

function getStatus(hearing) {
  return hearing.status === 'confirmado' ? 'confirmado' : 'pendente';
}

function render() {
  renderAgenda();
  renderHistory();
}

function renderAgenda() {
  const now = new Date();
  const pending = sortHearings(state.hearings)
    .filter(item => item.status === 'pendente' && new Date(`${item.date}T${item.time}`) >= now);

  elements.agendaTab.innerHTML = pending.length ? pending.map(buildCard).join('') : '<div class="no-data"><strong>Nenhuma audiência pendente.</strong><p>Cadastre uma nova audiência para começar a acompanhar os status e alertas.</p></div>';
}

function renderHistory() {
  const now = new Date();
  const history = sortHearings(state.hearings)
    .filter(item => item.status === 'confirmado' || new Date(`${item.date}T${item.time}`) < now);
  elements.historyTab.innerHTML = history.length ? history.map(buildCard).join('') : '<div class="no-data"><strong>Histórico vazio.</strong><p>As audiências confirmadas e concluídas aparecerão aqui.</p></div>';
}

function buildCard(hearing) {
  const status = getStatus(hearing);
  const isPending = status === 'pendente';
  const when = formatDateTime(hearing.date, hearing.time);
  const docs = hearing.documents.length ? hearing.documents.map((doc, index) => `
    <div class="doc-item"><span>${doc.name}</span><a href="#" data-id="${hearing.id}" data-doc="${index}">Abrir</a></div>
  `).join('') : '<p style="color: var(--muted);">Nenhum documento anexado.</p>';

  return `
    <article class="hearing-card" data-id="${hearing.id}">
      <div class="card-head">
        <div class="primary-info">
          <div class="schedule-line">
            <time datetime="${hearing.date}T${hearing.time}">${when}</time>
            <span class="status-pill status-${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
          </div>
          <strong>${hearing.vara} • ${hearing.type}</strong>
        </div>
        <span class="badge">${hearing.process}</span>
      </div>
      <div class="details-grid">
        <div class="detail-item"><span>Juiz(a)</span><strong>${hearing.judge}</strong></div>
        <div class="detail-item"><span>Processo</span><strong>${hearing.process}</strong></div>
        <div class="detail-item"><span>Orientações</span><strong>${hearing.notes || 'Nenhuma orientação adicional.'}</strong></div>
        <div class="detail-item"><span>Status</span><strong>${status === 'pendente' ? 'Aguardando check-in' : 'Check-in realizado'}</strong></div>
      </div>
      <div class="docs-list"><h3>Documentos</h3>${docs}</div>
      <div class="actions">
        ${isPending ? `<button class="checkin-btn" data-action="checkin" data-id="${hearing.id}">Fazer check-in</button>` : ''}
      </div>
    </article>
  `;
}

function showModal() {
  state.activeFiles = {};
  elements.filePreview.innerHTML = '';
  elements.hearingForm.reset();
  elements.modal.classList.remove('hidden');
  elements.modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  elements.date.focus();
}

function closeModal() {
  elements.modal.classList.add('hidden');
  elements.modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function resetFilePreview() {
  elements.filePreview.innerHTML = '';
  Array.from(elements.documents.files).forEach(file => {
    const pill = document.createElement('span');
    pill.className = 'file-pill';
    pill.textContent = file.name;
    elements.filePreview.appendChild(pill);
  });
}

function handleFormSubmit(event) {
  event.preventDefault();
  const hearing = {
    id: crypto.randomUUID(),
    date: elements.date.value,
    time: elements.time.value,
    vara: elements.vara.value.trim(),
    type: elements.type.value,
    judge: elements.judge.value.trim(),
    process: elements.process.value.trim(),
    notes: elements.notes.value.trim(),
    status: 'pendente',
    createdAt: new Date().toISOString(),
    documents: []
  };

  if (!hearing.date || !hearing.time || !hearing.vara || !hearing.type || !hearing.judge || !hearing.process) {
    alert('Por favor, preencha todos os campos obrigatórios.');
    return;
  }

  const acceptedFiles = Array.from(elements.documents.files).filter(file => /\.(pdf|doc|docx)$/i.test(file.name));
  hearing.documents = acceptedFiles.map(file => ({ name: file.name, type: file.type || 'application/octet-stream' }));
  state.hearings.push(hearing);
  saveData();
  closeModal();
}

function handleCheckIn(id) {
  const item = state.hearings.find(record => record.id === id);
  if (!item) return;
  item.status = 'confirmado';
  item.confirmedAt = new Date().toISOString();
  saveData();
}

function playAlert() {
  const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = 'sine';
  oscillator.frequency.value = 520;
  gain.gain.value = 0.12;
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.35);
}

function evaluateAlerts() {
  const now = new Date();
  const incoming = state.hearings.filter(item => item.status === 'pendente')
    .map(item => ({ ...item, timeAt: new Date(`${item.date}T${item.time}`) }))
    .filter(item => item.timeAt > now);

  const nextAlert = incoming.find(item => {
    const diff = item.timeAt.getTime() - now.getTime();
    return diff <= 3600000 && diff > 0;
  });

  if (nextAlert) {
    elements.alertBar.classList.remove('hidden');
    elements.alertText.textContent = `Próxima audiência pendente em até 1 hora: ${nextAlert.vara} às ${formatTime(nextAlert.time)}.`;
    if (!state.alertIds.has(nextAlert.id)) {
      playAlert();
      state.alertIds.add(nextAlert.id);
    }
  } else {
    elements.alertBar.classList.add('hidden');
  }
}

function openPreview() {
  const sorted = sortHearings(state.hearings);
  elements.previewList.innerHTML = sorted.length ? sorted.map(item => {
    const status = getStatus(item);
    const dateTime = formatDateTime(item.date, item.time);
    return `
      <section class="preview-item">
        <div class="preview-item-header">
          <h3>${item.vara} – ${item.type}</h3>
          <span class="preview-status ${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
        </div>
        <p><strong>Data:</strong> ${dateTime}</p>
        <p><strong>Juiz(a):</strong> ${item.judge}</p>
        <p><strong>Processo:</strong> ${item.process}</p>
        <p><strong>Orientações:</strong> ${item.notes || 'Nenhuma'}</p>
        <p><strong>Documentos:</strong> ${item.documents.length ? item.documents.map(doc => doc.name).join(', ') : 'Nenhum documento anexado.'}</p>
      </section>
    `;
  }).join('') : '<div class="no-data"><strong>Sem agendamentos.</strong><p>Adicione uma nova audiência para gerar sua prévia.</p></div>';
  elements.printPreview.classList.remove('hidden');
  elements.printPreview.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closePreview() {
  elements.printPreview.classList.add('hidden');
  elements.printPreview.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

function onDocumentLinkClick(event) {
  if (event.target.matches('.doc-item a')) {
    event.preventDefault();
    const id = event.target.dataset.id;
    const docIndex = Number(event.target.dataset.doc);
    const hearing = state.hearings.find(item => item.id === id);
    if (!hearing) return;
    const doc = hearing.documents[docIndex];
    alert(`Documento: ${doc.name}\nTipo: ${doc.type || 'Desconhecido'}`);
  }
}

elements.newHearingBtn.addEventListener('click', showModal);
elements.modalClose.addEventListener('click', closeModal);
elements.cancelBtn.addEventListener('click', closeModal);
elements.exportBtn.addEventListener('click', openPreview);
elements.closePreview.addEventListener('click', closePreview);
elements.closePrintPreview.addEventListener('click', closePreview);
elements.printBtn.addEventListener('click', () => window.print());
elements.documents.addEventListener('change', resetFilePreview);
elements.hearingForm.addEventListener('submit', handleFormSubmit);
elements.agendaTab.addEventListener('click', event => {
  if (event.target.dataset.action === 'checkin') {
    handleCheckIn(event.target.dataset.id);
  }
  onDocumentLinkClick(event);
});
elements.historyTab.addEventListener('click', onDocumentLinkClick);

elements.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.tabs.forEach(button => button.classList.toggle('active', button === tab));
    document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.toggle('active', panel.id === `${tab.dataset.tab}Tab`));
  });
});

window.addEventListener('click', event => {
  if (!elements.modal.classList.contains('hidden') && event.target === elements.modal) closeModal();
  if (!elements.printPreview.classList.contains('hidden') && event.target === elements.printPreview) closePreview();
});

document.addEventListener('keydown', event => {
  if (event.key === 'Escape') {
    if (!elements.modal.classList.contains('hidden')) closeModal();
    if (!elements.printPreview.classList.contains('hidden')) closePreview();
  }
});

loadData();
render();
evaluateAlerts();
setInterval(() => {
  render();
  evaluateAlerts();
}, 60000);
