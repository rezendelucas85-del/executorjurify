const STORAGE_KEY = 'juri-audiencias';
const USERS_KEY = 'juri-users';
const CURRENT_USER_KEY = 'juri-current-user';
const state = {
  hearings: [],
  alertIds: new Set(),
  activeFiles: {},
  currentMonth: new Date(),
  selectedDate: new Date(),
  user: null,
  authMode: 'login'
};

const elements = {
  authScreen: document.getElementById('authScreen'),
  authForm: document.getElementById('authForm'),
  authTabs: document.querySelectorAll('.auth-tab'),
  authNameField: document.querySelector('.auth-name-field'),
  authEmail: document.getElementById('authEmail'),
  authPassword: document.getElementById('authPassword'),
  authName: document.getElementById('authName'),
  authSubmit: document.getElementById('authSubmit'),
  authHelp: document.getElementById('authHelp'),
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
  category: document.getElementById('category'),
  judge: document.getElementById('judge'),
  process: document.getElementById('process'),
  notes: document.getElementById('notes'),
  documents: document.getElementById('documents'),
  filePreview: document.getElementById('filePreview'),
  previewList: document.getElementById('previewList'),
  closePreview: document.getElementById('closePreview'),
  printBtn: document.getElementById('printBtn'),
  closePrintPreview: document.getElementById('closePrintPreview'),
  userBadge: document.getElementById('userBadge'),
  logoutBtn: document.getElementById('logoutBtn'),
  appShell: document.querySelector('.app-shell'),
  tabs: document.querySelectorAll('.tab')
};

