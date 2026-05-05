
'use strict';

const STORAGE_KEY = 'taskflow_tasks';

/** @type {Array<{id:string, name:string, category:string, priority:string, status:string, createdAt:number}>} */
let tasks = [];
let currentFilter = 'all';



const DOM = {
  taskInput:      () => document.getElementById('taskInput'),
  taskCategory:   () => document.getElementById('taskCategory'),
  taskPriority:   () => document.getElementById('taskPriority'),
  btnAdd:         () => document.getElementById('btnAdd'),
  btnClearDone:   () => document.getElementById('btnClearDone'),
  taskList:       () => document.getElementById('taskList'),
  emptyState:     () => document.getElementById('emptyState'),
  toast:          () => document.getElementById('toast'),
  sidebar:        () => document.getElementById('sidebar'),
  overlay:        () => document.getElementById('overlay'),
  hamburger:      () => document.getElementById('hamburger'),
  dateLabel:      () => document.getElementById('dateLabel'),


  statTotal:      () => document.getElementById('stat-total'),
  statPending:    () => document.getElementById('stat-pending'),
  statDone:       () => document.getElementById('stat-done'),
  ringFill:       () => document.getElementById('ringFill'),
  ringPct:        () => document.getElementById('ringPct'),

  
  countAll:       () => document.getElementById('count-all'),
  countPending:   () => document.getElementById('count-pending'),
  countCompleted: () => document.getElementById('count-completed'),


  navItems:       () => document.querySelectorAll('.nav-item'),
  mfChips:        () => document.querySelectorAll('.mf-chip'),
};



const Storage = {
  
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },


  save(taskArray) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(taskArray));
    } catch (e) {
      console.error('Storage error:', e);
    }
  },
};



const TaskOps = {
  generateId() {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  },


  create(name, category, priority) {
    return {
      id:        this.generateId(),
      name:      name.trim(),
      category,
      priority,
      status:    'pending',       
      createdAt: Date.now(),
    };
  },

  
  toggle(taskArray, id) {
    return taskArray.map(t =>
      t.id === id
        ? { ...t, status: t.status === 'pending' ? 'completed' : 'pending' }
        : t
    );
  },


  delete(taskArray, id) {
    return taskArray.filter(t => t.id !== id);
  },

 
  clearCompleted(taskArray) {
    return taskArray.filter(t => t.status !== 'completed');
  },

  filter(taskArray, filter) {
    if (filter === 'all')       return taskArray;
    if (filter === 'pending')   return taskArray.filter(t => t.status === 'pending');
    if (filter === 'completed') return taskArray.filter(t => t.status === 'completed');
    return taskArray;
  },
};


const Render = {
  tasks(taskArray, filter) {
    const list    = DOM.taskList();
    const empty   = DOM.emptyState();
    const visible = TaskOps.filter(taskArray, filter);

    if (visible.length === 0) {
      list.innerHTML = '';
      empty.style.display = 'flex';
    } else {
      empty.style.display = 'none';
      list.innerHTML = visible.map(t => this.taskCard(t)).join('');
      this.bindCardEvents(list);
    }
  },

  taskCard(task) {
    const isDone    = task.status === 'completed';
    const checkSVG  = isDone
      ? `<svg width="13" height="10" fill="none" viewBox="0 0 13 10">
           <path d="M1 5l3.5 3.5L12 1" stroke="#fff" stroke-width="2"
                 stroke-linecap="round" stroke-linejoin="round"/>
         </svg>`
      : '';

    const priorityLabel = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);

    return `
      <div class="task-card ${isDone ? 'completed' : ''}" data-id="${task.id}">
        <button class="task-checkbox ${isDone ? 'checked' : ''}"
                data-action="toggle" aria-label="Toggle task status">
          ${checkSVG}
        </button>
        <div class="task-info">
          <div class="task-meta">
            <span class="task-category-tag">● ${task.category}</span>
          </div>
          <div class="task-name" title="${task.name}">${task.name}</div>
        </div>
        <span class="priority-badge ${task.priority}">${priorityLabel}</span>
        <div class="task-actions">
          <button class="action-btn delete" data-action="delete" aria-label="Delete task">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24">
              <polyline points="3 6 5 6 21 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M19 6l-1 14H6L5 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              <path d="M10 11v6M14 11v6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
      </div>
    `;
  },

  
  bindCardEvents(list) {
    list.addEventListener('click', (e) => {
      const btn  = e.target.closest('[data-action]');
      if (!btn) return;
      const card = btn.closest('[data-id]');
      if (!card) return;
      const id   = card.dataset.id;

      if (btn.dataset.action === 'toggle') App.toggleTask(id);
      if (btn.dataset.action === 'delete') App.deleteTask(id);
    });
  },

  
  stats(taskArray) {
    const total   = taskArray.length;
    const done    = taskArray.filter(t => t.status === 'completed').length;
    const pending = total - done;
    const pct     = total > 0 ? Math.round((done / total) * 100) : 0;
    const circumference = 2 * Math.PI * 18; // r=18 → ~113.1

    DOM.statTotal().textContent   = total;
    DOM.statPending().textContent = pending;
    DOM.statDone().textContent    = done;
    DOM.ringPct().textContent     = `${pct}%`;
    DOM.ringFill().style.strokeDashoffset =
      circumference - (pct / 100) * circumference;

   
    DOM.countAll().textContent       = total;
    DOM.countPending().textContent   = pending;
    DOM.countCompleted().textContent = done;
  },

 
  activeFilter(filter) {
    DOM.navItems().forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
    DOM.mfChips().forEach(btn => {
      btn.classList.toggle('active', btn.dataset.filter === filter);
    });
  },
};



