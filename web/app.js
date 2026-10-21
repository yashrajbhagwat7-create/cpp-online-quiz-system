/**
 * ============================================================================
 *      UNIVERSITY EXAMINATION PORTAL | CLIENT CONTROLLER (app.js)
 * ============================================================================
 * Handles exam state, proctor timer, dynamic question rendering,
 * REST API client communications, and authentic academic grading rubric.
 * ============================================================================
 */

// Application Global State
const state = {
  questions: [],
  currentIndex: 0,
  answers: {},         // questionId -> answer string
  flagged: new Set(),  // Set of flagged questionIds
  studentName: '',
  studentRoll: '',
  examMode: 'exam',    // 'exam' or 'practice'
  timerInterval: null,
  timeRemaining: 600,  // 10 minutes (in seconds)
  allResults: [],      // Cached leaderboard results
  adminQuestions: []   // Full questions for admin view
};

// API Base URL
const API_BASE = window.location.origin;

// ============================================================================
// 1. INITIALIZATION & SERVER HEALTH
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initLiveClock();
  setupNavigation();
  setupKeyboardShortcuts();
  checkServerHealth();
});

function initLiveClock() {
  const clockEl = document.getElementById('live-system-clock');
  function update() {
    const now = new Date();
    if (clockEl) {
      clockEl.textContent = now.toLocaleTimeString('en-US', { hour12: false });
    }
  }
  update();
  setInterval(update, 1000);
}

async function checkServerHealth() {
  const connStatus = document.getElementById('header-conn-status');

  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (!res.ok) throw new Error('Status non-200');
    const data = await res.json();

    if (connStatus) {
      connStatus.innerHTML = `<span class="pulse-indicator"></span> System Online (${data.questionCount} Questions)`;
    }
  } catch (err) {
    if (connStatus) {
      connStatus.innerHTML = `<span class="pulse-indicator" style="background: var(--state-danger);"></span> Server Offline`;
    }
    console.warn('Could not contact .NET server:', err);
  }
}

// ============================================================================
// 2. THEME & NAVIGATION
// ============================================================================
function initTheme() {
  // Default to clean academic LIGHT mode
  const savedTheme = localStorage.getItem('quiz_theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  updateThemeButton(savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const current = document.documentElement.getAttribute('data-theme');
      const next = current === 'light' ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', next);
      localStorage.setItem('quiz_theme', next);
      updateThemeButton(next);
    });
  }
}

