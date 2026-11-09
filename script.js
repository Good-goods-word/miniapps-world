
// ======================================
// MY MINI APPS HUB
// Main JavaScript
// ======================================

// Mobile navigation
const menuToggle = document.getElementById("menuToggle");
const navigation = document.getElementById("navigation");

if (menuToggle && navigation) {
  menuToggle.addEventListener("click", () => {
    navigation.classList.toggle("open");
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
    });
  });
}

// ======================================
// SEARCH
// ======================================

const appSearch = document.getElementById("appSearch");

if (appSearch) {
  appSearch.addEventListener("input", () => {
    const search = appSearch.value.toLowerCase().trim();

    document.querySelectorAll("#externalApps .app-card, #miniApps .app-card")
      .forEach(card => {
        const name = (card.dataset.name || "").toLowerCase();
        const description = card.textContent.toLowerCase();

        card.style.display =
          name.includes(search) || description.includes(search)
            ? ""
            : "none";
      });
  });
}

// ======================================
// CATEGORY FILTERS
// ======================================

const filterButtons = document.querySelectorAll(".filter-btn");

filterButtons.forEach(button => {
  button.addEventListener("click", () => {
    filterButtons.forEach(item => item.classList.remove("active"));
    button.classList.add("active");

    const category = button.dataset.category;

    document.querySelectorAll("#externalApps .app-card").forEach(card => {
      card.style.display =
        category === "all" || card.dataset.category === category
          ? ""
          : "none";
    });

    if (appSearch) appSearch.value = "";
    document.querySelectorAll("#miniApps .app-card").forEach(card => {
      card.style.display = "";
    });
  });
});

// ======================================
// FAVOURITES
// ======================================

const FAVORITES_KEY = "myMiniAppsFavorites";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
  } catch {
    return [];
  }
}

function saveFavorites(favorites) {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function getCardDetails(card) {
  return {
    name: card.dataset.name || "App",
    description: card.querySelector("p")?.textContent || "",
    icon: card.querySelector(".app-icon")?.textContent || "✨",
    href: card.getAttribute("href") || "",
    category: card.dataset.category || "mini",
    app: card.dataset.app || ""
  };
}

function renderFavorites() {
  const container = document.getElementById("favoriteApps");
  if (!container) return;

  const favorites = getFavorites();
  container.innerHTML = "";

  if (favorites.length === 0) {
    container.innerHTML =
      '<p class="empty-message">You haven\'t saved any favourites yet.</p>';
    return;
  }

  favorites.forEach(item => {
    const card = document.createElement("div");
    card.className = "app-card";

    const icon = document.createElement("span");
    icon.className = "app-icon";
    icon.textContent = item.icon;

    const title = document.createElement("h3");
    title.textContent = item.name;

    const description = document.createElement("p");
    description.textContent = item.description;

    const remove = document.createElement("button");
    remove.className = "action-btn";
    remove.textContent = "Remove favourite";
    remove.addEventListener("click", () => {
      saveFavorites(
        getFavorites().filter(fav => fav.name !== item.name)
      );
      renderFavorites();
      updateFavoriteButtons();
    });

    card.append(icon, title, description, remove);

    if (item.href) {
      const open = document.createElement("a");
      open.href = item.href;
      open.target = "_blank";
      open.rel = "noopener noreferrer";
      open.className = "primary-btn";
      open.textContent = "Open app";
      open.style.marginTop = "12px";
      card.appendChild(open);
    } else if (item.app) {
      const open = document.createElement("button");
      open.className = "action-btn";
      open.textContent = "Open app";
      open.addEventListener("click", () => openMiniApp(item.app));
      card.appendChild(open);
    }

    container.appendChild(card);
  });
}

function updateFavoriteButtons() {
  const favorites = getFavorites();

  document.querySelectorAll("#externalApps .app-card, #miniApps .app-card")
    .forEach(card => {
      const button = card.querySelector(".fav-toggle");
      if (!button) return;

      const name = card.dataset.name;
      const saved = favorites.some(item => item.name === name);

      button.textContent = saved ? "★" : "☆";
      button.setAttribute(
        "aria-label",
        saved ? "Remove from favourites" : "Add to favourites"
      );
    });
}

document.querySelectorAll("#externalApps .app-card, #miniApps .app-card")
  .forEach(card => {
    const button = document.createElement("button");
    button.className = "fav-toggle";
    button.type = "button";
    button.textContent = "☆";
    button.title = "Add to favourites";

    button.style.cssText =
      "float:right;background:transparent;border:0;color:#b5a2ff;font-size:25px;cursor:pointer;";

    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();

      const item = getCardDetails(card);
      const favorites = getFavorites();
      const exists = favorites.some(fav => fav.name === item.name);

      if (exists) {
        saveFavorites(favorites.filter(fav => fav.name !== item.name));
      } else {
        saveFavorites([...favorites, item]);
      }

      updateFavoriteButtons();
      renderFavorites();
    });

    card.appendChild(button);
  });

