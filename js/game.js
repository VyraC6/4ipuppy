/**
 * 4iPuppy — Game Logic
 */

(function () {
  "use strict";

  const state = {
    mode: "sweet",
    currentCategory: "all",
    cards: [],
    deck: [],
    history: [],
    isFlipped: false,
    isAnimating: false,
  };

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  const screens = {
    welcome: $("#welcomeScreen"),
    game: $("#gameScreen"),
    summary: $("#summaryScreen"),
  };

  const mascotEmojis = ["🐶", "🐕", "🐩", "🦮", "🐕‍🦺", "🐾"];
  let mascotIdx = 0;

  $("#mascot").addEventListener("click", () => {
    mascotIdx = (mascotIdx + 1) % mascotEmojis.length;
    $("#mascot").textContent = mascotEmojis[mascotIdx];
    const cardIcon = document.querySelector(".card-front-icon");
    if (cardIcon) cardIcon.textContent = mascotEmojis[mascotIdx];
  });

  let toastTimer;
  function showToast(msg) {
    const toast = $("#toast");
    toast.textContent = msg;
    toast.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("show"), 2000);
  }

  function showScreen(name) {
    Object.values(screens).forEach((s) => s.classList.remove("active"));
    screens[name].classList.add("active");
  }

  $("#heatSelector").addEventListener("click", (e) => {
    const option = e.target.closest(".heat-option");
    if (!option) return;
    state.mode = option.dataset.level;
    $$(".heat-option").forEach((o) => o.classList.remove("selected"));
    option.classList.add("selected");
  });

  document.querySelector('.heat-option[data-level="sweet"]').classList.add("selected");

  $("#btnStart").addEventListener("click", startGame);

  function startGame() {
    state.history = [];
    state.isFlipped = false;
    state.isAnimating = false;
    state.currentCategory = "all";
    state.cards = getAvailableCards(state.mode);
    state.deck = shuffleCards(state.cards);
    state._initialDeckSize = state.deck.length;
    updateModeBadge();
    updateProgress();
    updateCategoryChips();
    resetCard();
    showScreen("game");
    $("#heatUpChip").style.display = state.mode === "warm" || state.mode === "hot" ? "" : "none";
    $$(".cat-chip").forEach((c) => c.classList.remove("active"));
    document.querySelector('.cat-chip[data-cat="all"]').classList.add("active");
  }

  function updateModeBadge() {
    const badge = $("#modeBadge");
    badge.textContent = HEAT_LEVELS[state.mode].label;
    if (state.mode === "hot") {
      badge.style.background = "var(--red-light)";
      badge.style.color = "var(--red)";
    } else if (state.mode === "warm") {
      badge.style.background = "#FFF7ED";
      badge.style.color = "#C2410C";
    } else {
      badge.style.background = "var(--pink-light)";
      badge.style.color = "var(--pink-dark)";
    }
  }

  function updateCategoryChips() {
    $$(".cat-chip").forEach((chip) => {
      chip.classList.remove("active");
      if (chip.dataset.cat === state.currentCategory) {
        chip.classList.add("active");
        if (state.currentCategory !== "all") {
          const catData = CARD_DATA[state.currentCategory];
          if (catData) {
            chip.style.background = catData.color;
            chip.style.color = "#fff";
            chip.style.borderColor = "transparent";
          }
        } else {
          chip.style.background = "";
          chip.style.color = "";
          chip.style.borderColor = "";
        }
      } else {
        chip.style.background = "";
        chip.style.color = "";
        chip.style.borderColor = "";
      }
    });
  }

  $("#categoryFilter").addEventListener("click", (e) => {
    const chip = e.target.closest(".cat-chip");
    if (!chip) return;
    if (state.isAnimating) return;
    state.currentCategory = chip.dataset.cat;
    if (state.currentCategory === "all") {
      state.deck = shuffleCards([...state.cards]);
    } else {
      state.deck = shuffleCards(state.cards.filter((c) => c.category === state.currentCategory));
    }
    state._initialDeckSize = state.deck.length;
    if (state.isFlipped) {
      $("#card").classList.remove("flipped");
      state.isFlipped = false;
      delete cardEl._currentCard;
    }
    updateCategoryChips();
    updateProgress();
    updateCardFront();
    if (state.deck.length === 0) {
      showEmptyState(state.history.length > 0 ? "allDone" : "noCards");
    } else {
      hideEmptyState();
    }
  });

  const cardEl = $("#card");

  cardEl.addEventListener("click", (e) => {
    if (e.target.closest("button")) return;
    if (state.isAnimating) return;
    if (!state.isFlipped) flipCard();
  });

  function flipCard() {
    if (state.deck.length === 0) return;
    if (state.isAnimating) return;
    state.isAnimating = true;
    const card = state.deck.pop();
    const tag = $("#cardCategoryTag");
    tag.textContent = card.categoryLabel;
    tag.style.background = cardToBgColor(card.category);
    tag.style.color = card.color;
    $("#cardContent").textContent = card.text;
    cardEl._currentCard = card;
    cardEl.classList.add("flipped");
    state.isFlipped = true;
    cardEl.classList.remove("card-appear");
    void cardEl.offsetWidth;
    cardEl.classList.add("card-appear");
    updateProgress();
    setTimeout(() => { state.isAnimating = false; }, 400);
  }

  function resetCard() {
    cardEl.classList.remove("flipped");
    cardEl.classList.remove("card-appear");
    state.isFlipped = false;
    state.isAnimating = false;
    delete cardEl._currentCard;
    updateProgress();
    updateCardFront();
  }

  function updateCardFront() {
    const hint = document.querySelector(".card-front-hint");
    if (state.deck.length === 0 && state.history.length > 0) {
      hint.textContent = "全部翻完啦!";
    } else if (state.currentCategory !== "all") {
      const catData = CARD_DATA[state.currentCategory];
      hint.textContent = catData ? catData.description : "看看命运给你准备了什么";
    } else {
      hint.textContent = "看看命运给你准备了什么";
    }
  }

  function cardToBgColor(cat) {
    const colorMap = {
      "role-reversal": "var(--purple-light)",
      "truth-talk": "var(--blue-light)",
      challenge: "var(--amber-light)",
      "heat-up": "var(--red-light)",
    };
    return colorMap[cat] || "var(--pink-light)";
  }

  $("#btnSkip").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cardEl._currentCard) return;
    if (state.isAnimating) return;
    state.history.push({ card: cardEl._currentCard, action: "skip" });
    showToast("已跳过~下一张!");
    nextCard();
  });

  $("#btnDone").addEventListener("click", (e) => {
    e.stopPropagation();
    if (!cardEl._currentCard) return;
    if (state.isAnimating) return;
    state.history.push({ card: cardEl._currentCard, action: "done" });
    spawnHearts();
    showToast("完成! 真棒~");
    nextCard();
  });

  function nextCard() {
    delete cardEl._currentCard;
    cardEl.classList.remove("flipped");
    cardEl.classList.remove("card-appear");
    state.isFlipped = false;
    setTimeout(() => {
      state.isAnimating = false;
      if (state.deck.length === 0) {
        showEmptyState("allDone");
      } else {
        updateCardFront();
      }
      updateProgress();
    }, 300);
  }

  function spawnHearts() {
    const emojis = ["💕", "✨", "💖", "🫶", "🐾", "💗"];
    for (let i = 0; i < 6; i++) {
      setTimeout(() => {
        const el = document.createElement("span");
        el.className = "heart-particle";
        el.textContent = emojis[i % emojis.length];
        el.style.left = 30 + Math.random() * 40 + "%";
        el.style.top = 30 + Math.random() * 30 + "%";
        el.style.animationDuration = 0.8 + Math.random() * 0.6 + "s";
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1500);
      }, i * 80);
    }
  }

  function updateProgress() {
    const remaining = state.deck.length;
    const total = state._initialDeckSize || remaining;
    const done = Math.max(0, total - remaining);
    $("#progressText").textContent = done + " / " + total;
    $("#progressBar").style.width = total > 0 ? (done / total) * 100 + "%" : "0%";
  }

  function showEmptyState(reason) {
    reason = reason || "allDone";
    $("#cardStack").style.display = "none";
    $("#emptyState").style.display = "";
    if (reason === "noCards") {
      $("#emptyIcon").textContent = "🔍";
      $("#emptyTitle").textContent = "这个类别没有卡牌";
      $("#emptyDesc").textContent = "试试切换到其他类别吧~";
      $("#btnShowSummary").style.display = "none";
    } else {
      $("#emptyIcon").textContent = "🎉";
      $("#emptyTitle").textContent = "全部完成啦!";
      $("#emptyDesc").textContent = "你们太棒了，来看看成绩吧";
      $("#btnShowSummary").style.display = "";
    }
    updateProgress();
  }

  function hideEmptyState() {
    $("#cardStack").style.display = "";
    $("#emptyState").style.display = "none";
  }

  $("#btnShowSummary").addEventListener("click", showSummary);

  function showSummary() {
    const completed = state.history.filter(function (h) { return h.action === "done"; }).length;
    const skipped = state.history.filter(function (h) { return h.action === "skip"; }).length;
    $("#statCompleted").textContent = completed;
    $("#statSkipped").textContent = skipped;
    $("#statTotal").textContent = state.history.length;

    const catCounts = {};
    state.history.forEach(function (h) {
      const cat = h.card.category;
      if (!catCounts[cat]) catCounts[cat] = { done: 0, skip: 0 };
      catCounts[cat][h.action]++;
    });

    const catContainer = $("#summaryCategories");
    catContainer.innerHTML = "";
    Object.entries(catCounts).forEach(function (entry) {
      const cat = entry[0];
      const counts = entry[1];
      const catData = CARD_DATA[cat];
      if (!catData) return;
      const row = document.createElement("div");
      row.className = "summary-cat-row";
      row.innerHTML = '<span class="summary-cat-dot" style="background:' + catData.color + '"></span>' +
        '<span class="summary-cat-name">' + catData.label + '</span>' +
        '<span class="summary-cat-count">✓ ' + counts.done + '  ⏭ ' + counts.skip + '</span>';
      catContainer.appendChild(row);
    });
    showScreen("summary");
  }

  $("#btnPlayAgain").addEventListener("click", function () { startGame(); });
  $("#btnBackHome").addEventListener("click", function () { showScreen("welcome"); });

  $("#btnExit").addEventListener("click", function () {
    if (state.history.length > 0) {
      if (confirm("确定要退出吗? 当前进度将丢失。")) {
        showScreen("welcome");
      }
    } else {
      showScreen("welcome");
    }
  });

  $("#emptyState").addEventListener("click", function (e) {
    if (e.target.closest("button")) return;
    showSummary();
  });

  document.addEventListener("keydown", function (e) {
    if (screens.game.classList.contains("active") && state.isFlipped) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        $("#btnDone").click();
      } else if (e.key === "Escape" || e.key === "s") {
        e.preventDefault();
        $("#btnSkip").click();
      }
    }
  });

  console.log("4iPuppy ready!");
})();