function updateThemeButton(theme) {
  const textEl = document.getElementById('theme-text');
  if (textEl) {
    textEl.textContent = theme === 'light' ? 'Dark View' : 'Academic Light';
  }
}

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-btn');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      switchToTab(targetId);
    });
  });

  // Mode radio card clicks
  const modeCards = document.querySelectorAll('.session-mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

function switchToTab(viewId) {
  document.querySelectorAll('.nav-btn').forEach(tab => {
    if (tab.getAttribute('data-target') === viewId) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === viewId) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  if (viewId === 'leaderboard-view') loadLeaderboard();
  if (viewId === 'admin-view') loadAllQuestionsAdmin();
}

// ============================================================================
// 3. EXAM FLOW CONTROLLER
// ============================================================================
async function startExam() {
  const nameInput = document.getElementById('student-name');
  const rollInput = document.getElementById('student-roll');
  const honorCheck = document.getElementById('honor-code-check');

  state.studentName = nameInput.value.trim();
  state.studentRoll = rollInput.value.trim();

  if (!state.studentName || !state.studentRoll) {
    showToast('Please enter both Candidate Full Name and Hall Ticket / Roll Number.', 'error');
    return;
  }

  if (honorCheck && !honorCheck.checked) {
    showToast('Please accept the Academic Honor Code declaration to continue.', 'error');
    return;
  }

  const modeRadio = document.querySelector('input[name="exam-mode"]:checked');
  state.examMode = modeRadio ? modeRadio.value : 'exam';

  showToast('Decrypting official test paper...', 'info');

  try {
    const res = await fetch(`${API_BASE}/api/questions`);
    const data = await res.json();

    if (!data.success || !data.questions || data.questions.length === 0) {
      showToast('No questions loaded from repository!', 'error');
      return;
    }

    state.questions = data.questions;
    state.currentIndex = 0;
    state.answers = {};
    state.flagged.clear();

    // Setup Proctor Strip
    document.getElementById('bar-candidate-name').textContent = state.studentName;
    document.getElementById('bar-candidate-roll').textContent = state.studentRoll;
    document.getElementById('candidate-avatar').textContent = state.studentName.charAt(0).toUpperCase();

    // Timer setup
    setupTimer();

    // Switch step
    setFlowStep('step-quiz');

    // Render palette and first question
    renderPalette();
    renderCurrentQuestion();
    showToast(`Session commenced. Candidate: ${state.studentName}`, 'success');
  } catch (err) {
    showToast('Connection error: ' + err.message, 'error');
  }
}

function setFlowStep(stepId) {
  document.querySelectorAll('.flow-step').forEach(step => {
    if (step.id === stepId) step.classList.add('active');
    else step.classList.remove('active');
  });
}

function setupTimer() {
  clearInterval(state.timerInterval);
  const timerBox = document.getElementById('quiz-timer-box');
  const timerDisplay = document.getElementById('timer-display');

  if (state.examMode === 'practice') {
    timerDisplay.textContent = 'Untimed';
    timerBox.classList.remove('warning', 'critical');
    return;
  }

  // 10 minutes
  state.timeRemaining = 600;
  updateTimerUI();

  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    updateTimerUI();

    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      showToast('Scheduled examination time has expired. Auto-submitting paper.', 'error');
      executeFinalSubmit();
    }
  }, 1000);
}

function updateTimerUI() {
  const timerBox = document.getElementById('quiz-timer-box');
  const timerDisplay = document.getElementById('timer-display');

  const mins = Math.floor(state.timeRemaining / 60);
  const secs = state.timeRemaining % 60;
  timerDisplay.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

  if (state.timeRemaining <= 30) {
    timerBox.classList.remove('warning');
    timerBox.classList.add('critical');
  } else if (state.timeRemaining <= 120) {
    timerBox.classList.add('warning');
  } else {
    timerBox.classList.remove('warning', 'critical');
  }
}

// ============================================================================
// 4. QUESTION RENDERING & RESPONSE CAPTURE
// ============================================================================
function renderCurrentQuestion() {
  if (state.questions.length === 0) return;
  const q = state.questions[state.currentIndex];
  const total = state.questions.length;
  const qNum = (state.currentIndex + 1).toString().padStart(2, '0');

  // Header badges & question number
  document.getElementById('q-number-indicator').textContent = `QUESTION ${qNum}`;
  document.getElementById('q-type-badge').textContent = q.typeLabel || q.type;
  document.getElementById('q-points-badge').textContent = `Marks: ${q.points}.0`;
  document.getElementById('q-statement').textContent = q.question;

  // Flag button state
  const flagBtn = document.getElementById('btn-flag-toggle');
  const flagText = document.getElementById('flag-btn-text');
  if (state.flagged.has(q.id)) {
    flagBtn.classList.add('flagged');
    flagText.textContent = 'Marked for Review';
  } else {
    flagBtn.classList.remove('flagged');
    flagText.textContent = 'Mark for Review';
  }

  // Progress Bar
  const pct = Math.round(((state.currentIndex + 1) / total) * 100);
  document.getElementById('progress-question-text').textContent = `Question ${state.currentIndex + 1} of ${total}`;
  document.getElementById('progress-percentage-text').textContent = `${pct}% Answered`;
  document.getElementById('quiz-progress-bar').style.width = `${pct}%`;

  // Render Responses
  const container = document.getElementById('q-response-container');
  container.innerHTML = '';
  const savedAnswer = state.answers[q.id] || '';

  if (q.type === 'MCQ') {
    renderMCQOptions(q, container, savedAnswer);
  } else if (q.type === 'TF') {
    renderTFOptions(q, container, savedAnswer);
  } else if (q.type === 'FIB') {
    renderFIBInput(q, container, savedAnswer);
  }

  // Navigation Buttons
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnSubmit = document.getElementById('btn-submit-exam');

  btnPrev.disabled = (state.currentIndex === 0);

  if (state.currentIndex === total - 1) {
    btnNext.style.display = 'none';
    btnSubmit.style.display = 'inline-flex';
  } else {
    btnNext.style.display = 'inline-flex';
    btnSubmit.style.display = 'none';
  }

  updatePaletteTiles();
}

