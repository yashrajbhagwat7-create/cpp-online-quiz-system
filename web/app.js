/**
 * ============================================================================
 *           QUIZMASTER .NET | FRONTEND LOGIC & ENGINE CONTROLLER
 * ============================================================================
 * Handles state management, timer dispatch, dynamic DOM rendering,
 * API REST requests to .NET backend, and confetti animations.
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

// API Base URL (defaults to same origin)
const API_BASE = window.location.origin;

// ============================================================================
// 1. INITIALIZATION & SERVER HEALTH
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  setupNavigation();
  setupKeyboardShortcuts();
  checkServerHealth();
});

async function checkServerHealth() {
  const badge = document.getElementById('server-status-badge');
  const label = badge.querySelector('.status-label');

  try {
    const res = await fetch(`${API_BASE}/api/status`);
    if (!res.ok) throw new Error('Status non-200');
    const data = await res.json();
    
    badge.classList.add('connected');
    label.textContent = `.NET Engine Online (${data.questionCount} Qs)`;
    
    // Update landing chip if present
    const qCountChip = document.getElementById('landing-q-count');
    if (qCountChip) qCountChip.textContent = `${data.questionCount} Questions`;
  } catch (err) {
    badge.classList.remove('connected');
    label.textContent = 'Server Offline';
    console.warn('Could not contact .NET server:', err);
  }
}

// ============================================================================
// 2. THEME & NAVIGATION
// ============================================================================
function initTheme() {
  const savedTheme = localStorage.getItem('quiz_theme') || 'dark';
  document.documentElement.setAttribute('data-theme', savedTheme);

  const toggleBtn = document.getElementById('theme-toggle-btn');
  toggleBtn.addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('quiz_theme', next);
  });
}

function setupNavigation() {
  const tabs = document.querySelectorAll('.nav-tab');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.getAttribute('data-target');
      switchToTab(targetId);
    });
  });

  // Mode cards click listener
  const modeCards = document.querySelectorAll('.mode-card');
  modeCards.forEach(card => {
    card.addEventListener('click', () => {
      modeCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });
}

function switchToTab(viewId) {
  // Update nav buttons
  document.querySelectorAll('.nav-tab').forEach(tab => {
    if (tab.getAttribute('data-target') === viewId) tab.classList.add('active');
    else tab.classList.remove('active');
  });

  // Update panels
  document.querySelectorAll('.view-panel').forEach(panel => {
    if (panel.id === viewId) panel.classList.add('active');
    else panel.classList.remove('active');
  });

  // Lazy load tab data
  if (viewId === 'leaderboard-view') loadLeaderboard();
  if (viewId === 'admin-view') loadAllQuestionsAdmin();
}

// ============================================================================
// 3. EXAM FLOW CONTROLLER
// ============================================================================
async function startExam() {
  const nameInput = document.getElementById('student-name');
  const rollInput = document.getElementById('student-roll');
  
  state.studentName = nameInput.value.trim();
  state.studentRoll = rollInput.value.trim();

  if (!state.studentName || !state.studentRoll) {
    showToast('Please provide your Name and Roll Number.', 'error');
    return;
  }

  // Get selected exam mode
  const modeRadio = document.querySelector('input[name="exam-mode"]:checked');
  state.examMode = modeRadio ? modeRadio.value : 'exam';

  showToast('Fetching question repository...', 'info');

  try {
    const res = await fetch(`${API_BASE}/api/questions`);
    const data = await res.json();

    if (!data.success || !data.questions || data.questions.length === 0) {
      showToast('No questions found in repository!', 'error');
      return;
    }

    state.questions = data.questions;
    state.currentIndex = 0;
    state.answers = {};
    state.flagged.clear();

    // Setup Candidate Bar
    document.getElementById('bar-candidate-name').textContent = state.studentName;
    document.getElementById('bar-candidate-roll').textContent = state.studentRoll;
    document.getElementById('candidate-avatar').textContent = state.studentName.charAt(0).toUpperCase();

    // Timer setup
    setupTimer();

    // Switch flow step
    setFlowStep('step-quiz');

    // Render palette and first question
    renderPalette();
    renderCurrentQuestion();
    showToast(`Examination started! Good luck, ${state.studentName}.`, 'success');
  } catch (err) {
    showToast('Failed to load questions from server: ' + err.message, 'error');
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

  // 10 minutes for formal exam
  state.timeRemaining = 600;
  updateTimerUI();

  state.timerInterval = setInterval(() => {
    state.timeRemaining--;
    updateTimerUI();

    if (state.timeRemaining <= 0) {
      clearInterval(state.timerInterval);
      showToast('Time is up! Auto-submitting examination.', 'warning');
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

  // Header badges & statement
  document.getElementById('q-type-badge').textContent = q.typeLabel || q.type;
  document.getElementById('q-points-badge').textContent = `+${q.points} Points`;
  document.getElementById('q-statement').textContent = q.question;

  // Flag button state
  const flagBtn = document.getElementById('btn-flag-toggle');
  const flagText = document.getElementById('flag-btn-text');
  if (state.flagged.has(q.id)) {
    flagBtn.classList.add('flagged');
    flagText.textContent = 'Flagged';
  } else {
    flagBtn.classList.remove('flagged');
    flagText.textContent = 'Flag for Review';
  }

  // Progress Bar
  const pct = Math.round(((state.currentIndex + 1) / total) * 100);
  document.getElementById('progress-question-text').textContent = `Question ${state.currentIndex + 1} of ${total}`;
  document.getElementById('progress-percentage-text').textContent = `${pct}% Completed`;
  document.getElementById('quiz-progress-bar').style.width = `${pct}%`;

  // Render Response widgets based on Question Type (Polymorphic Client View)
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

  // Footer Navigation Buttons
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
      <div class="tf-icon">✓</div>
      <div class="tf-title">True</div>
    </div>
    <div class="tf-card false-card ${isFalseSelected ? 'selected' : ''}" onclick="selectAnswer('False')">
      <div class="tf-icon">✗</div>
      <div class="tf-title">False</div>
    </div>
  `;

  container.appendChild(tfBox);
}

function renderFIBInput(q, container, savedAnswer) {
  const fibBox = document.createElement('div');
  fibBox.className = 'fib-container';

  fibBox.innerHTML = `
    <input type="text" class="fib-input" id="fib-answer-input" 
      placeholder="Type the exact missing term or keyword..." 
      value="${escapeHtml(savedAnswer)}" autocomplete="off">
    <span class="fib-hint">Press Enter or click Next to save your answer. Not case-sensitive.</span>
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
  showToast('Answer cleared for this question.', 'info');
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

// Navigation between questions
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
// 5. SIDEBAR PALETTE
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

// Keyboard shortcuts (A, B, C, D, T, F, Arrow keys)
function setupKeyboardShortcuts() {
  window.addEventListener('keydown', (e) => {
    const activeStep = document.querySelector('.flow-step.active');
    if (!activeStep || activeStep.id !== 'step-quiz') return;

    // Ignore if typing inside input / textarea
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
    warning.innerHTML = `<span style="color: var(--color-warning);">⚠️ Warning:</span> You have <strong>${unanswered} unanswered</strong> question(s). Unanswered questions will receive 0 points.`;
  } else {
    warning.textContent = 'All questions answered! Confirm to submit for polymorphic evaluation.';
  }

  document.getElementById('submit-confirm-modal').classList.add('active');
}

function closeSubmitModal() {
  document.getElementById('submit-confirm-modal').classList.remove('active');
}

async function executeFinalSubmit() {
  closeSubmitModal();
  clearInterval(state.timerInterval);

  showToast('Submitting answers to .NET Polymorphic Engine...', 'info');

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
    if (!result.success) throw new Error(result.message || 'Submission error');

    displayScorecard(result);
  } catch (err) {
    showToast('Failed to evaluate exam: ' + err.message, 'error');
  }
}

// ============================================================================
// 7. SCORECARD & REVIEW RENDERING
// ============================================================================
function displayScorecard(result) {
  setFlowStep('step-results');

  // Trigger celebration confetti if passed
  if (result.passed && typeof confetti === 'function') {
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.6 }
    });
  }

  // Grade circle & colors
  const gradeCircle = document.getElementById('score-grade-circle');
  gradeCircle.className = 'score-circle';

  const letter = result.grade.charAt(0);
  document.getElementById('score-grade-letter').textContent = result.grade.split(' ')[0];
  document.getElementById('score-grade-pct').textContent = `${result.percentage}%`;

  if (letter === 'A') gradeCircle.classList.add('grade-a');
  else if (letter === 'B') gradeCircle.classList.add('grade-b');
  else if (letter === 'C' || letter === 'D') gradeCircle.classList.add('grade-c');
  else gradeCircle.classList.add('grade-f');

  // Heading & metadata
  const statusBadge = document.getElementById('score-status-badge');
  if (result.passed) {
    statusBadge.textContent = 'EXAM PASSED';
    statusBadge.style.color = 'var(--color-success)';
    statusBadge.style.borderColor = 'rgba(16, 185, 129, 0.4)';
  } else {
    statusBadge.textContent = 'NEEDS RETEST';
    statusBadge.style.color = 'var(--color-danger)';
    statusBadge.style.borderColor = 'rgba(244, 63, 94, 0.4)';
  }

  document.getElementById('score-candidate-heading').textContent = `Candidate: ${result.name}`;
  document.getElementById('res-roll').textContent = result.rollNo;
  document.getElementById('res-score').textContent = `${result.score} / ${result.maxScore}`;
  document.getElementById('res-correct-count').textContent = `${result.correctCount} of ${result.totalQuestions}`;
  document.getElementById('res-grade').textContent = result.grade;

  // Render Detailed Review Breakdown
  const reviewList = document.getElementById('review-questions-list');
  reviewList.innerHTML = '';

  result.review.forEach((item, idx) => {
    const card = document.createElement('div');
    card.className = `review-card ${item.isCorrect ? 'correct' : 'incorrect'}`;

    const userAnsDisplay = item.userAnswerText || item.userAnswer || '<em style="color: var(--text-muted);">(No Answer)</em>';

    card.innerHTML = `
      <div class="review-card-header">
        <span class="review-q-title">Question ${idx + 1} (${item.type})</span>
        <span class="review-status-pill ${item.isCorrect ? 'correct' : 'incorrect'}">
          ${item.isCorrect ? '✓ Correct' : '✗ Incorrect'} (+${item.pointsAwarded}/${item.maxPoints} pts)
        </span>
      </div>
      <p style="font-size: 0.95rem; font-weight: 500;">${escapeHtml(item.question)}</p>
      <div class="review-answer-grid">
        <div class="ans-row">
          <span>Your Submitted Answer:</span>
          <strong style="color: ${item.isCorrect ? 'var(--color-success)' : 'var(--color-danger)'};">${escapeHtml(userAnsDisplay)}</strong>
        </div>
        <div class="ans-row">
          <span>Expected Correct Answer:</span>
          <strong style="color: var(--color-success);">${escapeHtml(item.correctAnswer)}</strong>
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
// 8. LEADERBOARD & RESULTS AUDIT
// ============================================================================
async function loadLeaderboard() {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '<tr><td colspan="7" class="text-center loading-cell">Loading examination records from results.txt...</td></tr>';

  try {
    const res = await fetch(`${API_BASE}/api/results`);
    const data = await res.json();
    state.allResults = data.results || [];
    renderLeaderboardTable(state.allResults);
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center" style="color: var(--color-danger);">Failed to load results: ${err.message}</td></tr>`;
  }
}

function renderLeaderboardTable(results) {
  const tbody = document.getElementById('leaderboard-tbody');
  tbody.innerHTML = '';

  if (results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center">No exam attempts recorded yet.</td></tr>';
    updateLeaderboardMetrics([]);
    return;
  }

  updateLeaderboardMetrics(results);

  results.forEach((row, idx) => {
    const tr = document.createElement('tr');

    let rankBadge = `<span class="rank-badge">${idx + 1}</span>`;
    if (idx === 0) rankBadge = `<span class="rank-badge rank-1">🥇 1</span>`;
    else if (idx === 1) rankBadge = `<span class="rank-badge rank-2">🥈 2</span>`;
    else if (idx === 2) rankBadge = `<span class="rank-badge rank-3">🥉 3</span>`;

    let gradeClass = 'grade-table-b';
    if (row.grade.startsWith('A')) gradeClass = 'grade-table-a';
    else if (row.grade.startsWith('C') || row.grade.startsWith('D')) gradeClass = 'grade-table-c';
    else if (row.grade.startsWith('F')) gradeClass = 'grade-table-f';

    tr.innerHTML = `
      <td>${rankBadge}</td>
      <td><strong>${escapeHtml(row.rollNo)}</strong></td>
      <td>${escapeHtml(row.name)}</td>
      <td><span style="font-family: var(--font-mono); font-weight: 700;">${escapeHtml(row.score)}</span></td>
      <td><strong>${escapeHtml(row.percentage)}</strong></td>
      <td><span class="grade-badge-table ${gradeClass}">${escapeHtml(row.grade)}</span></td>
      <td style="color: var(--text-muted); font-size: 0.78rem;">${escapeHtml(row.timestamp)}</td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('leaderboard-count-text').textContent = `Showing ${results.length} record(s)`;
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
// 9. QUESTION BANK & ADMIN AUTHORING
// ============================================================================
async function loadAllQuestionsAdmin() {
  const grid = document.getElementById('admin-questions-grid');
  grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">Loading question bank...</div>';

  try {
    const res = await fetch(`${API_BASE}/api/questions/all`);
    const data = await res.json();
    state.adminQuestions = data.questions || [];
    
    // Update badge counts
    updateQuestionCounts();
    renderAdminQuestionsGrid(state.adminQuestions);
  } catch (err) {
    grid.innerHTML = `<div style="color: var(--color-danger);">Failed to load questions: ${err.message}</div>`;
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
  // Update active pill button
  document.querySelectorAll('.filter-pills-row .pill-btn').forEach(btn => {
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
    grid.innerHTML = '<div style="padding: 20px; color: var(--text-muted);">No questions match this filter.</div>';
    return;
  }

  questions.forEach(q => {
    const card = document.createElement('div');
    card.className = 'admin-q-card';

    let optionsHtml = '';
    if (q.type === 'MCQ' && q.options) {
      const letters = ['A', 'B', 'C', 'D'];
      optionsHtml = `<div class="admin-q-options">`;
      q.options.forEach((opt, idx) => {
        const letChar = letters[idx];
        const isCorr = (q.correctOption === letChar);
        optionsHtml += `
          <div class="admin-opt-item ${isCorr ? 'is-correct' : ''}">
            <strong>[${letChar}]</strong> ${escapeHtml(opt)} ${isCorr ? '✓ (Correct)' : ''}
          </div>
        `;
      });
      optionsHtml += `</div>`;
    } else {
      optionsHtml = `
        <div style="background: var(--bg-secondary); padding: 8px 12px; border-radius: var(--radius-sm); font-size: 0.85rem;">
          <span style="color: var(--text-muted); font-size: 0.72rem; display: block;">Expected Answer:</span>
          <strong style="color: var(--color-success); font-family: var(--font-mono);">${escapeHtml(q.correctAnswer)}</strong>
        </div>
      `;
    }

    card.innerHTML = `
      <div class="admin-q-header">
        <span class="badge-type">${q.type}</span>
        <span class="badge-points">+${q.points} Pts</span>
      </div>
      <p class="admin-q-text">${escapeHtml(q.question)}</p>
      ${optionsHtml}
    `;

    grid.appendChild(card);
  });
}

// Add Question Modal Controls
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
      showToast('Please fill all 4 MCQ options (A, B, C, D).', 'error');
      return;
    }
    payload.options = [a, b, c, d];
    payload.correctAnswer = document.getElementById('new-mcq-correct').value;
  } else if (type === 'TF') {
    payload.correctAnswer = document.getElementById('new-tf-correct').value;
  } else if (type === 'FIB') {
    const fibAns = document.getElementById('new-fib-correct').value.trim();
    if (!fibAns) {
      showToast('Please specify the expected answer.', 'error');
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
    if (!data.success) throw new Error(data.message || 'Failed to add question');

    showToast('Question appended directly into questions.txt!', 'success');
    closeAddQuestionModal();
    loadAllQuestionsAdmin();
    checkServerHealth();
  } catch (err) {
    showToast('Error adding question: ' + err.message, 'error');
  }
}

// ============================================================================
// 10. UTILITIES & TOASTS
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
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = '0.3s ease';
    setTimeout(() => toast.remove(), 300);
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
