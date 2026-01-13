document.addEventListener("DOMContentLoaded", () => {
  const stageButtons = document.querySelectorAll(".quiz-options button");
  const natalSelect = document.getElementById("natalDay");
  const resultPrimary = document.getElementById("primaryDeity");
  const resultSecondary = document.getElementById("secondaryDeity");
  const resultGap = document.getElementById("scoreGap");
  const topDeityTitle = document.getElementById("topDeity");
  const deityTagline = document.getElementById("deityTagline");
  const breakdownList = document.getElementById("breakdownList");

  const natalWeights = {
    Sunday: { label: "星期日｜太陽守護", scores: { "Phaya Khrut": 10, "Phra Narai": 5 } },
    Monday: { label: "星期一｜月亮守護", scores: { "Phra Mae Lakshmi": 10, "Mae Nang Kwak": 5 } },
    Tuesday: { label: "星期二｜火星守護", scores: { "Thao Wessuwan": 10, "Phra Pikanet": 5 } },
    WednesdayDay: { label: "星期三白天｜水星守護", scores: { "Phra Pikanet": 10, "Phra In": 5 } },
    WednesdayNight: { label: "星期三夜｜拉胡守護", scores: { "Phra Rahu": 10, "Phaya Naga": 5 } },
    Thursday: { label: "星期四｜木星守護", scores: { "Phra Phrom": 10, "Phra Sivali": 5 } },
    Friday: { label: "星期五｜金星守護", scores: { "Phra Mae Lakshmi": 10, "Trimurti": 5 } },
    Saturday: { label: "星期六｜土星守護", scores: { "Phaya Naga": 10, "Phra Isuan": 5 } }
  };

  const selections = {
    karmic: null,
    psychological: null,
    natal: null
  };

  function parseScores(raw) {
    if (!raw) return {};
    return raw.split(",").reduce((map, pair) => {
      const [key, value] = pair.split(":").map((val) => val.trim());
      if (key && value) {
        map[key] = Number(value);
      }
      return map;
    }, {});
  }

  function updateResult() {
    const aggregate = {};
    const breakdownItems = [];
    Object.entries(selections).forEach(([stage, payload]) => {
      if (!payload) return;
      const { label, scores } = payload;
      const entry = scores
        ? Object.entries(scores)
        : [];
      if (entry.length) {
        breakdownItems.push(`${stage === "natal" ? "星象錨定" : "題目"} · ${label}: ${entry
          .map(([name, value]) => `${name} +${value}`)
          .join("、")}`);
        entry.forEach(([name, value]) => {
          aggregate[name] = (aggregate[name] || 0) + value;
        });
      }
    });

    const sorted = Object.entries(aggregate).sort(([, a], [, b]) => b - a);
    if (!sorted.length) {
      topDeityTitle.textContent = "尚未選擇神祇";
      deityTagline.textContent = "完成上述問題後，系統會為你即時推算最契合的神祇。";
      resultPrimary.textContent = "—";
      resultSecondary.textContent = "—";
      resultGap.textContent = "—";
      breakdownList.innerHTML = "";
      return;
    }

    const [first, second] = sorted;
    topDeityTitle.textContent = `推薦首席神祇：${first[0]}`;
    deityTagline.textContent = `${first[0]} 目前位居分數榜首，代表祂象徵的原型與你當下最共鳴。`;
    resultPrimary.textContent = `${first[0]}（${first[1]} 分）`;
    resultSecondary.textContent = second ? `${second[0]}（${second[1]} 分）` : "—";
    resultGap.textContent = second ? `${first[1] - second[1]} 分` : "—";
    breakdownList.innerHTML = breakdownItems.map((item) => `<li>${item}</li>`).join("");
  }

  stageButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const stage = button.dataset.stage;
      if (!stage) return;
      const stageButtons = document.querySelectorAll(`.quiz-options button[data-stage="${stage}"]`);
      stageButtons.forEach((btn) => btn.classList.remove("active"));
      button.classList.add("active");
      selections[stage] = {
        label: button.dataset.label,
        scores: parseScores(button.dataset.scores)
      };
      updateResult();
    });
  });

  natalSelect.addEventListener("change", () => {
    const value = natalSelect.value;
    if (!value || !natalWeights[value]) {
      selections.natal = null;
    } else {
      selections.natal = {
        label: natalWeights[value].label,
        scores: natalWeights[value].scores
      };
    }
    updateResult();
  });

  updateResult();
});