function renderMCQOptions(q, container, savedAnswer) {
  const letters = ['A', 'B', 'C', 'D'];
  q.options.forEach((optText, idx) => {
    const letter = letters[idx];
    const isSelected = (savedAnswer === letter);

    const card = document.createElement('div');
    card.className = `mcq-option-card ${isSelected ? 'selected' : ''}`;
    card.innerHTML = `
      <div class="opt-circle">${letter}</div>
      <div class="opt-text">${escapeHtml(optText)}</div>
    `;

    card.addEventListener('click', () => {
      state.answers[q.id] = letter;
      renderCurrentQuestion();
    });

    container.appendChild(card);
  });
}

function renderTFOptions(q, container, savedAnswer) {
  const tfBox = document.createElement('div');
  tfBox.className = 'tf-container';

  const isTrueSelected = (savedAnswer === 'True' || savedAnswer === 'T');
  const isFalseSelected = (savedAnswer === 'False' || savedAnswer === 'F');

  tfBox.innerHTML = `
    <div class="tf-card true-card ${isTrueSelected ? 'selected' : ''}" onclick="selectAnswer('True')">
      <span>[ T ]</span> <span>True Statement</span>
    </div>
    <div class="tf-card false-card ${isFalseSelected ? 'selected' : ''}" onclick="selectAnswer('False')">
      <span>[ F ]</span> <span>False Statement</span>
    </div>
  `;

  container.appendChild(tfBox);
}

function renderFIBInput(q, container, savedAnswer) {
  const fibBox = document.createElement('div');
  fibBox.className = 'fib-container';

  fibBox.innerHTML = `
    <input type="text" class="fib-input" id="fib-answer-input" 
      placeholder="Type the exact conceptual keyword or term..." 
      value="${escapeHtml(savedAnswer)}" autocomplete="off">
    <span class="fib-hint">Press [Enter] or click Next to record response. Evaluation is case-insensitive.</span>
  `;

  container.appendChild(fibBox);

  const input = fibBox.querySelector('#fib-answer-input');
  input.focus();
  input.addEventListener('input', (e) => {
    state.answers[q.id] = e.target.value.trim();
    updatePaletteTiles();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      goToNextQuestion();
    }
  });
}

function selectAnswer(ans) {
  const q = state.questions[state.currentIndex];
  state.answers[q.id] = ans;
  renderCurrentQuestion();
}

function clearCurrentAnswer() {
  const q = state.questions[state.currentIndex];
  delete state.answers[q.id];
  renderCurrentQuestion();
  showToast('Response cleared for this question.', 'info');
}

function toggleFlagCurrentQuestion() {
  const q = state.questions[state.currentIndex];
  if (state.flagged.has(q.id)) {
    state.flagged.delete(q.id);
  } else {
    state.flagged.add(q.id);
  }
  renderCurrentQuestion();
}

function goToPrevQuestion() {
  if (state.currentIndex > 0) {
    state.currentIndex--;
    renderCurrentQuestion();
  }
}

function goToNextQuestion() {
  if (state.currentIndex < state.questions.length - 1) {
    state.currentIndex++;
    renderCurrentQuestion();
  } else {
    confirmSubmitExam();
  }
}

function jumpToQuestion(idx) {
  if (idx >= 0 && idx < state.questions.length) {
    state.currentIndex = idx;
    renderCurrentQuestion();
  }
}

