const state = {
  data: null,
  currentView: "dashboard",
  logSearch: "",
  actionGroupBy: "priority",
  documentCategory: "all",
  documentSource: "all"
};

const content = document.getElementById("content");
const pageTitle = document.getElementById("page-title");
const menuToggle = document.getElementById("menuToggle");
const sidebar = document.getElementById("sidebar");
const navLinks = Array.from(document.querySelectorAll(".nav-link"));

document.addEventListener("DOMContentLoaded", init);

async function init() {
  bindShellEvents();

  try {
    state.data = await loadAllData();
    renderView(state.currentView);
  } catch (error) {
    console.error("Failed to initialize control panel:", error);
    content.innerHTML = `
      <section class="empty-state">
        <h3>Unable to load local data</h3>
        <p>Check that the JSON files exist in the <code>data/</code> folder and that you are serving the site through a local web server.</p>
      </section>
    `;
  }
}

function bindShellEvents() {
  navLinks.forEach((button) => {
    button.addEventListener("click", () => {
      setView(button.dataset.view);
    });
  });

  menuToggle.addEventListener("click", () => {
    const isOpen = sidebar.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) {
      return;
    }

    const { filter, value } = button.dataset;
    if (filter === "action-group") {
      state.actionGroupBy = value;
      renderView("actions");
    }
  });

  content.addEventListener("input", (event) => {
    if (event.target.matches("#logSearch")) {
      state.logSearch = event.target.value.trim().toLowerCase();
      renderLogs();
    }
  });

  content.addEventListener("change", (event) => {
    if (event.target.matches("#documentCategory")) {
      state.documentCategory = event.target.value;
      renderDocuments();
    }

    if (event.target.matches("#documentSource")) {
      state.documentSource = event.target.value;
      renderDocuments();
    }
  });
}

