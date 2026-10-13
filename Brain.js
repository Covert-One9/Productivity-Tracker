
const SUPABASE_URL = "https://zantwocqgvlrcbmnlofm.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_7yn5D0LMFq7X0ovk4Dmsxw_Gh8EouR7";

async function loadTasksFromSupabase() {
  // Get the currently logged-in user
  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) {
    window.location.replace("login.html");
    return;
  }

  // Get this user's tasks from Supabase
  const { data, error } = await supabaseClient
    .from("tasks")
    .select(
      "id, title, notes, due_at, completed, priority, completed_at"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load tasks:", error.message);
    return;
  }

  // Convert Supabase rows into the format your website uses
  const loadedTasks = data.map((task) => ({
    id: task.id,
    text: task.title,
    notes: task.notes || "",
    done: task.completed,
    priority: task.priority || "Medium",
    dueDate: task.due_at
      ? task.due_at.slice(0, 10)
      : "",
    completedAt: task.completed_at
  }));

  // Replace the current tasks with the online tasks
  tasks.splice(0, tasks.length, ...loadedTasks);

  // Refresh the task display
  renderTasks();
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

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
  
async function loadTasksFromSupabase() {
  const { data: { user }, error: userError } =
    await supabaseClient.auth.getUser();

  if (userError || !user) {
    window.location.replace("login.html");
    return;
  }

  const { data, error } = await supabaseClient
    .from("tasks")
    .select("id, title, completed, priority, due_at, completed_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Could not load tasks:", error.message);
    return;
  }

  tasks = data.map(task => ({
    id: task.id,
    text: task.title,
    done: task.completed,
    priority: task.priority || "Medium",
    dueDate: task.due_at ? task.due_at.slice(0, 10) : "",
    completedAt: task.completed_at || null
  }));

loadTasksFromSupabase();
}

  

  function createId() {
    return Date.now().toString(36) +
      Math.random().toString(36).slice(2);
  }


async function saveTasks() {
  try {
    const { data: { user }, error: userError } =
      await supabaseClient.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      console.warn("You must log in before saving tasks.");
      window.location.replace("login.html");
      return;
    }

    for (const task of tasks) {
      const taskData = {
        title: task.text,
        completed: task.done,
        priority: task.priority || "Medium",
        due_at: task.dueDate || null,
        completed_at: task.done
          ? (task.completedAt || new Date().toISOString())
          : null,
        user_id: user.id
      };

      if (typeof task.id === "number") {
        // Update an existing task belonging to this user.
        const { error } = await supabaseClient
          .from("tasks")
          .update(taskData)
          .eq("id", task.id)
          .eq("user_id", user.id);

        if (error) throw error;
      } else {
        // Insert a new task and store its database ID.
        const { data, error } = await supabaseClient
          .from("tasks")
          .insert(taskData)
          .select("id")
          .single();

        if (error) throw error;

        task.id = data.id;
      }
    }

    console.log("Tasks synced to Supabase.");
  } catch (error) {
    console.error("Unable to sync tasks:", error.message);
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

      
      deleteButton.addEventListener("click", async () => {
        try {
          const { data: { user }, error: userError } =
            await supabaseClient.auth.getUser();

          if (userError) throw userError;

          if (!user) {
            window.location.replace("login.html");
            return;
          }

          // Delete the task from Supabase first.
          if (typeof task.id === "number") {
            const { error } = await supabaseClient
              .from("tasks")
              .delete()
              .eq("id", task.id)
              .eq("user_id", user.id);

            if (error) throw error;
          }

          // Remove it from the visible task list.
          tasks = tasks.filter(t => t.id !== task.id);
          renderTasks();
        } catch (error) {
        console.error("Unable to delete task:", error.message);
        alert("Could not delete task. Please try again.");
        }
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
const authSection = document.getElementById("authSection");
const authForm = document.getElementById("authForm");
const authEmail = document.getElementById("authEmail");
const authPassword = document.getElementById("authPassword");
const authMessage = document.getElementById("authMessage");
const signUpBtn = document.getElementById("signUpBtn");
const signOutBtn = document.getElementById("signOutBtn");

if (signUpBtn) signUpBtn.addEventListener("click", async () => {  authMessage.textContent = "Creating account...";

  const { data, error } = await supabaseClient.auth.signUp({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = data.session
    ? "Account created! You are signed in."
    : "Account created! Check your email to confirm your account.";
});

if (authForm) authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  authMessage.textContent = "Logging in...";

  const { error } = await supabaseClient.auth.signInWithPassword({
    email: authEmail.value.trim(),
    password: authPassword.value
  });

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  authMessage.textContent = "Login successful!";
});

signOutBtn.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  authMessage.textContent = error
    ? error.message
    : "You have logged out.";
});

async function updateAuthUI() {
  const { data, error } = await supabaseClient.auth.getSession();

  if (error) {
    authMessage.textContent = error.message;
    return;
  }

  const signedIn = !!data.session;

  authEmail.disabled = signedIn;
  authPassword.disabled = signedIn;
  signUpBtn.hidden = signedIn;
  document.getElementById("signInBtn").hidden = signedIn;
  signOutBtn.hidden = !signedIn;

  authMessage.textContent = signedIn
    ? "Signed in as " + data.session.user.email
    : "Please create an account or log in.";
}

supabaseClient.auth.onAuthStateChange(() => {
  updateAuthUI();
});

updateAuthUI();


const LogOut = document.getElementById("LogOut");

LogOut.addEventListener("click", async () => {
  const { error } = await supabaseClient.auth.signOut();

  if (error) {
    authMessage.textContent = error.message;
  } else {
    window.location.href = "login.html";
  }
});
