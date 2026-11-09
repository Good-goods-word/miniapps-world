/* ==========================================
   MY MINI APPS HUB
   COMPLETE SCRIPT.JS REPLACEMENT
   ========================================== */

document.addEventListener("DOMContentLoaded", () => {

  // ==========================================
  // EXTERNAL LIBRARY LOADER
  // ==========================================

  function loadScript(url, globalName) {
    return new Promise((resolve, reject) => {
      if (window[globalName]) {
        resolve(window[globalName]);
        return;
      }

      const script = document.createElement("script");
      script.src = url;

      script.onload = () => {
        if (window[globalName]) {
          resolve(window[globalName]);
        } else {
          reject(new Error("Library failed to initialize."));
        }
      };

      script.onerror = () => reject(new Error("Unable to load library."));
      document.head.appendChild(script);
    });
  }

  // ==========================================
  // SAFE HTML
  // ==========================================

  function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    })[character]);
  }

  // ==========================================
  // MOBILE NAVIGATION
  // ==========================================

  const menuToggle = document.querySelector("#menuToggle");
  const navLinks = document.querySelector(".nav-links");

  if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
      navLinks.classList.toggle("active");
    });

    navLinks.querySelectorAll("a").forEach(link => {
      link.addEventListener("click", () => {
        navLinks.classList.remove("active");
      });
    });
  }

  // ==========================================
  // SEARCH
  // ==========================================

  const searchInput = document.querySelector("#appSearch");

  if (searchInput) {
    searchInput.addEventListener("input", () => {
      const query = searchInput.value.toLowerCase().trim();

      document.querySelectorAll(".app-card").forEach(card => {
        card.style.display = card.textContent.toLowerCase().includes(query)
          ? ""
          : "none";
      });
    });
  }

  // ==========================================
  // CATEGORY FILTERS
  // ==========================================

  document.querySelectorAll("[data-category]").forEach(button => {
    button.addEventListener("click", () => {
      const category = button.dataset.category;

      document.querySelectorAll("[data-category]").forEach(item => {
        item.classList.remove("active");
      });

      button.classList.add("active");

      document.querySelectorAll(".app-card").forEach(card => {
        const cardCategory = card.dataset.category || "all";

        card.style.display =
          category === "all" || cardCategory === category ? "" : "none";
      });

      if (searchInput) searchInput.value = "";
    });
  });

  // ==========================================
  // MODAL
  // ==========================================

  const modal = document.querySelector("#appModal");
  const modalTitle = document.querySelector("#modalTitle");
  const modalBody = document.querySelector("#modalBody");
  const closeModal = document.querySelector("#closeModal");

  function showModal(title, content) {
    if (!modal || !modalTitle || !modalBody) return;

    modalTitle.textContent = title;
    modalBody.innerHTML = content;

    modal.classList.add("active");
    modal.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";
  }

  function hideModal() {
    if (!modal) return;

    modal.classList.remove("active");
    modal.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";
  }

  if (closeModal) {
    closeModal.addEventListener("click", hideModal);
  }

  if (modal) {
    modal.addEventListener("click", event => {
      if (event.target === modal) hideModal();
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") hideModal();
  });

  // ==========================================
  // FAVOURITES
  // ==========================================

  const FAVORITES_KEY = "myMiniAppsFavorites";

  function getFavorites() {
    try {
      return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || [];
    } catch {
      return [];
    }
  }

  function saveFavorites(items) {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(items));
    renderFavorites();
    updateFavoriteButtons();
  }

  function getCardDetails(card) {
    return {
      name: card.dataset.name ||
        card.querySelector("h3")?.textContent ||
        "App",
      app: card.dataset.app || "",
      description: card.querySelector("p")?.textContent || "",
      icon: card.querySelector(".app-icon")?.textContent || "📱"
    };
  }

  function renderFavorites() {
    const container = document.querySelector("#favoritesList");

    if (!container) return;

    const favorites = getFavorites();

    if (!favorites.length) {
      container.innerHTML = "<p>No favourites added yet.</p>";
      return;
    }

    container.innerHTML = favorites.map(item => `
      <button class="app-card mini-card"
        data-app="${escapeHTML(item.app)}"
        data-name="${escapeHTML(item.name)}">
        <span class="app-icon">${escapeHTML(item.icon)}</span>
        <h3>${escapeHTML(item.name)}</h3>
        <p>${escapeHTML(item.description)}</p>
      </button>
    `).join("");

    container.querySelectorAll("[data-app]").forEach(card => {
      card.addEventListener("click", () => openMiniApp(card.dataset.app));
    });
  }

  function updateFavoriteButtons() {
    const favorites = getFavorites();

    document.querySelectorAll(".app-card[data-app]").forEach(card => {
      const button = card.querySelector(".favorite-button");

      if (button) {
        button.textContent = favorites.some(
          item => item.app === card.dataset.app
        ) ? "★" : "☆";
      }
    });
  }

  document.querySelectorAll(".app-card[data-app]").forEach(card => {
    card.addEventListener("click", event => {
      if (event.target.closest(".favorite-button")) return;
      openMiniApp(card.dataset.app);
    });
  });

  document.addEventListener("click", event => {
    const button = event.target.closest(".favorite-button");

    if (!button) return;

    event.stopPropagation();

    const card = button.closest(".app-card");
    if (!card) return;

    const details = getCardDetails(card);
    let favorites = getFavorites();

    if (favorites.some(item => item.app === details.app)) {
      favorites = favorites.filter(item => item.app !== details.app);
    } else {
      favorites.push(details);
    }

    saveFavorites(favorites);
  });

  // ==========================================
  // ADVANCED MATHEMATICS CALCULATOR
  // ==========================================

  async function openCalculator() {
    showModal("Advanced Calculator", `
      <div class="calculator-app">

        <p>Enter a mathematical expression or choose an operation.</p>

        <label for="calcMode">Operation</label>

        <select id="calcMode">
          <option value="calculate">Calculate</option>
          <option value="simplify">Simplify expression</option>
          <option value="derivative">Find derivative</option>
          <option value="solve">Solve equation for x</option>
          <option value="integrate">Numerical integration</option>
          <option value="statistics">Statistics</option>
          <option value="matrix">Matrix calculations</option>
        </select>

        <label for="calcInput">Mathematical expression</label>

        <textarea id="calcInput" rows="3"
          placeholder="Example: 5009 * 6% * 7 + 500 - 2"></textarea>

        <div id="calcExtra"></div>

        <button type="button" id="calculateButton">
          Calculate
        </button>

        <div class="calculator-result">
          <strong>Result</strong>
          <pre id="calcResult">Your answer will appear here.</pre>
          <button type="button" id="copyCalcResult">Copy result</button>
        </div>

        <p>
          Examples: 25% of 400, sqrt(144), sin(30 deg),
          log(100), 2^8, 5!, 5009 * 6% * 7 + 500 - 2
        </p>

      </div>
    `);

    const input = document.querySelector("#calcInput");
    const mode = document.querySelector("#calcMode");
    const extra = document.querySelector("#calcExtra");
    const result = document.querySelector("#calcResult");
    const calculateButton = document.querySelector("#calculateButton");
    const copyButton = document.querySelector("#copyCalcResult");

    if (!input || !mode || !extra || !result) return;

    let lastResult = "";

    function updateExtra() {
      if (mode.value === "solve") {
        extra.innerHTML = `
          <label for="solveRange">Search interval</label>
          <input id="solveRange" type="text" value="-100,100">
          <small>Example equation: x^2 = 25</small>
        `;
      } else if (mode.value === "integrate") {
        extra.innerHTML = `
          <label for="integrateRange">Integration limits</label>
          <input id="integrateRange" type="text" value="0,1">
        `;
      } else if (mode.value === "derivative") {
        extra.innerHTML = `
          <label for="derivativeVariable">Variable</label>
          <input id="derivativeVariable" type="text" value="x">
        `;
      } else {
        extra.innerHTML = "";
      }
    }

    mode.addEventListener("change", updateExtra);
    updateExtra();

    async function getMath() {
      return loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/mathjs/14.8.1/math.min.js",
        "math"
      );
    }

    function prepareExpression(expression) {
      let value = expression
        .replace(/[×]/g, "*")
        .replace(/[÷]/g, "/")
        .replace(/[−]/g, "-")
        .replace(/\bof\b/gi, "*");

      // Convert percentages correctly:
      // 6% becomes 6/100.
      value = value.replace(
        /(\d+(?:\.\d+)?)\s*%/g,
        "($1/100)"
      );

      // Support implicit multiplication: 2(3+4).
      value = value.replace(/(\d)\s*\(/g, "$1*(");

      return value.trim();
    }

    function evaluateExpression(mathEngine, expression, scope = {}) {
      return mathEngine.evaluate(
        prepareExpression(expression),
        scope
      );
    }

    function solveEquation(mathEngine, equation, low, high) {
      const parts = equation.split("=");

      if (parts.length !== 2) {
        throw new Error("Use an equation such as x^2 = 25.");
      }

      const left = prepareExpression(parts[0]);
      const right = prepareExpression(parts[1]);

      const fn = x => {
        return mathEngine.evaluate(left, { x }) -
          mathEngine.evaluate(right, { x });
      };

      const roots = [];
      const steps = 4000;

      let previousX = low;
      let previousY = fn(previousX);

      for (let i = 1; i <= steps; i++) {
        const currentX = low + (high - low) * i / steps;
        const currentY = fn(currentX);

        if (
          Number.isFinite(previousY) &&
          Number.isFinite(currentY)
        ) {
          if (Math.abs(previousY) < 1e-9) {
            roots.push(previousX);
          }

          if (previousY * currentY < 0) {
            let a = previousX;
            let b = currentX;
            let fa = previousY;

            for (let j = 0; j < 70; j++) {
              const middle = (a + b) / 2;
              const fm = fn(middle);

              if (Math.abs(fm) < 1e-12) {
                a = middle;
                b = middle;
                break;
              }

              if (fa * fm <= 0) {
                b = middle;
              } else {
                a = middle;
                fa = fm;
              }
            }

            roots.push((a + b) / 2);
          }
        }

        previousX = currentX;
        previousY = currentY;
      }

      const uniqueRoots = roots.filter((value, index, array) =>
        array.findIndex(other =>
          Math.abs(other - value) < 1e-5
        ) === index
      );

      if (!uniqueRoots.length) {
        throw new Error(
          "No numerical root found in this interval. Try a wider interval."
        );
      }

      return uniqueRoots;
    }

    function integrateSimpson(mathEngine, expression, a, b) {
      const n = 10000;
      const h = (b - a) / n;

      let sum =
        mathEngine.evaluate(expression, { x: a }) +
        mathEngine.evaluate(expression, { x: b });

      for (let i = 1; i < n; i++) {
        const x = a + i * h;
        const y = mathEngine.evaluate(expression, { x });

        sum += (i % 2 === 0 ? 2 : 4) * y;
      }

      return sum * h / 3;
    }

    calculateButton.addEventListener("click", async () => {
      const expression = input.value.trim();

      if (!expression) {
        result.textContent = "Please enter an expression.";
        return;
      }

      result.textContent = "Calculating...";

      try {
        const mathEngine = await getMath();
        let answer;

        if (mode.value === "calculate") {
          answer = evaluateExpression(mathEngine, expression);
        }

        if (mode.value === "simplify") {
          answer = mathEngine.simplify(
            prepareExpression(expression)
          ).toString();
        }

        if (mode.value === "derivative") {
          const variable =
            document.querySelector("#derivativeVariable")?.value.trim() || "x";

          answer = mathEngine.derivative(
            prepareExpression(expression),
            variable
          ).toString();
        }

        if (mode.value === "solve") {
          const rangeText =
            document.querySelector("#solveRange")?.value || "-100,100";

          const range = rangeText.split(",").map(Number);

          if (
            range.length !== 2 ||
            !range.every(Number.isFinite) ||
            range[0] >= range[1]
          ) {
            throw new Error("Enter a valid interval, such as -100,100.");
          }

          const roots = solveEquation(
            mathEngine,
            expression,
            range[0],
            range[1]
          );

          answer = roots.map((root, index) =>
            `x${roots.length > 1 ? index + 1 : ""} = ${root}`
          ).join("\n");
        }

        if (mode.value === "integrate") {
          const rangeText =
            document.querySelector("#integrateRange")?.value || "0,1";

          const range = rangeText.split(",").map(Number);

          if (
            range.length !== 2 ||
            !range.every(Number.isFinite)
          ) {
            throw new Error("Enter two valid integration limits.");
          }

          answer = integrateSimpson(
            mathEngine,
            prepareExpression(expression),
            range[0],
            range[1]
          );
        }

        if (mode.value === "statistics") {
          const values = expression
            .split(/[,;\s]+/)
            .filter(Boolean)
            .map(Number);

          if (
            !values.length ||
            values.some(value => !Number.isFinite(value))
          ) {
            throw new Error(
              "Enter numbers separated by commas, such as 2,4,6,8."
            );
          }

          answer = [
            `Count: ${values.length}`,
            `Sum: ${mathEngine.sum(values)}`,
            `Mean: ${mathEngine.mean(values)}`,
            `Median: ${mathEngine.median(values)}`,
            `Minimum: ${Math.min(...values)}`,
            `Maximum: ${Math.max(...values)}`,
            `Range: ${Math.max(...values) - Math.min(...values)}`,
            `Standard deviation: ${mathEngine.std(values)}`
          ].join("\n");
        }

        if (mode.value === "matrix") {
          const matrix = mathEngine.evaluate(expression);

          if (!Array.isArray(matrix)) {
            throw new Error(
              "Enter a matrix such as [[1,2],[3,4]]."
            );
          }

          answer = `Matrix:\n${mathEngine.format(matrix)}`;

          try {
            answer += `\n\nDeterminant: ${mathEngine.det(matrix)}`;
            answer += `\n\nTranspose:\n${mathEngine.format(
              mathEngine.transpose(matrix)
            )}`;
            answer += `\n\nInverse:\n${mathEngine.format(
              mathEngine.inv(matrix)
            )}`;
          } catch {
            answer += "\nSome matrix operations are unavailable.";
          }
        }

        if (typeof answer === "number") {
          if (!Number.isFinite(answer)) {
            throw new Error("The answer is not a finite number.");
          }

          answer = Number(answer.toPrecision(12)).toString();
        }

        lastResult = String(answer);
        result.textContent = lastResult;

      } catch (error) {
        lastResult = "";
        result.textContent = "Unable to calculate: " + error.message;
      }
    });

    copyButton.addEventListener("click", async () => {
      if (!lastResult) {
        result.textContent = "Calculate something first.";
        return;
      }

      try {
        await navigator.clipboard.writeText(lastResult);
        copyButton.textContent = "Copied!";
        setTimeout(() => {
          copyButton.textContent = "Copy result";
        }, 1500);
      } catch {
        result.textContent += "\nCopy is unavailable in this browser.";
      }
    });
  }

  // ==========================================
  // NOTES APP
  // ==========================================

  function openNotes() {
    showModal("My Notes", `
      <div class="notes-app">
        <input id="noteTitle" type="text" placeholder="Note title">
        <textarea id="noteContent" rows="5"
          placeholder="Write your note here..."></textarea>

        <button id="saveNote">Save Note</button>

        <input id="noteSearch" type="search"
          placeholder="Search notes...">

        <div id="notesList"></div>
      </div>
    `);

    const title = document.querySelector("#noteTitle");
    const content = document.querySelector("#noteContent");
    const list = document.querySelector("#notesList");
    const search = document.querySelector("#noteSearch");

    let notes = [];

    try {
      const stored = JSON.parse(localStorage.getItem("miniHubNotes"));

      notes = Array.isArray(stored)
        ? stored
        : typeof stored === "string" && stored
          ? [{ id: Date.now(), title: "My Note", content: stored }]
          : [];
    } catch {
      notes = [];
    }

    function save() {
      localStorage.setItem("miniHubNotes", JSON.stringify(notes));
    }

    function render() {
      const query = search.value.toLowerCase();

      const filtered = notes.filter(note =>
        `${note.title} ${note.content}`.toLowerCase().includes(query)
      );

      list.innerHTML = filtered.length
        ? filtered.map(note => `
            <div class="note-item">
              <h3>${escapeHTML(note.title)}</h3>
              <p>${escapeHTML(note.content)}</p>
              <button data-delete-note="${note.id}">Delete</button>
            </div>
          `).join("")
        : "<p>No notes found.</p>";
    }

    document.querySelector("#saveNote").addEventListener("click", () => {
      if (!content.value.trim()) {
        alert("Write something before saving.");
        return;
      }

      notes.unshift({
        id: Date.now(),
        title: title.value.trim() || "Untitled Note",
        content: content.value.trim()
      });

      save();

      title.value = "";
      content.value = "";

      render();
    });

    search.addEventListener("input", render);

    list.addEventListener("click", event => {
      const button = event.target.closest("[data-delete-note]");

      if (!button) return;

      notes = notes.filter(
        note => note.id !== Number(button.dataset.deleteNote)
      );

      save();
      render();
    });

    render();
  }

  // ==========================================
  // UNIT CONVERTER
  // ==========================================

  function openConverter() {
    const units = {
      Length: {
        Meter: 1,
        Kilometer: 1000,
        Centimeter: 0.01,
        Millimeter: 0.001,
        Mile: 1609.344,
        Yard: 0.9144,
        Foot: 0.3048,
        Inch: 0.0254
      },

      Weight: {
        Kilogram: 1,
        Gram: 0.001,
        Milligram: 0.000001,
        Pound: 0.45359237,
        Ounce: 0.0283495,
        Tonne: 1000
      },

      Time: {
        Second: 1,
        Minute: 60,
        Hour: 3600,
        Day: 86400,
        Week: 604800
      },

      Speed: {
        "Meters/second": 1,
        "Kilometers/hour": 0.2777778,
        "Miles/hour": 0.44704
      },

      Volume: {
        Liter: 1,
        Milliliter: 0.001,
        "US gallon": 3.78541,
        Cup: 0.236588
      },

      Area: {
        "Square meter": 1,
        "Square kilometer": 1000000,
        "Square foot": 0.092903,
        Acre: 4046.856
      }
    };

    showModal("Unit Converter", `
      <div class="converter-app">

        <label>Category</label>
        <select id="conversionCategory">
          ${Object.keys(units).concat("Temperature").map(name =>
            `<option value="${name}">${name}</option>`
          ).join("")}
        </select>

        <label>Amount</label>
        <input type="number" id="conversionAmount" value="1">

        <label>From</label>
        <select id="conversionFrom"></select>

        <label>To</label>
        <select id="conversionTo"></select>

        <button id="convertButton">Convert</button>

        <h3 id="conversionResult">Result will appear here.</h3>

      </div>
    `);

    const category = document.querySelector("#conversionCategory");
    const amount = document.querySelector("#conversionAmount");
    const from = document.querySelector("#conversionFrom");
    const to = document.querySelector("#conversionTo");
    const result = document.querySelector("#conversionResult");

    function convert() {
      const value = Number(amount.value);

      if (!Number.isFinite(value)) {
        result.textContent = "Enter a valid number.";
        return;
      }

      let answer;

      if (category.value === "Temperature") {
        let celsius = value;

        if (from.value === "Fahrenheit") {
          celsius = (value - 32) * 5 / 9;
        }

        if (from.value === "Kelvin") {
          celsius = value - 273.15;
        }

        answer = celsius;

        if (to.value === "Fahrenheit") {
          answer = celsius * 9 / 5 + 32;
        }

        if (to.value === "Kelvin") {
          answer = celsius + 273.15;
        }

      } else {
        answer = value *
          units[category.value][from.value] /
          units[category.value][to.value];
      }

      result.textContent =
        `${value} ${from.value} = ${Number(answer.toPrecision(10))} ${to.value}`;
    }

    function populate() {
      const names = category.value === "Temperature"
        ? ["Celsius", "Fahrenheit", "Kelvin"]
        : Object.keys(units[category.value]);

      from.innerHTML = names.map(name =>
        `<option value="${name}">${name}</option>`
      ).join("");

      to.innerHTML = names.map(name =>
        `<option value="${name}">${name}</option>`
      ).join("");

      if (names.length > 1) to.selectedIndex = 1;

      convert();
    }

    category.addEventListener("change", populate);
    amount.addEventListener("input", convert);
    from.addEventListener("change", convert);
    to.addEventListener("change", convert);

    document.querySelector("#convertButton")
      .addEventListener("click", convert);

    populate();
  }

  // ==========================================
  // TIC TAC TOE
  // ==========================================

  function openGame() {
    showModal("Tic Tac Toe", `
      <div class="game-app">

        <h3 id="gameStatus">Player X's turn</h3>

        <div id="gameBoard" class="tic-tac-toe-board">
          ${Array.from({ length: 9 }, (_, index) =>
            `<button class="game-cell" data-cell="${index}"></button>`
          ).join("")}
        </div>

        <button id="restartGame">Restart Game</button>

      </div>
    `);

    const board = Array(9).fill("");
    let current = "X";
    let finished = false;

    const status = document.querySelector("#gameStatus");
    const cells = document.querySelectorAll("[data-cell]");

    const wins = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6]
    ];

    cells.forEach(cell => {
      cell.addEventListener("click", () => {
        const index = Number(cell.dataset.cell);

        if (finished || board[index]) return;

        board[index] = current;
        cell.textContent = current;

        const winner = wins.find(line =>
          line.every(position => board[position] === current)
        );

        if (winner) {
          status.textContent = `Player ${current} wins!`;
          finished = true;
          return;
        }

        if (board.every(Boolean)) {
          status.textContent = "It's a draw!";
          finished = true;
          return;
        }

        current = current === "X" ? "O" : "X";
        status.textContent = `Player ${current}'s turn`;
      });
    });

    document.querySelector("#restartGame")
      .addEventListener("click", openGame);
  }

  // ==========================================
  // QR CODE GENERATOR
  // ==========================================

  async function openQRCode() {
    showModal("QR Code Generator", `
      <div class="qr-app">

        <p>Enter text or a website address to create a QR code.</p>

        <textarea id="qrText" rows="3"
          placeholder="Enter text or URL here..."></textarea>

        <label for="qrSize">QR code size</label>

        <select id="qrSize">
          <option value="128">Small</option>
          <option value="200" selected>Medium</option>
          <option value="300">Large</option>
          <option value="400">Extra Large</option>
        </select>

        <button id="generateQR">Generate QR Code</button>

        <div id="qrOutput"></div>

        <button id="downloadQR" disabled>Download QR Code</button>

      </div>
    `);

    const text = document.querySelector("#qrText");
    const size = document.querySelector("#qrSize");
    const output = document.querySelector("#qrOutput");
    const download = document.querySelector("#downloadQR");

    try {
      await loadScript(
        "https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js",
        "QRCode"
      );
    } catch {
      output.textContent =
        "QR Code library could not load. Check your internet connection.";
      return;
    }

    document.querySelector("#generateQR").addEventListener("click", () => {
      const value = text.value.trim();

      if (!value) {
        output.textContent = "Enter text or a URL first.";
        download.disabled = true;
        return;
      }

      output.innerHTML = "";

      new QRCode(output, {
        text: value,
        width: Number(size.value),
        height: Number(size.value),
        correctLevel: QRCode.CorrectLevel.H
      });

      download.disabled = false;
    });

    size.addEventListener("change", () => {
      if (text.value.trim()) {
        document.querySelector("#generateQR").click();
      }
    });

    download.addEventListener("click", () => {
      const canvas = output.querySelector("canvas");
      const image = output.querySelector("img");
      const link = document.createElement("a");

      if (canvas) {
        link.href = canvas.toDataURL("image/png");
      } else if (image) {
        link.href = image.src;
      } else {
        return;
      }

      link.download = "my-mini-apps-qr-code.png";
      link.click();
    });
  }

  // ==========================================
  // OPEN MINI APPS
  // ==========================================

  function openMiniApp(app) {
    if (app === "calculator") {
      openCalculator();
    } else if (app === "notes") {
      openNotes();
    } else if (app === "converter") {
      openConverter();
    } else if (app === "game") {
      openGame();
    } else if (app === "qrcode") {
      openQRCode();
    }
  }

  // ==========================================
  // DOWNLOADER LINK CHECKER
  // ==========================================

  const downloadButton = document.querySelector("#checkDownloadLink");

  if (downloadButton) {
    downloadButton.addEventListener("click", () => {
      const input = document.querySelector("#downloadLink");
      const output = document.querySelector("#downloadResult");

      if (!input || !output) return;

      const value = input.value.trim();

      if (!value) {
        output.textContent = "Paste a link first.";
        return;
      }

      try {
        const url = new URL(value);

        if (!["http:", "https:"].includes(url.protocol)) {
          throw new Error("Invalid link.");
        }

        output.innerHTML = `
          <p>Link received successfully.</p>
          <p>Platform: ${escapeHTML(url.hostname)}</p>
          <p>
            Only download media you own or have permission to access.
            This tool does not bypass logins, privacy settings or DRM.
          </p>
          <a href="${escapeHTML(url.href)}"
             target="_blank"
             rel="noopener noreferrer">
             Open original link
          </a>
        `;

      } catch {
        output.textContent = "Please enter a valid web link.";
      }
    });
  }

  // ==========================================
  // PLATFORM LINKS
  // ==========================================

  document.querySelectorAll("[data-platform-url]").forEach(button => {
    button.addEventListener("click", () => {
      const url = button.dataset.platformUrl;

      try {
        const parsed = new URL(url);

        if (["https:", "http:"].includes(parsed.protocol)) {
          window.open(
            parsed.href,
            "_blank",
            "noopener,noreferrer"
          );
        }
      } catch {
        alert("This platform link is not valid.");
      }
    });
  });

  // ==========================================
  // INITIALIZE
  // ==========================================

  renderFavorites();
  updateFavoriteButtons();

  console.log("My Mini Apps Hub loaded successfully.");

});
      
