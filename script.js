
/* ==========================================
   MY MINI APPS HUB
   COMPLETE SCRIPT.JS REPLACEMENT
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("appModal");
  const modalContent = modal?.querySelector(".modal-content");
  const modalTitle = document.getElementById("modalTitle");
  const modalBody = document.getElementById("modalBody");
  const closeModalButton = document.getElementById("closeModal");
  const menuToggle = document.getElementById("menuToggle");
  const navigation = document.getElementById("navigation");

  const FAVORITES_KEY = "myMiniAppsFavorites";
  const NOTES_KEY = "miniHubNotes";

  let gameBoard = ["", "", "", "", "", "", "", "", ""];
  let gameOver = false;

  /* ---------- HELPERS ---------- */

  function loadScript(url, globalName) {
    return new Promise((resolve, reject) => {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }

      const existing = document.querySelector(
        `script[data-library="${globalName}"]`
      );

      if (existing) {
        existing.addEventListener("load", () => {
          window[globalName]
            ? resolve(window[globalName])
            : reject(new Error(`${globalName} did not load.`));
        });

        existing.addEventListener("error", () => {
          reject(new Error(`Could not load ${globalName}.`));
        });

        return;
      }

      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.dataset.library = globalName;

      script.onload = () => {
        window[globalName]
          ? resolve(window[globalName])
          : reject(new Error(`${globalName} did not load.`));
      };

      script.onerror = () => {
        reject(new Error(`Could not load ${globalName}.`));
      };

      document.head.appendChild(script);
    });
  }

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    })[character]);
  }

  function getFavorites() {
    try {
      const saved = JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
      return Array.isArray(saved) ? saved : [];
    } catch {
      return [];
    }
  }

  function saveFavorites(favorites) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
  }

  function getCardKey(card) {
    return card.dataset.app ||
      card.dataset.platformUrl ||
      card.dataset.name ||
      "";
  }

  /* ---------- MOBILE NAVIGATION ---------- */

  if (menuToggle && navigation) {
    menuToggle.addEventListener("click", () => {
      const isOpen = navigation.classList.toggle("open");

      menuToggle.setAttribute("aria-expanded", String(isOpen));
      menuToggle.setAttribute(
        "aria-label",
        isOpen ? "Close navigation" : "Open navigation"
      );
    });

    navigation.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navigation.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
        menuToggle.setAttribute("aria-label", "Open navigation");
      });
    });

    document.addEventListener("click", event => {
      if (
        navigation.classList.contains("open") &&
        !navigation.contains(event.target) &&
        !menuToggle.contains(event.target)
      ) {
        navigation.classList.remove("open");
        menuToggle.setAttribute("aria-expanded", "false");
      }
    });
  }

  /* ---------- MODAL ---------- */

  function openModal(title, content, platformMode = false) {
    if (!modal || !modalBody || !modalTitle) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    modal.classList.add("show");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    if (modalContent) {
      modalContent.classList.toggle("platform-viewer", platformMode);
    }

    if (closeModalButton) closeModalButton.focus();
  }

  function closeModal() {
    if (!modal) return;

    modal.classList.remove("show");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");

    if (modalBody) modalBody.innerHTML = "";

    if (modalContent) {
      modalContent.classList.remove("platform-viewer");
    }
  }

  closeModalButton?.addEventListener("click", closeModal);

  modal?.addEventListener("click", event => {
    if (event.target === modal) closeModal();
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && modal?.classList.contains("show")) {
      closeModal();
    }
  });

  /* ---------- FAVOURITES ---------- */

  function addFavoriteButton(card) {
    if (card.parentElement.querySelector(":scope > .favorite-button")) return;

    const favoriteButton = document.createElement("button");
    favoriteButton.type = "button";
    favoriteButton.className = "favorite-button";
    favoriteButton.setAttribute("aria-label", "Add to favourites");
    favoriteButton.innerHTML = "☆";

    card.parentElement.appendChild(favoriteButton);
  }

  function refreshFavoriteButtons() {
    const favorites = getFavorites();

    document.querySelectorAll(
      "#platformGrid .app-card, #miniAppsGrid .app-card"
    ).forEach(card => {
      addFavoriteButton(card);

      const button = card.parentElement.querySelector(
        ":scope > .favorite-button"
      );

      const active = favorites.includes(getCardKey(card));

      button.classList.toggle("active", active);
      button.innerHTML = active ? "★" : "☆";
      button.setAttribute(
        "aria-label",
        active ? "Remove from favourites" : "Add to favourites"
      );
    });
  }

  function renderFavorites() {
    const container = document.getElementById("favoriteApps");
    if (!container) return;

    container.innerHTML = "";

    const favorites = getFavorites();

    if (!favorites.length) {
      container.innerHTML =
        '<p class="empty-state">Your favourite apps will appear here.</p>';
      return;
    }

    favorites.forEach(key => {
      const original = document.querySelector(
        `#platformGrid .app-card[data-name="${CSS.escape(key)}"], ` +
        `#miniAppsGrid .app-card[data-name="${CSS.escape(key)}"]`
      ) || Array.from(document.querySelectorAll(
        "#platformGrid .app-card, #miniAppsGrid .app-card"
      )).find(card => getCardKey(card) === key);

      if (!original) return;

      const wrapper = document.createElement("div");
      wrapper.className = "app-card-wrap";

      const clone = original.cloneNode(true);
      clone.classList.add("favorite-copy");

      wrapper.appendChild(clone);

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "favorite-button active";
      removeButton.innerHTML = "★";
      removeButton.setAttribute("aria-label", "Remove from favourites");

      wrapper.appendChild(removeButton);
      container.appendChild(wrapper);
    });

    refreshFavoriteButtons();
  }

  document.addEventListener("click", event => {
    const favoriteButton = event.target.closest(".favorite-button");
    if (!favoriteButton) return;

    event.preventDefault();
    event.stopPropagation();

    const wrapper = favoriteButton.closest(".app-card-wrap");
    const card = wrapper?.querySelector(".app-card");
    if (!card) return;

    const key = getCardKey(card);
    if (!key) return;

    let favorites = getFavorites();

    if (favorites.includes(key)) {
      favorites = favorites.filter(item => item !== key);
    } else {
      favorites.push(key);
    }

    saveFavorites(favorites);
    refreshFavoriteButtons();
    renderFavorites();
  });

  /* ---------- PLATFORM VIEWER ---------- */

  function openPlatform(card) {
    const url = card.dataset.platformUrl;
    const name = card.dataset.name || "Platform";

    if (!url) return;

    let safeURL;

    try {
      safeURL = new URL(url);

      if (safeURL.protocol !== "https:") {
        throw new Error("Only secure website links are supported.");
      }
    } catch {
      openModal(name, "<p>That platform link is not valid.</p>");
      return;
    }

    const content = `
      <p class="platform-note">
        This platform is being opened inside My Mini Apps Hub.
        Some websites block embedded viewing, so the panel may not load.
      </p>

      <iframe
        class="platform-frame"
        src="${escapeHTML(safeURL.href)}"
        title="${escapeHTML(name)}"
        loading="lazy"
        referrerpolicy="strict-origin-when-cross-origin"
        allow="clipboard-read; clipboard-write; fullscreen"
        allowfullscreen>
      </iframe>

      <p class="platform-note">
        If the website does not appear, use its official website link below.
      </p>

      <a
        class="platform-fallback"
        href="${escapeHTML(safeURL.href)}"
        target="_blank"
        rel="noopener noreferrer">
        Open official ${escapeHTML(name)} website
      </a>
    `;

    openModal(name, content, true);
  }

  /* ---------- CARD OPENING ---------- */

  function activateCard(card) {
    if (card.dataset.platformUrl) {
      openPlatform(card);
      return;
    }

    if (card.dataset.app) {
      openMiniApp(card.dataset.app);
    }
  }

  document.addEventListener("click", event => {
    const card = event.target.closest(".app-card");

    if (!card || event.target.closest(".favorite-button")) return;

    activateCard(card);
  });

  document.addEventListener("keydown", event => {
    const card = event.target.closest(".app-card[role='button']");

    if (!card || event.target.closest(".favorite-button")) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateCard(card);
    }
  });

  /* ---------- MINI APP ROUTER ---------- */

  function openMiniApp(app) {
    switch (app) {
      case "calculator":
        openCalculator();
        break;
      case "notes":
        openNotes();
        break;
      case "converter":
        openConverter();
        break;
      case "game":
        openGame();
        break;
      case "qrcode":
        openQRCode();
        break;
      default:
        openModal("Mini App", "<p>This mini app is not available yet.</p>");
    }
  }

  /* ---------- SCIENTIFIC CALCULATOR ---------- */

  async function openCalculator() {
    openModal("Scientific Calculator", `
      <p class="platform-note">
        Supports numerical calculations, simplification, derivatives,
        equation solving, integration, statistics and matrices.
      </p>

      <input
        id="calculatorInput"
        class="calculator-display"
        type="text"
        placeholder="Enter a calculation or expression"
        autocomplete="off">

      <label for="calculatorMode">Operation</label>
      <select id="calculatorMode">
        <option value="calculate">Calculate</option>
        <option value="simplify">Simplify expression</option>
        <option value="derivative">Differentiate (d/dx)</option>
        <option value="solve">Solve equation (numerically)</option>
        <option value="integrate">Numerical integration</option>
        <option value="statistics">Statistics (comma-separated numbers)</option>
      </select>

      <div>
        <button type="button" id="runCalculation">Calculate</button>
        <button type="button" id="clearCalculation">Clear</button>
      </div>

      <p><strong>Result</strong></p>
      <div id="calculatorResult" aria-live="polite">
        Your result will appear here.
      </div>

      <h3>Calculation history</h3>
      <div id="calculatorHistory"></div>
    `);

    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/mathjs/14.8.1/math.min.js",
        "math"
      );
    } catch {
      const result = document.getElementById("calculatorResult");
      if (result) {
        result.textContent =
          "Calculator library could not load. Check your internet connection and try again.";
      }
      return;
    }

    const input = document.getElementById("calculatorInput");
    const mode = document.getElementById("calculatorMode");
    const resultBox = document.getElementById("calculatorResult");
    const historyBox = document.getElementById("calculatorHistory");

    if (!input || !mode || !resultBox) return;

    function prepareExpression(expression) {
      let value = expression
        .replace(/[×✕]/g, "*")
        .replace(/[÷]/g, "/")
        .replace(/[−–]/g, "-")
        .replace(/\bof\b/gi, "*");

      value = value.replace(
        /(\d+(?:\.\d+)?)\s*%/g,
        "($1/100)"
      );

      return value;
    }

    function numericalRoots(equation, variable = "x", min = -100, max = 100) {
      const parts = equation.split("=");

      if (parts.length !== 2) {
        throw new Error("Enter an equation using =, for example x^2 = 9.");
      }

      const left = math.compile(prepareExpression(parts[0]));
      const right = math.compile(prepareExpression(parts[1]));

      const fn = x => {
        const scope = { [variable]: x };
        return left.evaluate(scope) - right.evaluate(scope);
      };

      const roots = [];
      const steps = 4000;
      const step = (max - min) / steps;

      let previousX = min;
      let previousY = fn(previousX);

      for (let i = 1; i <= steps; i++) {
        const currentX = min + i * step;
        const currentY = fn(currentX);

        if (!Number.isFinite(currentY)) {
          previousX = currentX;
          previousY = currentY;
          continue;
        }

        if (Number.isFinite(previousY) && previousY * currentY < 0) {
          let low = previousX;
          let high = currentX;

          for (let j = 0; j < 60; j++) {
            const middle = (low + high) / 2;
            const middleY = fn(middle);

            if (Math.abs(middleY) < 1e-10) {
              low = middle;
              high = middle;
              break;
            }

            if (fn(low) * middleY <= 0) {
              high = middle;
            } else {
              low = middle;
            }
          }

          const root = (low + high) / 2;

          if (!roots.some(item => Math.abs(item - root) < 1e-5)) {
            roots.push(root);
          }
        }

        previousX = currentX;
        previousY = currentY;
      }

      return roots;
    }

    function integrateNumerically(expression, variable, lower, upper) {
      const compiled = math.compile(prepareExpression(expression));
      const intervals = 2000;
      const h = (upper - lower) / intervals;

      const fn = x => compiled.evaluate({ [variable]: x });

      let sum = fn(lower) + fn(upper);

      for (let i = 1; i < intervals; i++) {
        sum += (i % 2 === 0 ? 2 : 4) * fn(lower + i * h);
      }

      return (h / 3) * sum;
    }

    function calculate() {
      const expression = input.value.trim();

      if (!expression) {
        resultBox.textContent = "Enter something to calculate.";
        return;
      }

      try {
        const selectedMode = mode.value;
        let result;

        if (selectedMode === "calculate") {
          result = math.evaluate(prepareExpression(expression));
        }

        if (selectedMode === "simplify") {
          result = math.simplify(prepareExpression(expression)).toString();
        }

        if (selectedMode === "derivative") {
          const parts = expression.split("|");
          const formula = parts[0];
          const variable = parts[1] || "x";

          result = math.derivative(
            prepareExpression(formula),
            variable
          ).toString();
        }

        if (selectedMode === "solve") {
          const parts = expression.split("|");
          const equation = parts[0];
          const variable = parts[1] || "x";

          const roots = numericalRoots(equation, variable);

          result = roots.length
            ? roots.map(root => `${variable} = ${root}`).join("\n")
            : "No sign-changing roots found in the interval -100 to 100.";
        }

        if (selectedMode === "integrate") {
          const parts = expression.split("|");

          if (parts.length < 3) {
            throw new Error(
              "Use this format: x^2 | 0 | 2. Optional variable: x^2 | 0 | 2 | x"
            );
          }

          const formula = parts[0];
          const lower = Number(parts[1]);
          const upper = Number(parts[2]);
          const variable = parts[3] || "x";

          if (!Number.isFinite(lower) || !Number.isFinite(upper)) {
            throw new Error("Enter valid integration limits.");
          }

          result = integrateNumerically(
            formula,
            variable,
            lower,
            upper
          );
        }

        if (selectedMode === "statistics") {
          const numbers = expression.split(",").map(Number);

          if (
            numbers.length < 1 ||
            numbers.some(number => !Number.isFinite(number))
          ) {
            throw new Error("Enter numbers separated by commas.");
          }

          const sorted = [...numbers].sort((a, b) => a - b);
          const sum = math.sum(numbers);
          const mean = math.mean(numbers);
          const median = math.median(numbers);

          result =
            `Count: ${numbers.length}\n` +
            `Sum: ${sum}\n` +
            `Mean: ${mean}\n` +
            `Median: ${median}\n` +
            `Minimum: ${sorted[0]}\n` +
            `Maximum: ${sorted[sorted.length - 1]}\n` +
            `Standard deviation: ${math.std(numbers)}`;
        }

        const output = typeof result === "object" &&
          result !== null &&
          typeof result.toString === "function"
          ? result.toString()
          : String(result);

        resultBox.style.whiteSpace = "pre-wrap";
        resultBox.textContent = output;

        if (historyBox) {
          const entry = document.createElement("p");
          entry.textContent = `${expression} = ${output}`;
          historyBox.prepend(entry);
        }
      } catch (error) {
        resultBox.textContent = `Unable to calculate: ${error.message}`;
      }
    }

    document.getElementById("runCalculation")
      ?.addEventListener("click", calculate);

    input.addEventListener("keydown", event => {
      if (event.key === "Enter") calculate();
    });

    document.getElementById("clearCalculation")
      ?.addEventListener("click", () => {
        input.value = "";
        resultBox.textContent = "Your result will appear here.";
        if (historyBox) historyBox.innerHTML = "";
      });

    input.focus();
  }

  /* ---------- NOTES ---------- */

  function openNotes() {
    let savedNotes = "";

    try {
      savedNotes = localStorage.getItem(NOTES_KEY) || "";
    } catch {
      savedNotes = "";
    }

    openModal("Notes", `
      <p class="platform-note">Your notes are saved on this device.</p>
      <textarea id="notesInput"
        placeholder="Write your notes here...">${escapeHTML(savedNotes)}</textarea>
      <button type="button" id="saveNotes">Save notes</button>
      <button type="button" id="clearNotes">Clear notes</button>
      <p id="notesMessage" aria-live="polite"></p>
    `);

    const textarea = document.getElementById("notesInput");
    const message = document.getElementById("notesMessage");

    document.getElementById("saveNotes")?.addEventListener("click", () => {
      try {
        localStorage.setItem(NOTES_KEY, textarea.value);
        message.textContent = "Notes saved successfully.";
      } catch {
        message.textContent = "Could not save notes on this device.";
      }
    });

    document.getElementById("clearNotes")?.addEventListener("click", () => {
      textarea.value = "";
      localStorage.removeItem(NOTES_KEY);
      message.textContent = "Notes cleared.";
    });
  }

  /* ---------- UNIT CONVERTER ---------- */

  function openConverter() {
    openModal("Unit Converter", `
      <label for="converterCategory">Category</label>
      <select id="converterCategory">
        <option value="length">Length</option>
        <option value="weight">Weight</option>
        <option value="time">Time</option>
        <option value="speed">Speed</option>
        <option value="volume">Volume</option>
        <option value="area">Area</option>
        <option value="temperature">Temperature</option>
      </select>

      <label for="converterValue">Value</label>
      <input id="converterValue" type="number" value="1">

      <label for="converterFrom">From</label>
      <select id="converterFrom"></select>

      <label for="converterTo">To</label>
      <select id="converterTo"></select>

      <button type="button" id="convertButton">Convert</button>
      <p id="converterResult" aria-live="polite">Your result will appear here.</p>
    `);

    const units = {
      length: {
        m: 1, km: 1000, cm: 0.01, mm: 0.001,
        mile: 1609.344, yard: 0.9144, foot: 0.3048, inch: 0.0254
      },
      weight: {
        kg: 1, g: 0.001, mg: 0.000001,
        tonne: 1000, pound: 0.45359237, ounce: 0.028349523125
      },
      time: {
        second: 1, minute: 60, hour: 3600,
        day: 86400, week: 604800
      },
      speed: {
        "m/s": 1, "km/h": 1 / 3.6, mph: 0.44704
      },
      volume: {
        litre: 1, ml: 0.001, "cubic metre": 1000,
        gallon: 3.785411784, cup: 0.2365882365
      },
      area: {
        "square metre": 1, "square kilometre": 1000000,
        hectare: 10000, acre: 4046.8564224,
        "square foot": 0.09290304
      },
      temperature: {
        Celsius: "C", Fahrenheit: "F", Kelvin: "K"
      }
    };

    const category = document.getElementById("converterCategory");
    const from = document.getElementById("converterFrom");
    const to = document.getElementById("converterTo");
    const value = document.getElementById("converterValue");
    const result = document.getElementById("converterResult");

    function populateUnits() {
      const options = Object.keys(units[category.value]);

      from.innerHTML = "";
      to.innerHTML = "";

      options.forEach(unit => {
        from.add(new Option(unit, unit));
        to.add(new Option(unit, unit));
      });

      if (options.length > 1) to.selectedIndex = 1;
    }

    function convertTemperature(number, source, destination) {
      let celsius = number;

      if (source === "Fahrenheit") celsius = (number - 32) * 5 / 9;
      if (source === "Kelvin") celsius = number - 273.15;

      if (destination === "Fahrenheit") return celsius * 9 / 5 + 32;
      if (destination === "Kelvin") return celsius + 273.15;

      return celsius;
    }

    function convert() {
      const number = Number(value.value);

      if (!Number.isFinite(number)) {
        result.textContent = "Enter a valid number.";
        return;
      }

      let answer;

      if (category.value === "temperature") {
        answer = convertTemperature(number, from.value, to.value);
      } else {
        answer = number *
          units[category.value][from.value] /
          units[category.value][to.value];
      }

      result.textContent = `${number} ${from.value} = ${Number(answer.toPrecision(12))} ${to.value}`;
    }

    category.addEventListener("change", populateUnits);
    document.getElementById("convertButton")
      ?.addEventListener("click", convert);

    populateUnits();
  }

  /* ---------- TIC TAC TOE ---------- */

  function openGame() {
    gameBoard = ["", "", "", "", "", "", "", "", ""];
    gameOver = false;

    openModal("Tic Tac Toe", `
      <p id="gameStatus" aria-live="polite">Player X's turn</p>
      <div class="game-board" id="gameBoard">
        ${gameBoard.map((_, index) =>
          `<button class="game-cell" type="button" data-cell="${index}" aria-label="Cell ${index + 1}"></button>`
        ).join("")}
      </div>
      <button type="button" id="restartGame">Restart game</button>
    `);

    const winningLines = [
      [0, 1, 2], [3, 4, 5], [6, 7, 8],
      [0, 3, 6], [1, 4, 7], [2, 5, 8],
      [0, 4, 8], [2, 4, 6]
    ];

    function checkWinner() {
      for (const line of winningLines) {
        const [a, b, c] = line;

        if (
          gameBoard[a] &&
          gameBoard[a] === gameBoard[b] &&
          gameBoard[a] === gameBoard[c]
        ) {
          return gameBoard[a];
        }
      }

      return null;
    }

    function renderGame() {
      document.querySelectorAll(".game-cell").forEach(cell => {
        const index = Number(cell.dataset.cell);
        cell.textContent = gameBoard[index];
        cell.disabled = Boolean(gameBoard[index]) || gameOver;
      });
    }

    document.getElementById("gameBoard")
      ?.addEventListener("click", event => {
        const cell = event.target.closest("[data-cell]");
        if (!cell || gameOver) return;

        const index = Number(cell.dataset.cell);
        if (gameBoard[index]) return;

        const currentPlayer = gameBoard.filter(Boolean).length % 2 === 0
          ? "X"
          : "O";

        gameBoard[index] = currentPlayer;

        const winner = checkWinner();
        const status = document.getElementById("gameStatus");

        if (winner) {
          gameOver = true;
          status.textContent = `Player ${winner} wins!`;
        } else if (gameBoard.every(Boolean)) {
          gameOver = true;
          status.textContent = "It's a draw!";
        } else {
          status.textContent =
            `Player ${currentPlayer === "X" ? "O" : "X"}'s turn`;
        }

        renderGame();
      });

    document.getElementById("restartGame")
      ?.addEventListener("click", openGame);
  }

  /* ---------- QR CODE GENERATOR ---------- */

  async function openQRCode() {
    openModal("QR Code Generator", `
      <p class="platform-note">
        Enter text or a website address to create a QR code.
      </p>

      <input id="qrInput" type="text"
        placeholder="Enter text or website link">

      <button type="button" id="generateQR">Generate QR code</button>

      <div class="qr-output" id="qrOutput"></div>

      <button type="button" id="downloadQR" hidden>
        Download QR code
      </button>

      <p id="qrMessage" aria-live="polite"></p>
    `);

    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
        "QRCode"
      );
    } catch {
      const message = document.getElementById("qrMessage");
      if (message) message.textContent =
        "QR library could not load. Check your internet connection.";
      return;
    }

    const input = document.getElementById("qrInput");
    const output = document.getElementById("qrOutput");
    const downloadButton = document.getElementById("downloadQR");
    const message = document.getElementById("qrMessage");

    document.getElementById("generateQR")
      ?.addEventListener("click", () => {
        const text = input.value.trim();

        if (!text) {
          message.textContent = "Enter text or a link first.";
          return;
        }

        output.innerHTML = "";

        new QRCode(output, {
          text,
          width: 220,
          height: 220,
          correctLevel: QRCode.CorrectLevel.H
        });

        downloadButton.hidden = false;
        message.textContent = "QR code created.";
      });

    downloadButton.addEventListener("click", () => {
      const image = output.querySelector("canvas") ||
        output.querySelector("img");

      if (!image) {
        message.textContent = "Generate a QR code first.";
        return;
      }

      const link = document.createElement("a");
      link.download = "my-mini-apps-qr-code.png";
      link.href = image.tagName === "CANVAS"
        ? image.toDataURL("image/png")
        : image.src;

      link.click();
    });
  }

  /* ---------- MEDIA DOWNLOADER API ---------- */

  const DOWNLOADER_API =
    "https://miniapps-downloader-api.onrender.com";

  const downloadInput = document.getElementById("downloadUrl");
  const checkDownloadButton = document.getElementById("checkDownload");
  const downloadMessage = document.getElementById("downloadMessage");

  checkDownloadButton?.addEventListener("click", async () => {
    const value = downloadInput?.value.trim();

    if (!downloadMessage) return;

    if (!value) {
      downloadMessage.textContent = "Please paste a media link first.";
      return;
    }

    let mediaURL;

    try {
      mediaURL = new URL(value);

      if (mediaURL.protocol !== "https:") {
        throw new Error("Invalid link");
      }
    } catch {
      downloadMessage.textContent = "Please enter a valid HTTPS link.";
      return;
    }

    checkDownloadButton.disabled = true;
    checkDownloadButton.textContent = "Downloading...";
    downloadMessage.textContent = "Connecting to downloader...";

    try {
      const response = await fetch(
        `${DOWNLOADER_API}/api/download?url=${encodeURIComponent(mediaURL.href)}`
      );

      if (!response.ok) {
        let errorMessage =
          "Download failed. This link may not be supported.";

        try {
          const data = await response.json();
          errorMessage = data.error || errorMessage;
        } catch {
          // Keep the default error message.
        }

        throw new Error(errorMessage);
      }

      const blob = await response.blob();

      if (!blob.size) {
        throw new Error("The downloaded file is empty.");
      }

      const disposition =
        response.headers.get("Content-Disposition") || "";

      const match = disposition.match(/filename="?([^";]+)"?/i);
      const filename = match ? match[1] : "downloaded-media";

      const objectURL = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = objectURL;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();

      setTimeout(() => URL.revokeObjectURL(objectURL), 1000);

      downloadMessage.textContent = "Download started successfully!";

    } catch (error) {
      downloadMessage.textContent =
        `Download error: ${error.message}`;
    } finally {
      checkDownloadButton.disabled = false;
      checkDownloadButton.textContent = "Download Media";
    }
  });

  /* ---------- INITIALISE ---------- */

  refreshFavoriteButtons();
  renderFavorites();

});
