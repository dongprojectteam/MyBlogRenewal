"use client";

import { useEffect, useMemo, useState } from "react";

function getDayTone(now: Date | null) {
  if (!now) return "시간을 불러오는 중입니다.";

  const hour = now.getHours();
  if (hour < 5) return "깊은 밤에도 조용히 켜져 있는 작업실.";
  if (hour < 12) return "오늘도 천천히, 좋은 흐름으로 시작해요.";
  if (hour < 18) return "한가운데를 지나가는 시간입니다.";
  return "하루를 정리하기 좋은 저녁이에요.";
}

export function CurrentTimeCard() {
  const [now, setNow] = useState<Date | null>(null);

  const formatters = useMemo(
    () => ({
      date: new Intl.DateTimeFormat("ko-KR", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
      time: new Intl.DateTimeFormat("ko-KR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      }),
    }),
    [],
  );

  useEffect(() => {
    setNow(new Date());
    const interval = window.setInterval(() => setNow(new Date()), 1000);

    return () => window.clearInterval(interval);
  }, []);

  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || "Local", []);
  const timeText = now ? formatters.time.format(now) : "--:--:--";
  const dateText = now ? formatters.date.format(now) : "현재 시간을 준비하고 있어요.";

  return (
    <article className="current-time-card">
      <div className="current-time-card-header">
        <span className="tag neutral">Current time</span>
        <span className="current-time-zone">{timeZone}</span>
      </div>
      <time className="current-time-value" dateTime={now?.toISOString()}>
        {timeText}
      </time>
      <div className="current-time-date">{dateText}</div>
      <p>{getDayTone(now)}</p>
    </article>
  );
}
