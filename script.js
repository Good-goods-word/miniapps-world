
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

function openCalculator() {
  showModal("Calculator", `
    <input id="calcInput" type="text" placeholder="Example: 25 + 15">
    <button class="action-btn" id="calculateBtn">Calculate</button>
    <p id="calcResult" style="margin-top:15px;">Your answer will appear here.</p>
  `);

  document.getElementById("calculateBtn").addEventListener("click", () => {
    const input = document.getElementById("calcInput").value.trim();
    const result = document.getElementById("calcResult");

    if (!input || !/^[0-9+\-*/().%\s]+$/.test(input)) {
      result.textContent = "Please enter a valid maths calculation.";
      return;
    }

    try {
      const answer = Function('"use strict"; return (' + input + ')')();

      result.textContent =
        Number.isFinite(answer) ? "Answer: " + answer : "Invalid calculation.";
    } catch {
      result.textContent = "Sorry, I couldn't calculate that.";
    }
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