// ============================================================================
// 5. QUESTION PALETTE
// ============================================================================
function renderPalette() {
  const grid = document.getElementById('question-palette-grid');
  grid.innerHTML = '';

  state.questions.forEach((q, idx) => {
    const tile = document.createElement('button');
    tile.className = 'palette-tile';
    tile.textContent = (idx + 1);
    tile.id = `palette-tile-${idx}`;
    tile.addEventListener('click', () => jumpToQuestion(idx));
    grid.appendChild(tile);
  });

  updatePaletteTiles();
}

function updatePaletteTiles() {
  state.questions.forEach((q, idx) => {
    const tile = document.getElementById(`palette-tile-${idx}`);
    if (!tile) return;

    tile.className = 'palette-tile';

    const isCurrent = (idx === state.currentIndex);
    const hasAnswer = (state.answers[q.id] !== undefined && state.answers[q.id] !== '');
    const isFlagged = state.flagged.has(q.id);

    if (isCurrent) tile.classList.add('active');
    if (hasAnswer) tile.classList.add('answered');
    if (isFlagged) tile.classList.add('flagged');
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeStep = document.querySelector('.flow-step.active');
    if (!activeStep || activeStep.id !== 'step-quiz') return;

    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
      return;
    }

    const key = e.key.toUpperCase();
    const q = state.questions[state.currentIndex];
    if (!q) return;

    if (q.type === 'MCQ' && ['A', 'B', 'C', 'D'].includes(key)) {
      state.answers[q.id] = key;
      renderCurrentQuestion();
    } else if (q.type === 'TF') {
      if (key === 'T') { state.answers[q.id] = 'True'; renderCurrentQuestion(); }
      if (key === 'F') { state.answers[q.id] = 'False'; renderCurrentQuestion(); }
    } else if (e.key === 'ArrowRight') {
      goToNextQuestion();
    } else if (e.key === 'ArrowLeft') {
      goToPrevQuestion();
    }
  });
}

// ============================================================================
// 6. EXAM SUBMISSION & EVALUATION
// ============================================================================
function confirmSubmitExam() {
  const total = state.questions.length;
  let answered = 0;
  for (let q of state.questions) {
    if (state.answers[q.id] !== undefined && state.answers[q.id] !== '') answered++;
  }
  const unanswered = total - answered;
  const flagged = state.flagged.size;

  document.getElementById('modal-answered-count').textContent = answered;
  document.getElementById('modal-unanswered-count').textContent = unanswered;
  document.getElementById('modal-flagged-count').textContent = flagged;

  const warning = document.getElementById('modal-warning-text');
  if (unanswered > 0) {
    warning.innerHTML = `Notice: You have <strong>${unanswered} unanswered</strong> questions. Unanswered questions will be awarded 0 marks.`;
  } else {
    warning.textContent = 'All question items have been answered. Confirm submission to compute final marks.';
  }

  document.getElementById('submit-confirm-modal').classList.add('active');
}

function closeSubmitModal() {
  document.getElementById('submit-confirm-modal').classList.remove('active');
}