let toastTimer = null;

function showToast(message) {
  const el = DOM.toast();
  el.textContent = message;
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2500);
}



const App = {
  
  init() {
    tasks = Storage.load();       
    this.setDateLabel();
    this.renderAll();
    this.bindEvents();
  },

 
  renderAll() {
    Render.tasks(tasks, currentFilter);
    Render.stats(tasks);
    Render.activeFilter(currentFilter);
  },

  
  setDateLabel() {
    const now = new Date();
    DOM.dateLabel().textContent = now.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  },


  addTask() {
    const input    = DOM.taskInput();
    const name     = input.value.trim();

    if (!name) {
      input.focus();
      input.classList.add('shake');
      setTimeout(() => input.classList.remove('shake'), 400);
      return;
    }

    const category = DOM.taskCategory().value;
    const priority = DOM.taskPriority().value;
    const newTask  = TaskOps.create(name, category, priority);

    tasks = [newTask, ...tasks];
    Storage.save(tasks);          // FR-6: persist

    input.value = '';
    input.focus();
    this.renderAll();
    showToast('✅ Task added!');
  },


  toggleTask(id) {
    tasks = TaskOps.toggle(tasks, id);
    Storage.save(tasks);
    const task = tasks.find(t => t.id === id);
    this.renderAll();
    showToast(task.status === 'completed' ? '🎉 Task completed!' : '🔄 Marked as pending');
  },

 
  deleteTask(id) {
    tasks = TaskOps.delete(tasks, id);
    Storage.save(tasks);
    this.renderAll();
    showToast('🗑️ Task deleted');
  },

 
  clearCompleted() {
    const count = tasks.filter(t => t.status === 'completed').length;
    if (count === 0) { showToast('No completed tasks to clear'); return; }
    tasks = TaskOps.clearCompleted(tasks);
    Storage.save(tasks);
    this.renderAll();
    showToast(`🧹 Cleared ${count} completed task${count > 1 ? 's' : ''}`);
  },

 
  setFilter(filter) {
    currentFilter = filter;
    this.renderAll();
  },


  bindEvents() {
    DOM.btnAdd().addEventListener('click', () => this.addTask());

    
    DOM.taskInput().addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.addTask();
    });

   
    DOM.btnClearDone().addEventListener('click', () => this.clearCompleted());

    
    DOM.navItems().forEach(btn => {
      btn.addEventListener('click', () => {
        this.setFilter(btn.dataset.filter);
        
        if (window.innerWidth < 768) this.closeSidebar();
      });
    });

   
    DOM.mfChips().forEach(btn => {
      btn.addEventListener('click', () => this.setFilter(btn.dataset.filter));
    });

    
    DOM.hamburger().addEventListener('click', () => this.toggleSidebar());

   
    DOM.overlay().addEventListener('click', () => this.closeSidebar());
  },

  toggleSidebar() {
    DOM.sidebar().classList.toggle('open');
    DOM.overlay().classList.toggle('active');
  },

  closeSidebar() {
    DOM.sidebar().classList.remove('open');
    DOM.overlay().classList.remove('active');
  },
};


document.addEventListener('DOMContentLoaded', () => App.init());
