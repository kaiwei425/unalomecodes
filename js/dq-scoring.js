window.DQ_calculateResult = function ({ birthDayKey, answers }) {
  var deities = (window.DQ_DATA && window.DQ_DATA.deities) || {};
  var scoreMap = Object.keys(deities).reduce(function (map, key) {
    map[key] = 0;
    return map;
  }, {});

  var DEITY_TRAITS = {
    rahu: "擅長吞噬霉運與轉化危機",
    lakshmi: "帶來魅力與優雅財富",
    ganesha: "擅長移除障礙與啟動新章",
    brahma: "主掌宏觀命運與全能視野",
    indra: "象徵協調與慈悲領導",
    vishnu: "守護秩序與長期穩定",
    naga: "守護土地與地下彩運",
    garuda: "代表權威與洗冤",
    sivali: "象徵順遂與人緣福報",
    wessuwan: "擅長驅除惡氣與守財",
    shiva: "掌管毀滅與徹底重生",
    trimurti: "成全愛情三位一體的合一",
    nangkwak: "招來人氣、現金流與商機",
    ketu: "增強直覺與神秘科技感",
    saraswati: "守護智慧、藝術與專注",
    thorani: "穩固土地並見證功德"
  };
  var evidence = [];

  function addScore(deityId, delta, meta) {
    if (!deityId || !scoreMap.hasOwnProperty(deityId) || delta <= 0) {
      return;
    }
    scoreMap[deityId] += delta;
    evidence.push({
      type: meta.type,
      source: meta.source,
      deityId: deityId,
      delta: delta,
      reason: meta.reason
    });
  }

  if (birthDayKey) {
    var affinities =
      typeof window.DQ_getNatalAffinities === "function"
        ? window.DQ_getNatalAffinities(birthDayKey)
        : null;
    var dayDesc =
      (window.DQ_DAY_DESCRIPTIONS && window.DQ_DAY_DESCRIPTIONS[birthDayKey]) ||
      birthDayKey ||
      "未知曜能量";
    if (affinities && affinities.primary) {
      var primaryName =
        deities[affinities.primary] && deities[affinities.primary].nameZh
          ? deities[affinities.primary].nameZh
          : affinities.primary;
      var trait = DEITY_TRAITS[affinities.primary]
        ? "，" + DEITY_TRAITS[affinities.primary]
        : "";
      addScore(affinities.primary, 30, {
        type: "natal",
        source: "birth",
        reason:
          "你出生於" +
          dayDesc +
          "，這段曜象能量與" +
          primaryName +
          trait +
          "對應，因此獲得 +30。"
      });
    }
    var secondaries = (affinities && affinities.secondary) || [];
    secondaries.forEach(function (deityId) {
      var secondaryName =
        deities[deityId] && deities[deityId].nameZh ? deities[deityId].nameZh : deityId;
      var trait = DEITY_TRAITS[deityId] ? "，" + DEITY_TRAITS[deityId] : "";
      addScore(deityId, 15, {
        type: "natal",
        source: "birth",
        reason:
          "你出生於" +
          dayDesc +
          "，這段曜象能量與" +
          secondaryName +
          trait +
          "對應，因此獲得 +15。"
      });
    });
  }

  Object.entries(answers || {}).forEach(function (_ref) {
    var questionId = _ref[0];
    var answer = _ref[1] || {};
    var prompt = answer.prompt || "";
    var optionText = answer.optionText || "";
    var insight =
      typeof answer.insight === "string" && answer.insight.trim().length
        ? answer.insight.trim().replace(/。$/, "")
        : "";
    Object.entries(answer.score || {}).forEach(function (_ref2) {
      var deityId = _ref2[0];
      var value = _ref2[1];
      if (!value || !scoreMap.hasOwnProperty(deityId)) {
        return;
      }
      var deityName =
        deities[deityId] && deities[deityId].nameZh ? deities[deityId].nameZh : deityId;
      var trait = DEITY_TRAITS[deityId]
        ? "，" + DEITY_TRAITS[deityId]
        : "";
      var reasonParts = [
        "你在「" + prompt + "」選擇「" + optionText + "」",
        insight ? "系統判斷" + insight : "系統判斷這個選擇",
        "因此" + deityName + trait + "，獲得 +" + value + "。"
      ];
      addScore(deityId, value, {
        type: "question",
        source: questionId,
        reason: reasonParts.join("，")
      });
    });
  });

  var sorted = Object.entries(scoreMap)
    .sort(function (a, b) {
      return b[1] - a[1];
    })
    .filter(function (item) {
      return item[1] > 0;
    });

  return {
    primary: sorted[0] ? sorted[0][0] : null,
    secondary: sorted[1] ? sorted[1][0] : null,
    scores: scoreMap,
    evidence: evidence
  };
};