async function executeFinalSubmit() {
  closeSubmitModal();
  clearInterval(state.timerInterval);

  showToast('Processing polymorphic evaluation...', 'info');

  const payload = {
    name: state.studentName,
    rollNo: state.studentRoll,
    answers: state.answers
  };

  try {
    const res = await fetch(`${API_BASE}/api/submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (!result.success) throw new Error(result.message || 'Evaluation error');

    displayScorecard(result);
  } catch (err) {
    showToast('Evaluation failed: ' + err.message, 'error');
  }
}

// ============================================================================
// 7. SCORECARD & REVIEW RENDERING
// ============================================================================
function displayScorecard(result) {
  setFlowStep('step-results');

  // Confetti on qualifying score
  if (result.passed && typeof confetti === 'function') {
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 }
    });
  }

  // Stamp letter & percentage
  document.getElementById('score-grade-letter').textContent = result.grade.split(' ')[0];
  document.getElementById('score-grade-pct').textContent = `${result.percentage}%`;

  // Status badge
  const statusBadge = document.getElementById('score-status-badge');
  if (result.passed) {
    statusBadge.textContent = 'QUALIFIED / PASS';
    statusBadge.className = 'c-val status-passed';
  } else {
    statusBadge.textContent = 'RETEST REQUIRED';
    statusBadge.className = 'c-val';
    statusBadge.style.color = 'var(--state-danger)';
  }

  document.getElementById('score-candidate-heading').textContent = result.name;
  document.getElementById('res-roll').textContent = result.rollNo;
  document.getElementById('res-score').textContent = `${result.score} / ${result.maxScore}`;
  document.getElementById('res-correct-count').textContent = `${result.correctCount} of ${result.totalQuestions} Correct`;
  document.getElementById('res-grade').textContent = result.grade;

  // Render Itemized Audit Breakdown
  const reviewList = document.getElementById('review-questions-list');
  reviewList.innerHTML = '';

  result.review.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `audit-item-card ${item.isCorrect ? 'correct' : 'incorrect'}`;

    const userAnsDisplay = item.userAnswerText || item.userAnswer || '(Unattempted)';

    card.innerHTML = `
      <div class="audit-card-top">
        <strong>Item ${idx + 1} &bull; ${item.type}</strong>
        <span class="audit-status-tag ${item.isCorrect ? 'correct' : 'incorrect'}">
          ${item.isCorrect ? '✓ Correct (+ ' + item.pointsAwarded + ' Marks)' : '✗ Incorrect (0 Marks)'}
        </span>
      </div>
      <div class="audit-statement">${escapeHtml(item.question)}</div>
      <div class="audit-answers-row">
        <div>
          <span style="font-size: 0.72rem; color: var(--ink-muted); display: block;">Candidate Response:</span>
          <strong style="color: ${item.isCorrect ? 'var(--state-success)' : 'var(--state-danger)'}; font-family: var(--font-mono);">
            ${escapeHtml(userAnsDisplay)}
          </strong>
        </div>
        <div>
          <span style="font-size: 0.72rem; color: var(--ink-muted); display: block;">Model Answer / Rubric:</span>
          <strong style="color: var(--state-success); font-family: var(--font-mono);">
            ${escapeHtml(item.correctAnswer)}
          </strong>
        </div>
      </div>
    `;

    reviewList.appendChild(card);
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetQuiz() {
  clearInterval(state.timerInterval);
  setFlowStep('step-landing');
  document.getElementById('candidate-form').reset();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

// ============================================================================
// 8. SCOREBOARD & AUDIT LEDGER
// ============================================================================
async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="loading-state">Synchronizing examination audit records from results.txt...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/api/results`);
    const data = await res.json();
    state.allResults = data.results || [];
    renderLeaderboardTable(state.allResults);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" style="color: var(--state-danger); padding: 16px;">Failed to read records: ${err.message}</td></tr>`;
  }
}

