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

// --- FUNÇÕES DE PERSISTÊNCIA LOCAL ---

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

// Carrega os dados (audiências) do LocalStorage baseando-se no email do usuário logado
async function loadData() {
  if (!state.user) return;
  try {
    const data = localStorage.getItem(getDataStorageKey());
    state.hearings = data ? JSON.parse(data) : [];
  } catch (error) {
    state.hearings = [];
  }
}

function saveData() {
  if (!state.user) return;
  localStorage.setItem(getDataStorageKey(), JSON.stringify(state.hearings));
  render();
}

// --- FUNÇÕES DE INTERFACE ---

async function showApp() {
  elements.authScreen.classList.add('hidden');
  elements.appShell.classList.remove('hidden');
  elements.logoutBtn.classList.remove('hidden');
  elements.userBadge.textContent = state.user ? `Olá, ${state.user.name}` : '';
  await loadData();
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

// --- LÓGICA DE AUTENTICAÇÃO LOCAL (REPARADA) ---

async function signIn(email, password) {
  const users = loadUsers();
  const user = users.find(u => u.email === email && u.password === password);
  
  if (user) {
    setCurrentUser(user);
    await loadData();
    showApp();
    return true;
  } else {
    alert('Email ou senha inválidos.');
    return false;
  }
}

async function signUp(name, email, password) {
  const users = loadUsers();
  const userExists = users.find(u => u.email === email);

  if (userExists) {
    alert('Erro ao cadastrar. Este e-mail já está em uso.');
    return false;
  }

  const newUser = {
    id: Date.now().toString(),
    name,
    email,
    password
  };

  users.push(newUser);
  saveUsers(users);
  setCurrentUser(newUser);
  state.hearings = [];
  showApp();
  return true;
}

async function handleAuthSubmit(event) {
  event.preventDefault();
  const email = elements.authEmail.value.trim().toLowerCase();
  const password = elements.authPassword.value.trim();
  const name = elements.authName.value.trim();

  if (!email || !password || (state.authMode === 'register' && !name)) {
    alert('Preencha todos os campos.');
    return;
  }

  if (state.authMode === 'register') {
    await signUp(name, email, password);
  } else {
    await signIn(email, password);
  }
}

function logout() {
  clearCurrentUser();
  state.hearings = [];
  showAuthScreen();
}

// --- FUNÇÕES DE AGENDA E CALENDÁRIO ---

function formatDate(dateString) {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('pt-BR');
}

function formatTime(timeString) {
  return timeString.slice(0, 5);
}

function formatDateTime(date, time) {
  return `${formatDate(date)} às ${formatTime(time)}`;
}

function sortHearings(list) {
  return [...list].sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
}

function getStatus(hearing) {
  return hearing.status === 'confirmado' ? 'confirmado' : 'pendente';
}

function isSameDay(dateA, dateB) {
  return dateA.getFullYear() === dateB.getFullYear() &&
         dateA.getMonth() === dateB.getMonth() &&
         dateA.getDate() === dateB.getDate();
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
  return sortHearings(state.hearings).filter(item => {
    const itemDate = new Date(`${item.date}T00:00:00`);
    return isSameDay(itemDate, date);
  });
}

function renderCalendar() {
  const monthStart = new Date(state.currentMonth);
  monthStart.setDate(1);
  const year = monthStart.getFullYear();
  const month = monthStart.getMonth();
  const firstWeekDay = monthStart.getDay();
  const totalDays = new Date(year, month + 1, 0).getDate();
  const today = state.selectedDate || new Date();

  const weekdays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => `<div class="calendar-weekday">${day}</div>`).join('');
  const cells = [];

  for (let index = 0; index < 42; index++) {
    const currentDay = new Date(year, month, index - firstWeekDay + 1);
    const sameMonth = currentDay.getMonth() === month;
    const dateValue = formatDateValue(currentDay);
    const events = getHearingsForDate(currentDay);
    
    const dots = events.map(item => `<span class="day-dot category-${getCategoryClass(item.category || item.type)}"></span>`).slice(0, 3).join('');
    
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
        <h2 style="text-transform: capitalize">${getMonthLabel(monthStart)}</h2>
        <div class="calendar-legend">
          <span class="legend-item"><span class="legend-color category-civel"></span>Cível</span>
          <span class="legend-item"><span class="legend-color category-criminal"></span>Crim.</span>
          <span class="legend-item"><span class="legend-color category-trabalhista"></span>Trab.</span>
          <span class="legend-item"><span class="legend-color category-familia"></span>Fam.</span>
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
          <h3>${formatTime(hearing.time)} — Proc: ${hearing.process}</h3>
          <div class="day-card-meta">
            <span class="day-card-time">${hearing.vara}</span>
            <span class="category-pill category-${categoryClass}">${hearing.category || hearing.type}</span>
          </div>
        </div>
        <span class="day-card-status status-${status}">${status === 'pendente' ? 'Pendente' : 'Confirmado'}</span>
      </div>
      <div class="day-card-actions">
        ${status === 'pendente' ? `<button class="checkin-btn" data-action="checkin" data-id="${hearing.id}">Fazer Check-in</button>` : ''}
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
  const dayLabel = selectedDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  const dayHearings = getHearingsForDate(selectedDate);
  const dayItems = dayHearings.length ? dayHearings.map(buildDayCard).join('') : '<div class="no-data"><p>Nenhuma audiência para este dia.</p></div>';

  elements.agendaTab.innerHTML = `
    <div class="agenda-panel">
      <section class="calendar-panel">${renderCalendar()}</section>
      <section class="day-list">
        <article class="day-summary">
          <h2 style="text-transform: capitalize">${dayLabel}</h2>
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
  
  elements.historyTab.innerHTML = history.length 
    ? history.map(buildCard).join('') 
    : '<div class="no-data"><p>Histórico vazio.</p></div>';
}

function buildCard(hearing) {
  const status = getStatus(hearing);
  const categoryClass = getCategoryClass(hearing.category || hearing.type);
  return `
    <article class="hearing-card">
      <div class="card-head">
        <div class="primary-info">
          <strong>${formatDateTime(hearing.date, hearing.time)}</strong>
          <span class="category-pill category-${categoryClass}">${hearing.category || hearing.type}</span>
        </div>
        <span class="status-pill status-${status}">${status}</span>
      </div>
      <div class="details-grid">
        <p><strong>Vara:</strong> ${hearing.vara}</p>
        <p><strong>Processo:</strong> ${hearing.process}</p>
        <p><strong>Juiz:</strong> ${hearing.judge}</p>
      </div>
    </article>
  `;
}

// --- MODAL E FORMULÁRIO ---

function showModal() {
  elements.hearingForm.reset();
  elements.modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  elements.modal.classList.add('hidden');
  document.body.style.overflow = '';
}

async function handleFormSubmit(event) {
  event.preventDefault();
  const hearing = {
    id: Date.now().toString(),
    date: elements.date.value,
    time: elements.time.value,
    vara: elements.vara.value.trim(),
    type: elements.type.value,
    category: elements.category.value,
    judge: elements.judge.value.trim(),
    process: elements.process.value.trim(),
    notes: elements.notes.value.trim(),
    documents: [],
    status: 'pendente'
  };

  state.hearings.push(hearing);
  saveData();
  closeModal();
}

async function handleCheckIn(id) {
  const hearing = state.hearings.find(h => h.id === id);
  if (hearing) {
    hearing.status = 'confirmado';
    saveData();
  }
}

// --- ALERTAS E INICIALIZAÇÃO ---

function evaluateAlerts() {
  const now = new Date();
  const next = state.hearings.find(h => {
    const hDate = new Date(`${h.date}T${h.time}`);
    const diff = hDate - now;
    return h.status === 'pendente' && diff > 0 && diff <= 3600000;
  });

  if (next) {
    elements.alertBar.classList.remove('hidden');
    elements.alertText.textContent = `Atenção: Audiência em ${next.vara} às ${formatTime(next.time)}`;
  } else {
    elements.alertBar.classList.add('hidden');
  }
}

// --- EVENT LISTENERS ---

elements.newHearingBtn.addEventListener('click', showModal);
elements.modalClose.addEventListener('click', closeModal);
elements.cancelBtn.addEventListener('click', closeModal);
elements.hearingForm.addEventListener('submit', handleFormSubmit);

elements.agendaTab.addEventListener('click', event => {
  const checkinBtn = event.target.closest('[data-action="checkin"]');
  if (checkinBtn) handleCheckIn(checkinBtn.dataset.id);

  const navBtn = event.target.closest('[data-action="prev-month"], [data-action="next-month"]');
  if (navBtn) setCurrentMonth(navBtn.dataset.action === 'next-month' ? 1 : -1);

  const dayBtn = event.target.closest('.calendar-day');
  if (dayBtn && !dayBtn.disabled) {
    state.selectedDate = new Date(dayBtn.dataset.date + 'T00:00:00');
    render();
  }
});

elements.authTabs.forEach(tab => tab.addEventListener('click', () => changeAuthMode(tab.dataset.auth)));
elements.authForm.addEventListener('submit', handleAuthSubmit);
elements.logoutBtn.addEventListener('click', logout);

elements.tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    elements.tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.toggle('active', p.id === `${tab.dataset.tab}Tab`));
  });
});

// Inicialização
async function init() {
  const user = getCurrentUser();
  if (user) {
    state.user = user;
    await showApp();
  } else {
    showAuthScreen();
  }
}

init();