updateFavoriteButtons();
renderFavorites();

// ======================================
// MINI APP MODAL
// ======================================

const appModal = document.getElementById("appModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const closeModal = document.getElementById("closeModal");

function showModal(title, content) {
  modalTitle.textContent = title;
  modalBody.innerHTML = content;
  appModal.classList.add("show");
  appModal.setAttribute("aria-hidden", "false");
}

function hideModal() {
  appModal.classList.remove("show");
  appModal.setAttribute("aria-hidden", "true");
}

if (closeModal) {
  closeModal.addEventListener("click", hideModal);
}

if (appModal) {
  appModal.addEventListener("click", event => {
    if (event.target === appModal) hideModal();
  });
}

document.addEventListener("keydown", event => {
  if (event.key === "Escape") hideModal();
});

// ======================================
// CALCULATOR
// ======================================

async function openCalculator() {
  showModal("Complete Mathematics Solver", `
    <div id="mathSolver" style="padding:12px;color:var(--text,#222)">
      <h3>Scientific & Advanced Mathematics</h3>
      <p>Enter an expression or mathematical problem.</p>

      <select id="mathMode" style="width:100%;padding:12px;margin-bottom:10px">
        <option value="calculate">Scientific calculation</option>
        <option value="simplify">Simplify</option>
        <option value="expand">Expand</option>
        <option value="factor">Factorise</option>
        <option value="solve">Solve equation</option>
        <option value="diff">Differentiate</option>
        <option value="integrate">Integrate</option>
        <option value="limit">Calculate limit</option>
        <option value="matrix">Matrix expression</option>
        <option value="statistics">Statistics</option>
      </select>

      <input id="mathExpression" placeholder="Example: x^2 - 4"
        style="width:100%;padding:13px;margin-bottom:10px">

      <div style="display:flex;gap:8px">
        <input id="mathVariable" value="x" placeholder="Variable"
          style="width:50%;padding:11px">
        <input id="mathApproach" placeholder="Limit point (optional)"
          style="width:50%;padding:11px">
      </div>

      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:7px;margin:12px 0">
        ${["7","8","9","/","4","5","6","*","1","2","3","-","0",".","(",")","+","^","π","sqrt(","sin(","cos(","tan(","log(","ln(","!","%","e","AC","DEL","="].map(k =>
          `<button type="button" data-mathkey="${k}" style="padding:12px;border:1px solid #aaa;border-radius:8px">${k}</button>`
        ).join("")}
      </div>

      <button id="mathRun" style="width:100%;padding:14px;border:0;border-radius:9px;background:#6555d9;color:white;font-weight:bold">
        Solve problem
      </button>

      <div id="mathOutput" style="padding:15px;margin-top:12px;border-radius:10px;background:var(--card-bg,#eee);overflow-wrap:anywhere">
        Your answer will appear here.
      </div>

      <button id="mathCopy" style="margin-top:8px;padding:10px">Copy answer</button>

      <h4>Calculation history</h4>
      <div id="mathHistory"></div>
    </div>
  `);

  const root = document.getElementById("mathSolver");
  if (!root) return;

  const get = id => root.querySelector("#" + id);
  const expression = get("mathExpression");
  const output = get("mathOutput");
  const history = get("mathHistory");

  function loadEngine() {
    if (window.nerdamer) return Promise.resolve();

    if (window.mathEngineLoading) return window.mathEngineLoading;

    window.mathEngineLoading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/nerdamer@2.0.1/dist/bundle.js";
      script.onload = () => window.nerdamer
        ? resolve()
        : reject(new Error("Mathematics engine did not initialize."));
      script.onerror = () => reject(new Error("Could not load mathematics engine. Check your internet connection."));
      document.head.appendChild(script);
    });

    return window.mathEngineLoading;
  }

  root.querySelectorAll("[data-mathkey]").forEach(button => {
    button.addEventListener("click", () => {
      const key = button.dataset.mathkey;

      if (key === "AC") expression.value = "";
      else if (key === "DEL") expression.value = expression.value.slice(0,-1);
      else if (key === "=") get("mathRun").click();
      else expression.value += key;

      expression.focus();
    });
  });

  function addHistory(question, answer) {
    const item = document.createElement("div");
    item.style.padding = "9px";
    item.style.borderBottom = "1px solid #aaa";
    item.textContent = question + " = " + answer;
    history.prepend(item);
  }

  function statistics(values) {
    const sorted = [...values].sort((a,b) => a-b);
    const sum = values.reduce((a,b) => a+b,0);
    const mean = sum / values.length;
    const middle = Math.floor(sorted.length/2);
    const median = sorted.length % 2
      ? sorted[middle]
      : (sorted[middle-1] + sorted[middle])/2;

    const counts = {};
    values.forEach(v => counts[v] = (counts[v] || 0)+1);
    const maxCount = Math.max(...Object.values(counts));
    const modes = Object.keys(counts)
      .filter(k => counts[k] === maxCount)
      .join(", ");

    const variance = values.reduce((s,v) => s+(v-mean)**2,0)/values.length;

    return [
      "Count: " + values.length,
      "Sum: " + sum,
      "Mean: " + mean,
      "Median: " + median,
      "Mode: " + (maxCount === 1 ? "No repeated mode" : modes),
      "Population variance: " + variance,
      "Population standard deviation: " + Math.sqrt(variance)
    ].join("\n");
  }

  get("mathRun").addEventListener("click", async () => {
    const question = expression.value.trim();
    const mode = get("mathMode").value;
    const variable = get("mathVariable").value.trim() || "x";
    const point = get("mathApproach").value.trim();

    if (!question) {
      output.textContent = "Enter a mathematical problem first.";
      return;
    }

    output.textContent = "Loading mathematics engine...";

    try {
      if (mode === "statistics") {
        const values = question.split(/[,;\s]+/).map(Number);
        if (!values.length || values.some(v => !Number.isFinite(v))) {
          throw Error("Enter numbers separated by commas, for example 2,4,6,8.");
        }

        const answer = statistics(values);
        output.textContent = answer;
        addHistory(question, answer);
        return;
      }

      await loadEngine();

      const math = window.nerdamer;
      let answer;

      switch (mode) {
        case "calculate":
          const fixedExpression = question
  .replace(/[×x]/g, "*")
  .replace(/(\d+(?:\.\d+)?)%(?=\d|\()/g, "($1/100)*")
  .replace(/(\d+(?:\.\d+)?)%(?!\d|\()/g, "($1/100)");

answer = math(fixedExpression).evaluate().text();
          break;

        case "simplify":
          answer = math.simplify(question).text();
          break;

        case "expand":
          answer = math.expand(question).text();
          break;

        case "factor":
          answer = math.factor(question).text();
          break;

        case "solve":
          answer = math.solve(question, variable).text();
          break;

        case "diff":
          answer = math.diff(question, variable).text();
          break;

        case "integrate":
          answer = math.integrate(question, variable).text();
          break;

        case "limit":
          if (!point) throw Error("Enter the point for the limit.");
          answer = math.limit(question, variable, point).text();
          break;

        case "matrix":
          answer = math(question).text();
          break;

        default:
          throw Error("Choose a valid mathematics operation.");
      }

      output.textContent = answer;
      addHistory(question, answer);

    } catch (error) {
      output.textContent = "Unable to solve: " + error.message;
    }
  });

  get("mathCopy").addEventListener("click", () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(output.textContent);
    }
  });

  expression.addEventListener("keydown", event => {
    if (event.key === "Enter") get("mathRun").click();
  });
}





