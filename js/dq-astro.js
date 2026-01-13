window.DQ_getThaiBirthDayKey = function (dateStr, timeStr) {
  if (!dateStr) return null;
  const fallback = "12:00";
  const [year, month, day] = dateStr.split("-").map((val) => Number(val));
  if (!year || !month || !day) return null;
  const [rawHour, rawMinute] = (timeStr || fallback).split(":").map((val) => Number(val));
  if (Number.isNaN(rawHour) || Number.isNaN(rawMinute)) return null;
  const date = new Date(year, month - 1, day, rawHour, rawMinute);
  if (date.getHours() < 6) {
    date.setDate(date.getDate() - 1);
  }
  const adjustedHour = date.getHours();
  const dayIndex = date.getDay();
  if (dayIndex === 3) {
    return adjustedHour >= 18 ? "WednesdayNight" : "WednesdayDay";
  }
  const map = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday"
  };
  return map[dayIndex] || null;
};

window.DQ_getNatalAffinities = function (dayKey) {
  if (!dayKey) return null;
  const map = {
    Sunday: { primary: "garuda", secondary: ["vishnu"] },
    Monday: { primary: "lakshmi", secondary: ["nangkwak"] },
    Tuesday: { primary: "wessuwan", secondary: ["ganesha"] },
    WednesdayDay: { primary: "ganesha", secondary: ["indra"] },
    WednesdayNight: { primary: "rahu", secondary: ["naga"] },
    Thursday: { primary: "brahma", secondary: ["sivali"] },
    Friday: { primary: "lakshmi", secondary: ["trimurti"] },
    Saturday: { primary: "naga", secondary: ["shiva"] }
  };
  return map[dayKey] || null;
};

window.DQ_DAY_DESCRIPTIONS = {
  Sunday: "週日光焰能量",
  Monday: "週一柔月能量",
  Tuesday: "週二戰火能量",
  WednesdayDay: "週三白天靈動",
  WednesdayNight: "週三夜間變動",
  Thursday: "週四智慧能量",
  Friday: "週五魅力與富饒",
  Saturday: "週六沈穩土星"
};