function renderLeaderboardTable(results) {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '';

  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--ink-muted);">No candidate attempts recorded yet in results.txt.</td></tr>';
    updateLeaderboardMetrics([]);
    return;
  }

  updateLeaderboardMetrics(results);

  results.forEach((row, idx) => {
    const tr = document.createElement('tr');

    let rankLabel = `#${idx + 1}`;
    if (idx === 0) rankLabel = `1st (Honors)`;
    else if (idx === 1) rankLabel = `2nd`;
    else if (idx === 2) rankLabel = `3rd`;

    let badgeClass = 'div-b';
    if (row.grade.startsWith('A')) badgeClass = 'div-a';
    else if (row.grade.startsWith('C') || row.grade.startsWith('D')) badgeClass = 'div-c';
    else if (row.grade.startsWith('F')) badgeClass = 'div-f';

    tr.innerHTML = `
      <td class="rank-cell">${rankLabel}</td>
      <td><strong style="font-family: var(--font-mono);">${escapeHtml(row.rollNo)}</strong></td>
      <td>${escapeHtml(row.name)}</td>
      <td><strong style="font-family: var(--font-mono);">${escapeHtml(row.score)}</strong></td>
      <td><strong>${escapeHtml(row.percentage)}</strong></td>
      <td><span class="badge-div ${badgeClass}">${escapeHtml(row.grade)}</span></td>
      <td style="color: var(--ink-muted); font-size: 0.76rem; font-family: var(--font-mono);">${escapeHtml(row.timestamp)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('leaderboard-count-text').textContent = `Displaying ${results.length} authenticated candidate record(s)`;
}

function updateLeaderboardMetrics(results) {
  const countEl = document.getElementById('lb-total-attempts');
  const highEl = document.getElementById('lb-highest-score');
  const avgEl = document.getElementById('lb-avg-percentage');
  const passEl = document.getElementById('lb-pass-rate');

  if (results.length === 0) {
    countEl.textContent = '0';
    highEl.textContent = '-';
    avgEl.textContent = '0%';
    passEl.textContent = '0%';
    return;
  }

  countEl.textContent = results.length;

  let totalPct = 0;
  let passCount = 0;
  let highestPct = 0;
  let highestStr = '';

  results.forEach(r => {
    const num = parseFloat(r.percentage.replace('%', '')) || 0;
    totalPct += num;
    if (num >= 50.0) passCount++;
    if (num > highestPct) {
      highestPct = num;
      highestStr = `${r.score} (${highestPct}%)`;
    }
  });

  highEl.textContent = highestStr || '-';
  avgEl.textContent = `${Math.round(totalPct / results.length)}%`;
  passEl.textContent = `${Math.round((passCount / results.length) * 100)}%`;
}

function filterLeaderboard() {
  const q = document.getElementById('leaderboard-search').value.toLowerCase().trim();
  if (!q) {
    renderLeaderboardTable(state.allResults);
    return;
  }

  const filtered = state.allResults.filter(r => 
    r.name.toLowerCase().includes(q) || r.rollNo.toLowerCase().includes(q)
  );

  renderLeaderboardTable(filtered);
}

// ============================================================================
// 9. QUESTION BANK REPOSITORY & AUTHORING
// ============================================================================
async function loadAllQuestionsAdmin() {
  const grid = document.getElementById('admin-questions-grid');
  grid.innerHTML = '<div style="padding: 20px; color: var(--ink-muted);">Loading repository questions...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/questions/all`);
    const data = await res.json();
    state.adminQuestions = data.questions || [];
    
    updateQuestionCounts();
    renderAdminQuestionsGrid(state.adminQuestions);
  } catch (err) {
    grid.innerHTML = `<div style="color: var(--state-danger); padding: 20px;">Failed to load questions: ${err.message}</div>`;
  }
}

function updateQuestionCounts() {
  const total = state.adminQuestions.length;
  const mcq = state.adminQuestions.filter(q => q.type === 'MCQ').length;
  const tf = state.adminQuestions.filter(q => q.type === 'TF').length;
  const fib = state.adminQuestions.filter(q => q.type === 'FIB').length;

  document.getElementById('count-all').textContent = total;
  document.getElementById('count-mcq').textContent = mcq;
  document.getElementById('count-tf').textContent = tf;
  document.getElementById('count-fib').textContent = fib;
}

