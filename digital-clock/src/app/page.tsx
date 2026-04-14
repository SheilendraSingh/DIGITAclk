"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./page.module.css";

type ClockMode = "digital" | "analog";
type ThemeMode = "dark" | "light";

type ClockInfoResponse = {
  standardTimeLabel?: string;
  userTimeZone?: string;
};

type ClockParts = {
  hours: string;
  minutes: string;
  seconds: string;
  meridiem: "AM" | "PM";
  dateLine: string;
};

const pad = (value: number): string => String(value).padStart(2, "0");

const formatClock = (now: Date): ClockParts => {
  const currentHour = now.getHours();
  const meridiem: "AM" | "PM" = currentHour >= 12 ? "PM" : "AM";
  const hour12 = currentHour % 12 || 12;

  return {
    hours: pad(hour12),
    minutes: pad(now.getMinutes()),
    seconds: pad(now.getSeconds()),
    meridiem,
    dateLine: `${now
      .toLocaleDateString("en-US", {
        weekday: "long",
      })
      .toUpperCase()}, ${now.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
    })}`,
  };
};

const DigitalCell = ({
  value,
  wide = false,
}: {
  value: string;
  wide?: boolean;
}) => (
  <span className={`${styles.digitalCell} ${wide ? styles.digitalCellWide : ""}`}>
    <span key={value} className={styles.digitalCellValue}>
      {value}
    </span>
  </span>
);

export default function Home() {
  const [now, setNow] = useState<Date | null>(null);
  const [clockMode, setClockMode] = useState<ClockMode>("digital");
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [standardTimeLabel, setStandardTimeLabel] = useState("Standard Time");

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const storedTheme = window.localStorage.getItem("clock-theme");
      const selectedTheme: ThemeMode =
        storedTheme === "light" || storedTheme === "dark"
          ? storedTheme
          : window.matchMedia("(prefers-color-scheme: dark)").matches
            ? "dark"
            : "light";

      setTheme(selectedTheme);
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("clock-theme", theme);
  }, [theme]);

  useEffect(() => {
    const setCurrentTime = () => {
      setNow(new Date());
    };

    const firstFrameId = window.requestAnimationFrame(setCurrentTime);
    const timerId = window.setInterval(() => {
      setCurrentTime();
    }, 1000);

    return () => {
      window.cancelAnimationFrame(firstFrameId);
      window.clearInterval(timerId);
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    const readClockInfo = async () => {
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const fallbackTimeLabel = browserTimeZone.replaceAll("_", " ");

      try {
        const query = new URLSearchParams({ timeZone: browserTimeZone }).toString();
        const response = await fetch(`/api/clock-info?${query}`, { cache: "no-store" });
        if (!response.ok) {
          if (mounted) {
            setStandardTimeLabel(fallbackTimeLabel);
          }
          return;
        }

        const data = (await response.json()) as ClockInfoResponse;
        if (!mounted) {
          return;
        }

        if (data.standardTimeLabel) {
          setStandardTimeLabel(data.standardTimeLabel);
          return;
        }

        setStandardTimeLabel(fallbackTimeLabel);
      } catch {
        if (mounted) {
          setStandardTimeLabel(fallbackTimeLabel);
        }
      }
    };

    void readClockInfo();

    return () => {
      mounted = false;
    };
  }, []);

  const formatted = useMemo(() => (now ? formatClock(now) : null), [now]);
  const displayHours = formatted?.hours ?? "--";
  const displayMinutes = formatted?.minutes ?? "--";
  const displaySeconds = formatted?.seconds ?? "--";
  const displayMeridiem = formatted?.meridiem ?? "--";

  const hourAngle = now ? (now.getHours() % 12) * 30 + now.getMinutes() * 0.5 : 0;
  const minuteAngle = now ? now.getMinutes() * 6 + now.getSeconds() * 0.1 : 0;
  const secondAngle = now ? now.getSeconds() * 6 : 0;
  const hourMinuteHandColor = theme === "dark" ? "#f8fafc" : "#0f172a";

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <main className={styles.page}>
      <section className={styles.panel}>
        <div className={styles.toolbar}>
          <h1 className={styles.heading}>Clock Web App</h1>
          <div className={styles.controls}>
            <button
              type="button"
              className={`${styles.controlButton} ${
                clockMode === "digital" ? styles.controlButtonActive : ""
              }`}
              onClick={() => setClockMode("digital")}
            >
              Digital
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${
                clockMode === "analog" ? styles.controlButtonActive : ""
              }`}
              onClick={() => setClockMode("analog")}
            >
              Analog
            </button>
            <button
              type="button"
              className={styles.controlButton}
              onClick={toggleTheme}
            >
              {theme === "dark" ? "Light Mode" : "Dark Mode"}
            </button>
          </div>
        </div>

        <div className={styles.clockStage}>
          {clockMode === "digital" ? (
            <div className={styles.digitalClock} aria-live="polite">
              <div className={styles.timeLine}>
                <DigitalCell value={displayHours} />
                <span className={styles.separator}>:</span>
                <DigitalCell value={displayMinutes} />
                <span className={styles.separator}>:</span>
                <DigitalCell value={displaySeconds} />
                <DigitalCell value={displayMeridiem} wide />
              </div>
            </div>
          ) : (
            <div className={styles.analogWrap} aria-label="Running analog clock">
              <div className={styles.analogClock}>
                {Array.from({ length: 12 }).map((_, index) => (
                  <span
                    key={`tick-${index}`}
                    className={styles.tick}
                    style={{ transform: `translateX(-50%) rotate(${index * 30}deg)` }}
                  />
                ))}
                <span
                  className={`${styles.hand} ${styles.hourHand}`}
                  style={{
                    transform: `translateX(-50%) rotate(${hourAngle}deg)`,
                    backgroundColor: hourMinuteHandColor,
                  }}
                />
                <span
                  className={`${styles.hand} ${styles.minuteHand}`}
                  style={{
                    transform: `translateX(-50%) rotate(${minuteAngle}deg)`,
                    backgroundColor: hourMinuteHandColor,
                  }}
                />
                <span
                  className={`${styles.hand} ${styles.secondHand}`}
                  style={{ transform: `translateX(-50%) rotate(${secondAngle}deg)` }}
                />
                <span className={styles.centerDot} />
              </div>
            </div>
          )}
        </div>

        <div className={styles.infoLines}>
          <p className={styles.primaryLine}>
            {formatted
              ? `${formatted.hours}:${formatted.minutes}:${formatted.seconds} ${formatted.meridiem}`
              : "--:--:-- --"}
          </p>
          <p className={styles.secondaryLine}>{formatted ? formatted.dateLine : "LOADING..."}</p>
          <p className={styles.tertiaryLine}>{standardTimeLabel}</p>
        </div>
      </section>
    </main>
  );
}
