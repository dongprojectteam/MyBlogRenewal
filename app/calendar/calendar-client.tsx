"use client";

import { Fragment, useEffect, useMemo, useState } from "react";

type HolidayItem = {
  dateKind: string;
  dateName: string;
  isHoliday: string;
  locdate: string;
  seq: string;
};

type HolidayResponse = {
  year: string;
  month: string;
  items: HolidayItem[];
  error?: string;
};

type DayCell = {
  date: Date;
  isCurrentMonth: boolean;
  key: string;
};

type WeekOption = {
  weekNumber: number;
  targetDate: Date;
  label: string;
};

type MemoItem = {
  date: Date;
  dateKey: string;
  memo: string;
};

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const MEMO_STORAGE_KEY = "dopt-calendar-memos";
const MONTH_OPTIONS = Array.from({ length: 12 }, (_, index) => index);

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocDate(date: Date): string {
  return toDateKey(date).replaceAll("-", "");
}

function fromDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function getMondayStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getIsoWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

function getIsoWeekStart(year: number, weekNumber: number): Date {
  const fourthOfJanuary = new Date(year, 0, 4);
  const weekOneStart = getMondayStart(fourthOfJanuary);
  const start = new Date(weekOneStart);
  start.setDate(weekOneStart.getDate() + (weekNumber - 1) * 7);
  return start;
}