function filterQuestionBank(type) {
  document.querySelectorAll('.filter-strip .filter-pill').forEach(btn => {
    if (btn.getAttribute('data-filter') === type) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  if (type === 'ALL') {
    renderAdminQuestionsGrid(state.adminQuestions);
  } else {
    const filtered = state.adminQuestions.filter(q => q.type === type);
    renderAdminQuestionsGrid(filtered);
  }
}

function renderAdminQuestionsGrid(questions) {
  const grid = document.getElementById('admin-questions-grid');
  grid.innerHTML = '';

  if (questions.length === 0) {
    grid.innerHTML = '<div style="padding: 20px; color: var(--ink-muted);">No question items match the selected filter.</div>';
    return;
  }

  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'repo-card';

    let optionsHtml = '';
    if (q.type === 'MCQ' && q.options) {
      const letters = ['A', 'B', 'C', 'D'];
      optionsHtml = `<div class="repo-options">`;
      q.options.forEach((opt, idx) => {
        const letChar = letters[idx];
        const isCorr = (q.correctOption === letChar);
        optionsHtml += `
          <div class="repo-opt-item ${isCorr ? 'correct' : ''}">
            <strong>[${letChar}]</strong> ${escapeHtml(opt)} ${isCorr ? '&bull; Correct Key' : ''}
          </div>
        `;
      });
      optionsHtml += `</div>`;
    } else {
      optionsHtml = `
        <div class="repo-opt-item correct">
          <span style="font-size: 0.72rem; color: var(--ink-muted); display: block;">Model Answer:</span>
          <strong>${escapeHtml(q.correctAnswer)}</strong>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="repo-card-top">
        <span class="academic-tag">${q.type}</span>
        <span class="points-tag">${q.points}.0 Marks</span>
      </div>
      <p class="repo-statement">${escapeHtml(q.question)}</p>
      ${optionsHtml}
    `;

    grid.appendChild(card);
  });
}

function openAddQuestionModal() {
  document.getElementById('add-question-modal').classList.add('active');
  updateNewQuestionFormFields();
}

function closeAddQuestionModal() {
  document.getElementById('add-question-modal').classList.remove('active');
  document.getElementById('add-question-form').reset();
}

function updateNewQuestionFormFields() {
  const type = document.getElementById('new-q-type').value;
  const secMcq = document.getElementById('section-mcq-fields');
  const secTf = document.getElementById('section-tf-fields');
  const secFib = document.getElementById('section-fib-fields');

  secMcq.style.display = (type === 'MCQ') ? 'block' : 'none';
  secTf.style.display = (type === 'TF') ? 'block' : 'none';
  secFib.style.display = (type === 'FIB') ? 'block' : 'none';
}

async function submitNewQuestion() {
  const type = document.getElementById('new-q-type').value;
  const text = document.getElementById('new-q-text').value.trim();
  const points = parseInt(document.getElementById('new-q-points').value) || 1;

  if (!text) {
    showToast('Question statement cannot be empty.', 'error');
    return;
  }

  const payload = {
    type: type,
    question: text,
    points: points
  };

  if (type === 'MCQ') {
    const a = document.getElementById('new-opt-a').value.trim();
    const b = document.getElementById('new-opt-b').value.trim();
    const c = document.getElementById('new-opt-c').value.trim();
    const d = document.getElementById('new-opt-d').value.trim();
    if (!a || !b || !c || !d) {
      showToast('Please specify all four choices (A, B, C, D).', 'error');
      return;
    }
    payload.options = [a, b, c, d];
    payload.correctAnswer = document.getElementById('new-mcq-correct').value;
  } else if (type === 'TF') {
    payload.correctAnswer = document.getElementById('new-tf-correct').value;
  } else if (type === 'FIB') {
    const fibAns = document.getElementById('new-fib-correct').value.trim();
    if (!fibAns) {
      showToast('Please provide the expected concept word.', 'error');
      return;
    }
    payload.correctAnswer = fibAns;
  }

  try {
    const res = await fetch(`${API_BASE}/api/questions/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.message || 'Server error');

    showToast('Question item recorded into questions.txt.', 'success');
    closeAddQuestionModal();
    loadAllQuestionsAdmin();
    checkServerHealth();
  } catch (err) {
    showToast('Error saving question: ' + err.message, 'error');
  }
}

// ============================================================================
// 10. NOTIFICATION TOASTS & UTILS
// ============================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  let icon = 'ℹ️';
  if (type === 'success') icon = '✓';
  if (type === 'error') icon = '✗';
  if (type === 'warning') icon = '⚠️';

  toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = '0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