// ======================================
// NOTES APP
// ======================================

function openNotes() {
  const savedNotes = localStorage.getItem("miniHubNotes") || "";

  showModal("My Notes", `
    <textarea id="notesInput" placeholder="Write your ideas here..."></textarea>
    <button class="action-btn" id="saveNotes">Save Notes</button>
    <p id="notesMessage"></p>
  `);

  const notesInput = document.getElementById("notesInput");
  notesInput.value = savedNotes;

  document.getElementById("saveNotes").addEventListener("click", () => {
    localStorage.setItem("miniHubNotes", notesInput.value);
    document.getElementById("notesMessage").textContent = "Notes saved successfully!";
  });
}

// ======================================
// UNIT CONVERTER
// ======================================

function openConverter() {
  showModal("Unit Converter", `
    <input id="convertValue" type="number" placeholder="Enter a number">
    <select id="convertType">
      <option value="km">Kilometres to Miles</option>
      <option value="miles">Miles to Kilometres</option>
      <option value="kg">Kilograms to Pounds</option>
      <option value="pounds">Pounds to Kilograms</option>
      <option value="cm">Centimetres to Inches</option>
      <option value="inches">Inches to Centimetres</option>
    </select>
    <button class="action-btn" id="convertBtn">Convert</button>
    <p id="convertResult" style="margin-top:15px;"></p>
  `);

  document.getElementById("convertBtn").addEventListener("click", () => {
    const value = Number(document.getElementById("convertValue").value);
    const type = document.getElementById("convertType").value;
    const result = document.getElementById("convertResult");

    if (document.getElementById("convertValue").value === "" || !Number.isFinite(value)) {
      result.textContent = "Please enter a number.";
      return;
    }

    const conversions = {
      km: value * 0.621371,
      miles: value * 1.60934,
      kg: value * 2.20462,
      pounds: value * 0.453592,
      cm: value * 0.393701,
      inches: value * 2.54
    };

    result.textContent = "Result: " + conversions[type].toFixed(3);
  });
}