function loadUsers() {
  try {
    const serialized = localStorage.getItem(USERS_KEY);
    return serialized ? JSON.parse(serialized) : [];
  } catch (error) {
    return [];
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getCurrentUser() {
  try {
    const serialized = localStorage.getItem(CURRENT_USER_KEY);
    return serialized ? JSON.parse(serialized) : null;
  } catch (error) {
    return null;
  }
}

function setCurrentUser(user) {
  state.user = user;
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
}

function clearCurrentUser() {
  state.user = null;
  localStorage.removeItem(CURRENT_USER_KEY);
}

function getDataStorageKey() {
  return state.user ? `${STORAGE_KEY}-${state.user.email}` : STORAGE_KEY;
}

function loadData() {
  try {
    const serialized = localStorage.getItem(getDataStorageKey());
    state.hearings = serialized ? JSON.parse(serialized) : [];
  } catch (error) {
    state.hearings = [];
  }
}

function saveData() {
  localStorage.setItem(getDataStorageKey(), JSON.stringify(state.hearings));
  render();
}

function showApp() {
  elements.authScreen.classList.add('hidden');
  elements.appShell.classList.remove('hidden');
  elements.logoutBtn.classList.toggle('hidden', !state.user);
  elements.userBadge.textContent = state.user ? `Olá, ${state.user.name}` : '';
  render();
  evaluateAlerts();
}

function showAuthScreen() {
  elements.authScreen.classList.remove('hidden');
  elements.appShell.classList.add('hidden');
  elements.logoutBtn.classList.add('hidden');
  elements.userBadge.textContent = '';
  elements.authEmail.focus();
}

function updateAuthForm() {
  const isRegister = state.authMode === 'register';
  elements.authNameField.classList.toggle('hidden', !isRegister);
  elements.authSubmit.textContent = isRegister ? 'Cadastrar' : 'Entrar';
  elements.authHelp.textContent = isRegister
    ? 'Já tem conta? Clique em Entrar.'
    : 'Ainda não tem conta? Faça seu cadastro.';
}

function changeAuthMode(mode) {
  state.authMode = mode;
  elements.authTabs.forEach(tab => tab.classList.toggle('active', tab.dataset.auth === mode));
  updateAuthForm();
}

function signIn(email, password) {
  const users = loadUsers();
  const user = users.find(item => item.email === email && item.password === password);
  if (!user) {
    alert('Email ou senha inválidos.');
    return false;
  }
  setCurrentUser({ name: user.name, email: user.email });
  loadData();
  showApp();
  return true;
}

function signUp(name, email, password) {
  const users = loadUsers();
  if (users.some(item => item.email === email)) {
    alert('Já existe uma conta com este email.');
    return false;
  }
  const newUser = { name, email, password };
  users.push(newUser);
  saveUsers(users);
  setCurrentUser({ name: newUser.name, email: newUser.email });
  loadData();
  showApp();
  return true;
}

function handleAuthSubmit(event) {
  event.preventDefault();
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value.trim();
  const name = elements.authName.value.trim();

  if (!email || !password || (state.authMode === 'register' && !name)) {
    alert('Preencha todos os campos do formulário.');
    return;
  }

  if (state.authMode === 'register') {
    signUp(name, email, password);
  } else {
    signIn(email, password);
  }
}

function logout() {
  clearCurrentUser();
  state.hearings = [];
  showAuthScreen();
}

function initAuth() {
  const currentUser = getCurrentUser();
  if (currentUser) {
    state.user = currentUser;
    loadData();
    showApp();
  } else {
    showAuthScreen();
  }
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

function isSameDay(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}

function getCategoryClass(category) {
  const key = String(category || 'Cível').toLowerCase();
  if (key.includes('criminal')) return 'criminal';
  if (key.includes('trabalhista')) return 'trabalhista';
  if (key.includes('família') || key.includes('familia')) return 'familia';
  return 'civel';
}

function formatDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthLabel(date) {
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function setCurrentMonth(delta) {
  const next = new Date(state.currentMonth);
  next.setMonth(next.getMonth() + delta);
  state.currentMonth = next;
  render();
}

function getHearingsForDate(date) {
  return sortHearings(state.hearings).filter(item => isSameDay(new Date(`${item.date}T${item.time}`), date));
}

function renderCalendar() {
  const monthStart = new Date(state.currentMonth);
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekDay = monthStart.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = state.selectedDate || new Date();

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => `<div class="calendar-weekday">${day}</div>`).join('');
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const currentDay = new Date(year, month, index - firstWeekDay + 1);
    const sameMonth = currentDay.getMonth() === month;
    const dateValue = formatDateValue(currentDay);
    const events = getHearingsForDate(currentDay);
    const dots = events.map(item => `<span class="day-dot category-${getCategoryClass(item.category || item.type)}" title="${item.category || item.type}"></span>`).slice(0, 3).join('');
    const classes = ['calendar-day'];
    if (!sameMonth) classes.push('inactive');
    if (isSameDay(currentDay, today)) classes.push('selected');

    cells.push(`
      <button type="button" class="${classes.join(' ')}" data-date="${dateValue}" ${sameMonth ? '' : 'disabled'}>
        <span class="calendar-day-number">${currentDay.getDate()}</span>
        <div class="day-dots">${dots}</div>
      </button>
    `);
  }

  return `
    <div class="calendar-header">
      <div>
        <h2>${getMonthLabel(monthStart)}</h2>
        <div class="calendar-legend">
          <span class="legend-item"><span class="legend-color category-civel"></span>Cível</span>
          <span class="legend-item"><span class="legend-color category-criminal"></span>Criminal</span>
          <span class="legend-item"><span class="legend-color category-trabalhista"></span>Trabalhista</span>
          <span class="legend-item"><span class="legend-color category-familia"></span>Família</span>
        </div>
      </div>
      <div class="calendar-nav">
        <button type="button" data-action="prev-month">‹</button>
        <button type="button" data-action="next-month">›</button>
      </div>
    </div>
    <div class="calendar-grid">${weekdays}${cells.join('')}</div>
  `;
}

function buildDayCard(hearing) {
  const status = getStatus(hearing);
  const categoryClass = getCategoryClass(hearing.category || hearing.type);
  return `
    <article class="day-card" data-id="${hearing.id}">
      <div class="day-card-header">
        <div>
          <h3>${formatTime(hearing.time)} — ${hearing.process}</h3>
          <div class="day-card-meta">
            <span class="day-card-time">${hearing.vara}</span>
            <span class="category-pill category-${categoryClass}">${hearing.category || hearing.type}</span>
          </div>
        </div>
        <span class="day-card-status status-${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
      </div>
      <div class="day-card-meta">
        <span>Juiz(a): ${hearing.judge}</span>
        <span>${hearing.documents.length} documento${hearing.documents.length === 1 ? '' : 's'}</span>
      </div>
      <div class="day-card-actions">
        ${status === 'pendente' ? `<button class="checkin-btn" data-action="checkin" data-id="${hearing.id}">Check-in</button>` : ''}
      </div>
    </article>
  `;
}

function render() {
  renderAgenda();
  renderHistory();
}

function renderAgenda() {
  const selectedDate = state.selectedDate || new Date();
  const dayLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const dayHearings = getHearingsForDate(selectedDate);
  const dayItems = dayHearings.length ? dayHearings.map(buildDayCard).join('') : '<div class="no-data"><strong>Nenhuma audiência para esta data.</strong><p>Selecione um dia no calendário ou cadastre uma nova audiência.</p></div>';

  elements.agendaTab.innerHTML = `
    <div class="agenda-panel">
      <section class="calendar-panel">
        ${renderCalendar()}
      </section>
      <section class="day-list">
        <article class="day-summary">
          <h2>${dayLabel}</h2>
          <p>${dayHearings.length} audiência${dayHearings.length === 1 ? '' : 's'} agendada</p>
          <div class="day-items">${dayItems}</div>
        </article>
      </section>
    </div>
  `;
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

  const categoryClass = getCategoryClass(hearing.category || hearing.type);
  return `
    <article class="hearing-card" data-id="${hearing.id}">
      <div class="card-head">
        <div class="primary-info">
          <div class="schedule-line">
            <time datetime="${hearing.date}T${hearing.time}">${when}</time>
            <span class="status-pill status-${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
          </div>
          <strong>${hearing.vara} • ${hearing.type}</strong>
          <span class="category-pill category-${categoryClass}">${hearing.category || hearing.type}</span>
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
    category: elements.category.value,
    judge: elements.judge.value.trim(),
    process: elements.process.value.trim(),
    notes: elements.notes.value.trim(),
    status: 'pendente',
    createdAt: new Date().toISOString(),
    documents: []
  };

  if (!hearing.date || !hearing.time || !hearing.vara || !hearing.type || !hearing.category || !hearing.judge || !hearing.process) {
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
          <h3>${item.vara} – ${item.category || item.type}</h3>
          <span class="preview-status ${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
        </div>
        <p><strong>Data:</strong> ${dateTime}</p>
        <p><strong>Categoria:</strong> ${item.category || item.type}</p>
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
  const checkinButton = event.target.closest('[data-action="checkin"]');
  if (checkinButton) {
    handleCheckIn(checkinButton.dataset.id);
    return;
  }

  const navButton = event.target.closest('[data-action="prev-month"], [data-action="next-month"]');
  if (navButton) {
    setCurrentMonth(navButton.dataset.action === 'next-month' ? 1 : -1);
    return;
  }

  const dayButton = event.target.closest('.calendar-day');
  if (dayButton && !dayButton.disabled) {
    state.selectedDate = new Date(dayButton.dataset.date);
    render();
    return;
  }

  onDocumentLinkClick(event);
});
elements.historyTab.addEventListener('click', onDocumentLinkClick);

elements.authTabs.forEach(tab => {
  tab.addEventListener('click', () => changeAuthMode(tab.dataset.auth));
});

elements.authForm.addEventListener('submit', handleAuthSubmit);
elements.logoutBtn.addEventListener('click', logout);

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

initAuth();
setInterval(() => {
  if (state.user) {
    render();
    evaluateAlerts();
  }
}, 60000);