async function loadAllData() {
  const files = ["dashboard", "actions", "logs", "documents"];
  const results = await Promise.all(
    files.map(async (file) => {
      const response = await fetch(`data/${file}.json`, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Could not load data/${file}.json`);
      }
      return [file, await response.json()];
    })
  );

  return Object.fromEntries(results);
}

function setView(view) {
  state.currentView = view;
  renderView(view);
  sidebar.classList.remove("is-open");
  menuToggle.setAttribute("aria-expanded", "false");
}

function renderView(view) {
  const labelMap = {
    dashboard: "Dashboard",
    actions: "Action Board",
    logs: "Logs",
    documents: "Documents"
  };

  navLinks.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.view === view);
  });

  pageTitle.textContent = labelMap[view];

  if (view === "dashboard") {
    renderDashboard();
  } else if (view === "actions") {
    renderActions();
  } else if (view === "logs") {
    renderLogs();
  } else if (view === "documents") {
    renderDocuments();
  }

  content.focus();
}

function renderDashboard() {
  const { dashboard } = state.data;
  const hasOverview = [
    dashboard.overview.title,
    dashboard.overview.description,
    dashboard.overview.focusStatus,
    dashboard.overview.reviewWindow,
    dashboard.overview.owner,
    dashboard.lastUpdated.timestamp,
    dashboard.lastUpdated.by,
    dashboard.lastUpdated.note,
    dashboard.lastUpdated.nextReview
  ].some(Boolean);

  const hasMetrics = dashboard.metrics.length > 0;
  const hasProjects = dashboard.projects.length > 0;

  content.innerHTML = `
    ${hasOverview ? `
      <section class="hero-panel">
        <div>
          <p class="eyebrow">Program Health</p>
          <h3>${dashboard.overview.title}</h3>
          <p class="muted">${dashboard.overview.description}</p>
          <div class="badge-row">
            ${dashboard.overview.focusStatus ? `<span class="badge status ${normalizeClass(dashboard.overview.focusStatus)}">${dashboard.overview.focusStatus}</span>` : ""}
            ${dashboard.overview.reviewWindow ? `<span class="pill">${dashboard.overview.reviewWindow}</span>` : ""}
            ${dashboard.overview.owner ? `<span class="pill">Owner: ${dashboard.overview.owner}</span>` : ""}
          </div>
        </div>
        <div class="summary-card">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Last Updated</p>
              <h3>${dashboard.lastUpdated.timestamp || "No updates yet"}</h3>
            </div>
          </div>
          <div class="summary-list">
            <div class="summary-item">
              <span class="field-label">Updated by</span>
              <strong>${dashboard.lastUpdated.by || "Add a name"}</strong>
            </div>
            <div class="summary-item">
              <span class="field-label">Notes</span>
              <strong>${dashboard.lastUpdated.note || "Add a short update summary"}</strong>
            </div>
            <div class="summary-item">
              <span class="field-label">Next review</span>
              <strong>${dashboard.lastUpdated.nextReview || "Set a review date"}</strong>
            </div>
          </div>
        </div>
      </section>
    ` : `
      <section class="empty-state">
        <h3>Dashboard overview is empty</h3>
        <p>Add the top-level summary fields in <code>data/dashboard.json</code> to populate the main control-center snapshot.</p>
      </section>
    `}

    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Summary Metrics</p>
          <h3>Where things stand right now</h3>
        </div>
      </div>
      ${hasMetrics ? `
        <div class="metrics-grid">
          ${dashboard.metrics.map((metric) => `
            <article class="metric-card">
              <p class="field-label">${metric.label}</p>
              <p class="metric-value">${metric.value}</p>
              <p class="metric-delta">${metric.delta}</p>
              <p class="muted">${metric.note}</p>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="empty-state">
          <p>No metrics yet. Add items to <code>dashboard.metrics</code> in <code>data/dashboard.json</code>.</p>
        </div>
      `}
    </section>

    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Project Progress</p>
          <h3>Ongoing initiatives</h3>
        </div>
      </div>
      ${hasProjects ? `
        <div class="progress-list">
          ${dashboard.projects.map((project) => `
            <article class="status-card">
              <div class="progress-meta">
                <div>
                  <h4>${project.name}</h4>
                  <p class="muted">${project.summary}</p>
                </div>
                <div class="badge-row">
                  <span class="status ${normalizeClass(project.status)}">${project.status}</span>
                  <span class="pill">${project.owner}</span>
                </div>
              </div>
              <div class="progress-row">
                <div class="progress-meta">
                  <span class="field-label">Completion</span>
                  <strong>${project.progress}%</strong>
                </div>
                <div class="progress-track" aria-label="${project.name} progress">
                  <div class="progress-fill" style="width: ${project.progress}%"></div>
                </div>
              </div>
              <div class="detail-list">
                <div class="detail-item">
                  <span class="field-label">Target</span>
                  <strong>${project.targetDate}</strong>
                </div>
                <div class="detail-item">
                  <span class="field-label">Next milestone</span>
                  <strong>${project.nextMilestone}</strong>
                </div>
              </div>
            </article>
          `).join("")}
        </div>
      ` : `
        <div class="empty-state">
          <p>No projects yet. Add items to <code>dashboard.projects</code> in <code>data/dashboard.json</code>.</p>
        </div>
      `}
    </section>
  `;
}

function renderActions() {
  const { actions } = state.data;
  const groupedActions = groupActions(actions.items, state.actionGroupBy);

  content.innerHTML = `
    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Manual Work Queue</p>
          <h3>Action Board</h3>
          <p class="muted">Actions are rendered from <code>data/actions.json</code> so you can update the board without editing app code.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-controls">
          <button class="pill ${state.actionGroupBy === "priority" ? "is-active" : ""}" data-filter="action-group" data-value="priority" type="button">Group by priority</button>
          <button class="pill ${state.actionGroupBy === "status" ? "is-active" : ""}" data-filter="action-group" data-value="status" type="button">Group by status</button>
          <button class="pill ${state.actionGroupBy === "category" ? "is-active" : ""}" data-filter="action-group" data-value="category" type="button">Group by category</button>
        </div>
        <span class="muted">${actions.items.length} tracked actions</span>
      </div>
      ${actions.items.length ? Object.entries(groupedActions).map(([group, items]) => `
        <section class="panel">
          <div class="section-heading">
            <div>
              <p class="eyebrow">${state.actionGroupBy}</p>
              <h3>${group}</h3>
            </div>
            <span class="pill">${items.length} items</span>
          </div>
          <div class="actions-grid">
            ${items.map((item) => `
              <article class="action-card">
                <header>
                  <div>
                    <h4>${item.title}</h4>
                    <p class="muted">${item.description}</p>
                  </div>
                  <div class="badge-row">
                    <span class="priority ${normalizeClass(item.priority)}">${item.priority}</span>
                    <span class="status ${normalizeClass(item.status)}">${item.status}</span>
                  </div>
                </header>
                <div class="detail-list">
                  <div class="detail-item">
                    <span class="field-label">Category</span>
                    <strong>${item.category}</strong>
                  </div>
                  <div class="detail-item">
                    <span class="field-label">Owner</span>
                    <strong>${item.owner}</strong>
                  </div>
                  <div class="detail-item">
                    <span class="field-label">Due</span>
                    <strong>${item.dueDate}</strong>
                  </div>
                </div>
                <p><strong>Notes:</strong> ${item.notes}</p>
                <div class="action-links">
                  ${item.links.map((link) => `
                    <a class="button-link" href="${link.url}" target="_blank" rel="noopener noreferrer">${link.label}</a>
                  `).join("")}
                </div>
              </article>
            `).join("")}
          </div>
        </section>
      `).join("") : `
        <div class="empty-state">
          <p>No actions yet. Add items to <code>data/actions.json</code> and they will appear here automatically.</p>
        </div>
      `}
    </section>
  `;
}

function renderLogs() {
  const { logs } = state.data;
  const search = state.logSearch;

  const filteredLogs = logs.entries.filter((entry) => {
    if (!search) {
      return true;
    }

    const haystack = [
      entry.timestamp,
      entry.category,
      entry.type,
      entry.title,
      entry.text
    ].join(" ").toLowerCase();

    return haystack.includes(search);
  });

  content.innerHTML = `
    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Audit Trail</p>
          <h3>Searchable Logs</h3>
          <p class="muted">Search is fast and case-insensitive across timestamps, categories, titles, and full log text.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-controls">
          <label for="logSearch" class="field-label">Find entries</label>
          <input class="input" id="logSearch" type="search" placeholder="Search logs by keyword, type, or date" value="${escapeAttribute(state.logSearch)}">
        </div>
        <span class="muted">${filteredLogs.length} of ${logs.entries.length} entries shown</span>
      </div>
      <section class="logs-grid">
        ${filteredLogs.length ? filteredLogs.map((entry) => `
          <details class="log-entry">
            <summary>
              <div>
                <h4>${entry.title}</h4>
                <div class="badge-row">
                  <span class="pill">${entry.category}</span>
                  <span class="pill">${entry.type}</span>
                </div>
              </div>
              <div>
                <p class="timestamp">${entry.timestamp}</p>
              </div>
            </summary>
            <div class="log-body">
              <p>${entry.text}</p>
            </div>
          </details>
        `).join("") : `
          <div class="empty-state">
            <p>No logs matched your current search.</p>
          </div>
        `}
      </section>
    </section>
  `;
}

function renderDocuments() {
  const { documents } = state.data;
  const categories = getUniqueValues(documents.items, "category");
  const sources = getUniqueValues(documents.items, "source");

  const filteredDocuments = documents.items.filter((item) => {
    const categoryMatch = state.documentCategory === "all" || item.category === state.documentCategory;
    const sourceMatch = state.documentSource === "all" || item.source === state.documentSource;
    return categoryMatch && sourceMatch;
  });

  content.innerHTML = `
    <section class="panel">
      <div class="section-heading">
        <div>
          <p class="eyebrow">Reference Library</p>
          <h3>Documents</h3>
          <p class="muted">External links open safely in a new tab. Add or edit entries in <code>data/documents.json</code>.</p>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-controls">
          <select class="select" id="documentCategory" aria-label="Filter documents by category">
            <option value="all">All categories</option>
            ${categories.map((category) => `
              <option value="${category}" ${state.documentCategory === category ? "selected" : ""}>${category}</option>
            `).join("")}
          </select>
          <select class="select" id="documentSource" aria-label="Filter documents by source">
            <option value="all">All sources</option>
            ${sources.map((source) => `
              <option value="${source}" ${state.documentSource === source ? "selected" : ""}>${source}</option>
            `).join("")}
          </select>
        </div>
        <span class="muted">${filteredDocuments.length} of ${documents.items.length} documents shown</span>
      </div>
      ${filteredDocuments.length ? `
        <section class="documents-grid">
          ${filteredDocuments.map((item) => `
            <article class="document-card">
              <header>
                <div>
                  <h4>${item.title}</h4>
                  <p class="muted">${item.description}</p>
                </div>
              </header>
              <div class="document-meta">
                <span class="pill">${item.category}</span>
                <span class="pill">${item.source}</span>
              </div>
              <div class="detail-list">
                <div class="detail-item">
                  <span class="field-label">Link</span>
                  <a class="button-link secondary" href="${item.url}" target="_blank" rel="noopener noreferrer">Open document</a>
                </div>
              </div>
            </article>
          `).join("")}
        </section>
      ` : `
        <div class="empty-state">
          <p>${documents.items.length ? "No documents match the current filters." : "No documents yet. Add items to `data/documents.json` to build your reference library."}</p>
        </div>
      `}
    </section>
  `;
}

function groupActions(items, groupBy) {
  const ordered = [...items].sort((a, b) => {
    const priorityRank = { High: 0, Medium: 1, Low: 2 };
    const statusRank = { "In Progress": 0, Todo: 1, Blocked: 2, Done: 3 };

    if (groupBy === "priority") {
      return priorityRank[a.priority] - priorityRank[b.priority];
    }

    if (groupBy === "status") {
      return statusRank[a.status] - statusRank[b.status];
    }

    return a.category.localeCompare(b.category);
  });

  return ordered.reduce((groups, item) => {
    const key = item[groupBy === "category" ? "category" : groupBy];
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {});
}

function getUniqueValues(items, key) {
  return [...new Set(items.map((item) => item[key]))];
}

function normalizeClass(value) {
  return value.toLowerCase().replace(/\s+/g, "-");
}

function escapeAttribute(value) {
  return String(value).replace(/"/g, "&quot;");
}