// ======================================
// TIC TAC TOE
// ======================================

function openGame() {
  let board = Array(9).fill("");
  let currentPlayer = "X";
  let gameOver = false;

  showModal("Tic Tac Toe", `
    <p id="gameStatus">Player X's turn</p>
    <div id="gameBoard" style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin:20px 0;">
      ${board.map((_, index) =>
        `<button class="action-btn game-cell" data-index="${index}" style="height:65px;font-size:25px;"></button>`
      ).join("")}
    </div>
    <button class="action-btn" id="restartGame">Restart Game</button>
  `);

  const status = document.getElementById("gameStatus");
  const cells = document.querySelectorAll(".game-cell");

  const winningLines = [
    [0,1,2], [3,4,5], [6,7,8],
    [0,3,6], [1,4,7], [2,5,8],
    [0,4,8], [2,4,6]
  ];

  function checkWinner() {
    return winningLines.some(line =>
      line.every(index => board[index] === currentPlayer)
    );
  }

  cells.forEach(cell => {
    cell.addEventListener("click", () => {
      const index = Number(cell.dataset.index);

      if (board[index] || gameOver) return;

      board[index] = currentPlayer;
      cell.textContent = currentPlayer;

      if (checkWinner()) {
        status.textContent = "Player " + currentPlayer + " wins! 🎉";
        gameOver = true;
        return;
      }

      if (board.every(Boolean)) {
        status.textContent = "It's a draw!";
        gameOver = true;
        return;
      }

      currentPlayer = currentPlayer === "X" ? "O" : "X";
      status.textContent = "Player " + currentPlayer + "'s turn";
    });
  });

  document.getElementById("restartGame").addEventListener("click", openGame);
}

// ======================================
// OPEN MINI APPS
// ======================================

function openMiniApp(app) {
  if (app === "calculator") openCalculator();
  if (app === "notes") openNotes();
  if (app === "converter") openConverter();
  if (app === "game") openGame();
}

document.querySelectorAll(".mini-card").forEach(card => {
  card.addEventListener("click", () => {
    openMiniApp(card.dataset.app);
  });
});

// ======================================
// DOWNLOADER LINK CHECKER
// ======================================

const checkDownload = document.getElementById("checkDownload");

if (checkDownload) {
  checkDownload.addEventListener("click", () => {
    const input = document.getElementById("downloadUrl").value.trim();
    const message = document.getElementById("downloadMessage");

    if (!input) {
      message.textContent = "Please paste a link first.";
      return;
    }

    try {
      const url = new URL(input);

      if (!["http:", "https:"].includes(url.protocol)) {
        throw new Error("Invalid link");
      }

      message.textContent =
        "Link format looks valid! Actual downloading requires a supported platform integration.";
    } catch {
      message.textContent = "Please enter a valid web link.";
    }
  });
}

console.log("My Mini Apps Hub is ready!");