function formatShortDate(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function formatLongDate(date: Date): string {
  return `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

function clampDate(date: Date, min: Date, max: Date): Date {
  if (date < min) return new Date(min);
  if (date > max) return new Date(max);
  return new Date(date);
}

function buildWeekOptions(year: number): WeekOption[] {
  const firstWeekStart = getIsoWeekStart(year, 1);
  const nextYearFirstWeekStart = getIsoWeekStart(year + 1, 1);
  const yearStart = new Date(year, 0, 1);
  const yearEnd = new Date(year, 11, 31);
  const options: WeekOption[] = [];
  const cursor = new Date(firstWeekStart);
  let weekNumber = 1;

  while (cursor < nextYearFirstWeekStart) {
    const weekStart = new Date(cursor);
    const weekEnd = new Date(cursor);
    weekEnd.setDate(weekStart.getDate() + 6);

    const displayStart = clampDate(weekStart, yearStart, yearEnd);
    const displayEnd = clampDate(weekEnd, yearStart, yearEnd);
    const paddedWeekNumber = String(weekNumber).padStart(2, "0");

    options.push({
      weekNumber,
      targetDate: displayStart,
      label: `W${paddedWeekNumber} (${formatShortDate(displayStart)}-${formatShortDate(displayEnd)})`,
    });

    cursor.setDate(cursor.getDate() + 7);
    weekNumber += 1;
  }

  return options;
}

function buildCalendarGrid(baseDate: Date): DayCell[][] {
  const firstOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const lastOfMonth = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0);

  const start = getMondayStart(firstOfMonth);
  const end = new Date(lastOfMonth);
  const endDay = end.getDay();
  const sundayOffset = endDay === 0 ? 0 : 7 - endDay;
  end.setDate(end.getDate() + sundayOffset);
  end.setHours(0, 0, 0, 0);

  const weeks: DayCell[][] = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const week: DayCell[] = [];
    for (let i = 0; i < 7; i += 1) {
      const current = new Date(cursor);
      week.push({
        date: current,
        isCurrentMonth: current.getFullYear() === baseDate.getFullYear() && current.getMonth() === baseDate.getMonth(),
        key: toDateKey(current),
      });
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

export function CalendarClient() {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [holidays, setHolidays] = useState<Record<string, string[]>>({});
  const [memos, setMemos] = useState<Record<string, string>>({});
  const [selectedDateKey, setSelectedDateKey] = useState<string>(toDateKey(new Date()));
  const [isLoadingHoliday, setIsLoadingHoliday] = useState(false);
  const [holidayError, setHolidayError] = useState<string>("");

  useEffect(() => {
    const saved = localStorage.getItem(MEMO_STORAGE_KEY);
    if (saved) {
      try {
        setMemos(JSON.parse(saved) as Record<string, string>);
      } catch {
        localStorage.removeItem(MEMO_STORAGE_KEY);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(MEMO_STORAGE_KEY, JSON.stringify(memos));
  }, [memos]);

  useEffect(() => {
    const year = currentMonth.getFullYear();
    const month = String(currentMonth.getMonth() + 1).padStart(2, "0");

    async function loadHolidays() {
      setIsLoadingHoliday(true);
      setHolidayError("");

      try {
        const response = await fetch(`/api/holidays?year=${year}&month=${month}`);
        const data = (await response.json()) as HolidayResponse;

        if (!response.ok || data.error) {
          setHolidayError(data.error ?? "공휴일 정보를 불러오지 못했습니다.");
          setHolidays({});
          return;
        }

        const mapped: Record<string, string[]> = {};

        for (const item of data.items ?? []) {
          if (!mapped[item.locdate]) {
            mapped[item.locdate] = [];
          }
          mapped[item.locdate].push(item.dateName);
        }

        setHolidays(mapped);
      } catch {
        setHolidayError("공휴일 정보를 불러오지 못했습니다.");
        setHolidays({});
      } finally {
        setIsLoadingHoliday(false);
      }
    }

    loadHolidays();
  }, [currentMonth]);

  const weeks = useMemo(() => buildCalendarGrid(currentMonth), [currentMonth]);
  const weekOptions = useMemo(() => buildWeekOptions(currentMonth.getFullYear()), [currentMonth]);
  const selectedMemo = memos[selectedDateKey] ?? "";
  const memoItems = useMemo<MemoItem[]>(
    () =>
      Object.entries(memos)
        .filter(([, memo]) => memo.trim().length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([dateKey, memo]) => ({
          date: fromDateKey(dateKey),
          dateKey,
          memo,
        })),
    [memos],
  );
  const monthTitle = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  function moveMonth(delta: number) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  function moveToday() {
    const today = new Date();
    setSelectedDateKey(toDateKey(today));
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
  }

  function moveToDate(dateKey: string) {
    const date = fromDateKey(dateKey);
    setSelectedDateKey(dateKey);
    setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
  }

  function changeYear(value: string) {
    const year = Number(value);
    if (!Number.isInteger(year) || year < 1 || year > 9999) return;
    setCurrentMonth((prev) => new Date(year, prev.getMonth(), 1));
  }

  function changeMonth(value: string) {
    const monthIndex = Number(value);
    if (!Number.isInteger(monthIndex) || monthIndex < 0 || monthIndex > 11) return;
    setCurrentMonth((prev) => new Date(prev.getFullYear(), monthIndex, 1));
  }

  function changeWeek(value: string) {
    const weekNumber = Number(value);
    const option = weekOptions.find((item) => item.weekNumber === weekNumber);
    if (!option) return;

    setSelectedDateKey(toDateKey(option.targetDate));
    setCurrentMonth(new Date(option.targetDate.getFullYear(), option.targetDate.getMonth(), 1));
  }

  function updateMemo(value: string) {
    setMemos((prev) => {
      const next = { ...prev };
      if (value.trim().length === 0) {
        delete next[selectedDateKey];
      } else {
        next[selectedDateKey] = value;
      }
      return next;
    });
  }

  return (
    <section className="panel stack">
      <div className="calendar-toolbar">
        <h2 style={{ margin: 0 }}>공휴일 달력</h2>
        <div className="calendar-toolbar-actions">
          <button className="ghost-button" type="button" onClick={() => moveMonth(-1)}>
            이전 달
          </button>
          <div className="calendar-title">{monthTitle}</div>
          <button className="ghost-button" type="button" onClick={() => moveMonth(1)}>
            다음 달
          </button>
          <button className="ghost-button" type="button" onClick={moveToday}>
            오늘
          </button>
        </div>
        <div className="calendar-picker" aria-label="연도, 월, 주차 선택">
          <label className="calendar-picker-field">
            <input
              className="calendar-year-input"
              type="number"
              min="1"
              max="9999"
              value={currentMonth.getFullYear()}
              aria-label="년도 선택"
              onChange={(event) => changeYear(event.target.value)}
            />
            <span>년</span>
          </label>
          <label className="calendar-picker-field">
            <select
              className="calendar-month-select"
              value={currentMonth.getMonth()}
              aria-label="월 선택"
              onChange={(event) => changeMonth(event.target.value)}
            >
              {MONTH_OPTIONS.map((monthIndex) => (
                <option key={monthIndex} value={monthIndex}>
                  {monthIndex + 1}월
                </option>
              ))}
            </select>
          </label>
          <label className="calendar-picker-field">
            <select
              className="calendar-week-select"
              value=""
              aria-label="주차 선택"
              onChange={(event) => changeWeek(event.target.value)}
            >
              <option value="" disabled>
                주차 선택
              </option>
              {weekOptions.map((option) => (
                <option key={option.weekNumber} value={option.weekNumber}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {isLoadingHoliday ? <div className="loading-inline">공휴일 정보를 불러오는 중입니다.</div> : null}
      {holidayError ? <div className="notice notice-error">{holidayError}</div> : null}

      <div className="calendar-grid-wrap">
        <div className="calendar-week-header">Wk</div>
        {DAY_LABELS.map((label) => (
          <div className="calendar-day-header" key={label}>
            {label}
          </div>
        ))}

        {weeks.map((week) => {
          const weekNumber = getIsoWeekNumber(week[0].date);

          return (
            <Fragment key={`row-${week[0].key}`}>
              <div className="calendar-week-number">{`W${String(weekNumber).padStart(2, "0")}`}</div>

              {week.map((cell) => {
                const locdate = toLocDate(cell.date);
                const holidayNames = holidays[locdate] ?? [];
                const isHoliday = holidayNames.length > 0;
                const isSunday = cell.date.getDay() === 0;
                const isSelected = selectedDateKey === cell.key;

                return (
                  <button
                    key={cell.key}
                    type="button"
                    className={`calendar-cell${cell.isCurrentMonth ? "" : " is-outside"}${isHoliday || isSunday ? " is-holiday" : ""}${isSelected ? " is-selected" : ""}`}
                    onClick={() => setSelectedDateKey(cell.key)}
                  >
                    <div className="calendar-date-stack">
                      {!cell.isCurrentMonth ? (
                        <div className="calendar-month-label">{cell.date.getMonth() + 1}월</div>
                      ) : null}
                      <div className="calendar-date">{cell.date.getDate()}</div>
                    </div>
                    {isHoliday ? <div className="calendar-holiday-name">{holidayNames.join(", ")}</div> : null}
                    {memos[cell.key] ? <div className="calendar-memo-mark">메모 있음</div> : null}
                  </button>
                );
              })}
            </Fragment>
          );
        })}
      </div>

      <div className="field">
        <label className="label" htmlFor="calendar-note">
          {selectedDateKey} 메모
        </label>
        <textarea
          id="calendar-note"
          className="textarea"
          placeholder="이 날짜에 대한 간단한 메모를 남기세요. (브라우저에 저장됩니다)"
          value={selectedMemo}
          onChange={(event) => updateMemo(event.target.value)}
        />
      </div>

      <div className="calendar-memo-list">
        <div className="calendar-memo-list-header">
          <h3>저장된 메모</h3>
          <span>{memoItems.length}개</span>
        </div>
        {memoItems.length === 0 ? (
          <p className="muted calendar-memo-empty">저장된 메모가 없습니다.</p>
        ) : (
          <div className="calendar-memo-items">
            {memoItems.map((item) => (
              <button
                key={item.dateKey}
                className={`calendar-memo-item${selectedDateKey === item.dateKey ? " is-selected" : ""}`}
                type="button"
                onClick={() => moveToDate(item.dateKey)}
              >
                <span className="calendar-memo-date">
                  {formatLongDate(item.date)}
                  <span>W{String(getIsoWeekNumber(item.date)).padStart(2, "0")}</span>
                </span>
                <span className="calendar-memo-preview">{item.memo}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
