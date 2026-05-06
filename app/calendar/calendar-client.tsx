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

const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일"];
const MEMO_STORAGE_KEY = "dopt-calendar-memos";

function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toLocDate(date: Date): string {
  return toDateKey(date).replaceAll("-", "");
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
        isCurrentMonth: current.getMonth() === baseDate.getMonth(),
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
  const selectedMemo = memos[selectedDateKey] ?? "";
  const monthTitle = `${currentMonth.getFullYear()}년 ${currentMonth.getMonth() + 1}월`;

  function moveMonth(delta: number) {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
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
                    <div className="calendar-date">{cell.date.getDate()}</div>
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
    </section>
  );
}
