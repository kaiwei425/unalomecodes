document.addEventListener("DOMContentLoaded", function () {
  var birthDateInput = document.getElementById("birthDate");
  var birthTimeInput = document.getElementById("birthTime");
  var startBtn = document.getElementById("dqStartBtn");
  var step0Error = document.getElementById("dqStep0Error");
  var birthStep = document.getElementById("dqStepBirth");
  var questionStep = document.getElementById("dqStepQuestion");
  var resultStep = document.getElementById("dqStepResult");
  var questionPrompt = document.getElementById("dqQuestionPrompt");
  var questionOptions = document.getElementById("dqQuestionOptions");
  var stepLabel = document.getElementById("dqStepLabel");
  var progressLabel = document.getElementById("dqProgressLabel");
  var resultPrimary = document.getElementById("dqResultPrimary");
  var resultSecondary = document.getElementById("dqResultSecondary");
  var resultSummary = document.getElementById("dqResultSummary");
  var resetBtn = document.getElementById("dqResetBtn");
  var evidenceSection = document.getElementById("dqEvidence");
  var evidenceList = document.getElementById("dqEvidenceList");
  var contractContainer = document.getElementById("dqSacredContract");
  var questions = window.DQ_QUESTIONS || [];

  var state = {
    birthDate: "",
    birthTime: "",
    birthDayKey: null,
    answers: {},
    currentIndex: 0
  };

  function resetQuiz() {
    state = {
      birthDate: "",
      birthTime: "",
      birthDayKey: null,
      answers: {},
      currentIndex: 0
    };
    birthDateInput.value = "";
    birthTimeInput.value = "";
    step0Error.textContent = "";
    if (evidenceSection) {
      evidenceSection.hidden = true;
    }
    if (evidenceList) {
      evidenceList.innerHTML = "";
    }
    if (contractContainer) {
      contractContainer.innerHTML = "";
      contractContainer.hidden = true;
    }
    birthStep.hidden = false;
    questionStep.hidden = true;
    resultStep.hidden = true;
  }

  function renderQuestion(index) {
    var question = questions[index];
    if (!question) {
      showResult();
      return;
    }
    stepLabel.textContent = "Question " + (index + 1) + " / " + questions.length;
    progressLabel.textContent = question.axis === "K" ? "業力" : "心理";
    questionPrompt.textContent = question.prompt;
    questionOptions.innerHTML = "";
    question.options.forEach(function (option) {
      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "dq-option";
      btn.textContent = option.text;
      btn.addEventListener("click", function () {
        state.answers[question.id] = {
          axis: question.axis,
          score: option.score,
          prompt: question.prompt,
          optionText: option.text,
          insight: option.insight || ""
        };
        var nextIndex = index + 1;
        if (nextIndex >= questions.length) {
          showResult();
          return;
        }
        state.currentIndex = nextIndex;
        renderQuestion(nextIndex);
      });
      questionOptions.appendChild(btn);
    });
  }

  function showResult() {
    var birthDayKey = state.birthDayKey;
    var outcome =
      typeof window.DQ_calculateResult === "function"
        ? window.DQ_calculateResult({
            birthDayKey: birthDayKey,
            answers: state.answers
          })
        : { primary: null, secondary: null };
    var deityMap = window.DQ_DATA && window.DQ_DATA.deities ? window.DQ_DATA.deities : {};
    var primaryName =
      outcome.primary && deityMap[outcome.primary]
        ? deityMap[outcome.primary].nameZh
        : "—";
    var secondaryName =
      outcome.secondary && deityMap[outcome.secondary]
        ? deityMap[outcome.secondary].nameZh
        : "—";
    resultPrimary.textContent = "你的主守護神：" + primaryName;
    resultSecondary.textContent = "你的輔助守護神：" + secondaryName;
    var dayDesc =
      (window.DQ_DAY_DESCRIPTIONS && window.DQ_DAY_DESCRIPTIONS[birthDayKey]) ||
      birthDayKey ||
      "未提供";
    resultSummary.textContent = birthDayKey
      ? "Maha Taksa 錨定：" + dayDesc
      : "缺乏出生曜象資料，僅根據題目計分。";
    var evidenceSummary = renderEvidence(outcome);
    questionStep.hidden = true;
    resultStep.hidden = false;
    renderSacredContract(outcome, evidenceSummary);
  }

  function truncate(text, limit) {
    if (!text) return "";
    var cleaned = text.trim();
    if (cleaned.length <= limit) return cleaned;
    return cleaned.slice(0, limit).trim() + "…";
  }

  function getDeityName(deityId) {
    if (!deityId) return "";
    var data = window.DQ_DATA && window.DQ_DATA.deities ? window.DQ_DATA.deities : {};
    return data[deityId] && data[deityId].nameZh ? data[deityId].nameZh : deityId;
  }

  function buildEvidenceSummary(entries) {
    var head = entries.slice(0, 2).map(function (entry) {
      return truncate(entry.reason || "", 80);
    }).filter(Boolean);
    if (!head.length) {
      return "";
    }
    return "例如 " + head.join("；") + "。";
  }

  function renderEvidence(result) {
    if (!evidenceSection || !evidenceList) return;
    evidenceList.innerHTML = "";
    var items = (result && Array.isArray(result.evidence) ? result.evidence.slice() : []);
    if (!items.length) {
      evidenceList.textContent = "本次結果主要來自整體傾向分析。";
      evidenceSection.hidden = false;
      return "";
    }
    items.sort(function (a, b) {
      return b.delta - a.delta;
    });
    var primaryId = result.primary;
    var secondaryId = result.secondary;
    var prioritized = items.filter(function (item) {
      return item.deityId === primaryId || item.deityId === secondaryId;
    });
    var others = items.filter(function (item) {
      return item.deityId !== primaryId && item.deityId !== secondaryId;
    });
    var display = prioritized.concat(others).slice(0, 6);
    display.forEach(function (entry) {
      var deityName =
        window.DQ_DATA &&
        window.DQ_DATA.deities &&
        window.DQ_DATA.deities[entry.deityId] &&
        window.DQ_DATA.deities[entry.deityId].nameZh
          ? window.DQ_DATA.deities[entry.deityId].nameZh
          : entry.deityId;
      var itemEl = document.createElement("article");
      itemEl.className = "dq-evidence-item";
      var header = document.createElement("div");
      header.className = "dq-evidence-header";
      var badge = document.createElement("span");
      badge.className = "dq-evidence-badge";
      badge.textContent = entry.type === "natal" ? "出生能量" : "題目選擇";
      var label = document.createElement("strong");
      label.textContent = "+" + entry.delta + " " + deityName;
      header.appendChild(badge);
      header.appendChild(label);
      var reason = document.createElement("p");
      reason.textContent = truncate(entry.reason, 120);
      itemEl.appendChild(header);
      itemEl.appendChild(reason);
      evidenceList.appendChild(itemEl);
    });
    evidenceSection.hidden = false;
    return buildEvidenceSummary(display);
  }

  function renderSacredContract(result, evidenceSummary) {
    if (!contractContainer) return;
    contractContainer.innerHTML = "";
    if (!result || !result.primary) {
      contractContainer.hidden = true;
      return;
    }
    var contractData =
      window.DQ_SACRED_CONTRACT && window.DQ_SACRED_CONTRACT[result.primary]
        ? window.DQ_SACRED_CONTRACT[result.primary]
        : null;
    if (!contractData) {
      contractContainer.hidden = true;
      return;
    }
    var deityName = getDeityName(result.primary);
    var whyText = contractData.whyTemplate
      .replace("{{deityName}}", deityName)
      .replace("{{evidenceSummary}}", evidenceSummary ? evidenceSummary + " " : "");

    var wrapper = document.createElement("div");
    wrapper.className = "dq-contract";

    var heading = document.createElement("h3");
    heading.textContent = "Sacred Contract";
    wrapper.appendChild(heading);

    var title = document.createElement("p");
    title.className = "dq-contract-title";
    title.textContent = contractData.title;
    wrapper.appendChild(title);

    var archetype = document.createElement("p");
    archetype.className = "dq-contract-archetype";
    archetype.textContent = contractData.archetype;
    wrapper.appendChild(archetype);

    var whySection = document.createElement("div");
    whySection.className = "dq-contract-section";
    var whyLabel = document.createElement("h4");
    whyLabel.textContent = "The Why";
    var whyParagraph = document.createElement("p");
    whyParagraph.textContent = whyText;
    whySection.appendChild(whyLabel);
    whySection.appendChild(whyParagraph);
    wrapper.appendChild(whySection);

    if (contractData.how) {
      var howSection = document.createElement("div");
      howSection.className = "dq-contract-section";
      var howLabel = document.createElement("h4");
      howLabel.textContent = "The How";
      var intro = document.createElement("p");
      intro.textContent = contractData.how.intro;
      howSection.appendChild(howLabel);
      howSection.appendChild(intro);
      if (Array.isArray(contractData.how.steps)) {
        var stepsList = document.createElement("ol");
        contractData.how.steps.forEach(function (step) {
          var li = document.createElement("li");
          li.className = "dq-contract-step";
          li.textContent = step;
          stepsList.appendChild(li);
        });
        howSection.appendChild(stepsList);
      }
      wrapper.appendChild(howSection);
    }

    if (Array.isArray(contractData.taboo) && contractData.taboo.length) {
      var tabooSection = document.createElement("div");
      tabooSection.className = "dq-contract-section";
      var tabooLabel = document.createElement("h4");
      tabooLabel.textContent = "The Taboo";
      var tabooList = document.createElement("ul");
      contractData.taboo.forEach(function (item) {
        var li = document.createElement("li");
        li.textContent = item;
        tabooList.appendChild(li);
      });
      tabooSection.appendChild(tabooLabel);
      tabooSection.appendChild(tabooList);
      wrapper.appendChild(tabooSection);
    }

    contractContainer.appendChild(wrapper);
    contractContainer.hidden = false;
  }

  startBtn.addEventListener("click", function () {
    var dateValue = birthDateInput.value;
    if (!dateValue) {
      step0Error.textContent = "請先輸入出生日期";
      return;
    }
    step0Error.textContent = "";
    state.birthDate = dateValue;
    state.birthTime = birthTimeInput.value || "12:00";
    state.birthDayKey = window.DQ_getThaiBirthDayKey(state.birthDate, state.birthTime);
    birthStep.hidden = true;
    resultStep.hidden = true;
    questionStep.hidden = false;
    state.currentIndex = 0;
    renderQuestion(0);
  });

  resetBtn.addEventListener("click", function () {
    resetQuiz();
  });

  resetQuiz();
});
