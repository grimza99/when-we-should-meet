import { useState } from "react";

export function useAppState() {
  const [visibleMonth, setVisibleMonth] = useState("");

  return {
    visibleMonth,
    setVisibleMonth: (date: string) => setVisibleMonth(date),
  };
}
