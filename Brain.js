
document.addEventListener("DOMContentLoaded", () => {
  const $ = id => document.getElementById(id);

  const form = $("taskForm");
  const input = $("taskInput");
  const priorityInput = $("taskPriority");
  const dueDateInput = $("dueDate");
  const taskList = $("taskList");
  const taskCount = $("taskCount");
  const progress = $("progress");
  const progressText = $("progressText");
  const todayProgress = $("todayProgress");
  const totalTasks = $("totalTasks");

  const STORAGE_KEY = "productivityTasks";
  let tasks = [];

  // Load tasks without crashing if saved data is invalid.
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    const parsed = saved ? JSON.parse(saved) : [];

    if (Array.isArray(parsed)) {
      tasks = parsed
        .filter(t =>
          t &&
          typeof t.text === "string" &&
          typeof t.done === "boolean"
        )
        .map(t => ({
          id: t.id || createId(),
          text: t.text,
          done: t.done,
          priority: ["Low", "Medium", "High"].includes(t.priority)
            ? t.priority
            : "Medium",
          dueDate: typeof t.dueDate === "string" ? t.dueDate : "",
          completedAt: t.completedAt || null
        }));
    }
  } catch (error) {
    console.error("Unable to load tasks:", error);
  }

  function createId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }

  function saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch (error) {
      console.error("Unable to save tasks:", error);
    }
  }

  function isToday(dateString) {
    if (!dateString) return false;

    const today = new Date();
    const localToday =
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    return dateString.slice(0, 10) === localToday;
  }

  function renderTasks() {
    taskList.replaceChildren();

    const completed = tasks.filter(t => t.done).length;
    const percentage = tasks.length
      ? Math.round(completed / tasks.length * 100)
      : 0;

    taskCount.textContent =
      `${completed} of ${tasks.length} tasks completed`;

    progressText.textContent = `${percentage}% complete`;
    progress.style.width = `${percentage}%`;
    progress.setAttribute("role", "progressbar");
    progress.setAttribute("aria-valuemin", "0");
    progress.setAttribute("aria-valuemax", "100");
    progress.setAttribute("aria-valuenow", String(percentage));

    totalTasks.textContent =
      `You have ${tasks.length} task${tasks.length === 1 ? "" : "s"}.`;

    const completedToday = tasks.filter(t =>
      t.done && isToday(t.completedAt)
    ).length;

    todayProgress.textContent =
      `${completedToday} task${completedToday === 1 ? "" : "s"} completed today`;

    if (tasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "empty";
      empty.textContent = "No tasks yet. Add your first task!";
      taskList.appendChild(empty);
      return;
    }

    // Sort by priority, then due date.
    const priorityOrder = { High: 0, Medium: 1, Low: 2 };

    const sortedTasks = [...tasks].sort((a, b) => {
      if (a.done !== b.done) return Number(a.done) - Number(b.done);

      const priorityDifference =
        priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDifference !== 0) return priorityDifference;

      if (!a.dueDate) return b.dueDate ? 1 : 0;
      if (!b.dueDate) return -1;

      return a.dueDate.localeCompare(b.dueDate);
    });

    sortedTasks.forEach(task => {
      const item = document.createElement("li");
      item.classList.toggle("done", task.done);

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = task.done;
      checkbox.setAttribute("aria-label", `Complete ${task.text}`);

      checkbox.addEventListener("change", () => {
        task.done = checkbox.checked;
        task.completedAt = task.done ? new Date().toISOString() : null;

        saveTasks();
        renderTasks();

        if (tasks.length > 0 && tasks.every(t => t.done)) {
          celebrate();
        }
      });

      const details = document.createElement("div");
      details.className = "task-details";

      const name = document.createElement("span");
      name.className = "task-name";
      name.textContent = task.text;

      const metadata = document.createElement("small");
      metadata.className = "task-meta";
      metadata.textContent =
        `${task.priority} priority` +
        (task.dueDate ? ` · Due ${task.dueDate}` : "");

      details.append(name, metadata);

      const priorityBadge = document.createElement("span");
      priorityBadge.className =
        `priority-badge priority-${task.priority.toLowerCase()}`;
      priorityBadge.textContent = task.priority;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "delete";
      deleteButton.textContent = "Delete";
      deleteButton.setAttribute("aria-label", `Delete ${task.text}`);

      deleteButton.addEventListener("click", () => {
        tasks = tasks.filter(t => t.id !== task.id);
        saveTasks();
        renderTasks();
      });

      item.append(checkbox, details, priorityBadge, deleteButton);
      taskList.appendChild(item);
    });
  }

  form.addEventListener("submit", event => {
    event.preventDefault();

    const text = input.value.trim();
    if (!text) {
      input.focus();
      return;
    }

    tasks.push({
      id: createId(),
      text,
      priority: priorityInput.value,
      dueDate: dueDateInput.value,
      done: false,
      completedAt: null
    });

    saveTasks();
    renderTasks();

    input.value = "";
    priorityInput.value = "Medium";
    dueDateInput.value = "";
    input.focus();
  });

  // Focus timer
  const focusButton = $("focusButton");
  const timerDisplay = $("timerDisplay");

  let secondsRemaining = 25 * 60;
  let timerInterval = null;

  function displayTime() {
    const minutes = Math.floor(secondsRemaining / 60);
    const seconds = secondsRemaining % 60;

    timerDisplay.textContent =
      `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  focusButton.addEventListener("click", () => {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
      focusButton.textContent = "Resume Focus";
      return;
    }

    if (secondsRemaining <= 0) {
      secondsRemaining = 25 * 60;
      displayTime();
    }

    focusButton.textContent = "Pause Focus";

    timerInterval = setInterval(() => {
      secondsRemaining--;
      displayTime();

      if (secondsRemaining <= 0) {
        clearInterval(timerInterval);
        timerInterval = null;
        focusButton.textContent = "Start Again";
        timerDisplay.textContent = "Time's up! 🎉";
        celebrate();
      }
    }, 1000);
  });

  // Simple confetti effect without an external library.
  function celebrate() {
    const symbols = ["🎉", "✨", "🎊", "⭐", "💫"];

    for (let i = 0; i < 35; i++) {
      const piece = document.createElement("span");
      piece.className = "confetti-piece";
      piece.textContent =
        symbols[Math.floor(Math.random() * symbols.length)];

      piece.style.left = `${Math.random() * 100}vw`;
      piece.style.animationDelay = `${Math.random() * 0.8}s`;
      piece.style.fontSize = `${14 + Math.random() * 18}px`;

      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 3000);
    }
  }

  $("confettiButton").addEventListener("click", celebrate);

  renderTasks();
});
