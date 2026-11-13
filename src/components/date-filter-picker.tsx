"use client";

import { useState } from "react";
import {
  autoUpdate, flip, FloatingFocusManager, FloatingPortal, offset, shift, size,
  useClick, useDismiss, useFloating, useInteractions, useRole,
} from "@floating-ui/react";
import { DayPicker, TZDate } from "react-day-picker";
import { Icon } from "./ui";

type Props = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
};

function dateFromKey(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new TZDate(year, month - 1, day, 12, 0, 0, "UTC");
}
function dateKey(date: Date) {
  return [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("-");
}
function dateLabel(key: string) {
  return dateFromKey(key).toLocaleDateString("en-GB", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
}

export function DateFilterPicker({ id, label, value, onChange, min, max }: Props) {
  const [open, setOpen] = useState(false);
  const { refs: { setReference, setFloating }, floatingStyles, context } = useFloating({
    open, onOpenChange: setOpen,
    placement: "bottom-start",
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [
      offset(8), flip(), shift({ padding: 12 }),
      size({
        padding: 12,
        apply({ availableHeight, elements }) {
          elements.floating.style.maxHeight = Math.max(0, availableHeight) + "px";
        },
      }),
    ],
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: "dialog" });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);
  const today = open ? new TZDate(new Date(), "UTC") : undefined;
  const todayKey = today ? dateKey(today) : "";
  function choose(key: string) {
    onChange(key);
    setOpen(false);
  }
  return <>
    <button
      id={id}
      type="button"
      ref={setReference}
      className={"date-picker-trigger" + (value ? " has-date" : "")}
      aria-label={label + (value ? ", " + dateLabel(value) : ", choose date")}
      {...getReferenceProps()}
    >
      <Icon name="calendar" size={17} />
      <span>{value ? dateLabel(value) : "Choose date"}</span>
      <Icon name="chevron" size={13} />
    </button>
    {open && <FloatingPortal>
      <FloatingFocusManager context={context} modal={false} initialFocus={-1} restoreFocus>
        <div ref={setFloating} style={floatingStyles} className="date-picker-panel" aria-label={label + " calendar"} {...getFloatingProps()}>
          <div className="date-picker-heading"><span>{label}</span><button type="button" aria-label="Close calendar" onClick={() => setOpen(false)}>×</button></div>
          <DayPicker
            mode="single"
            timeZone="UTC"
            weekStartsOn={1}
            selected={value ? dateFromKey(value) : undefined}
            onSelect={day => choose(day ? dateKey(day) : "")}
            defaultMonth={value ? dateFromKey(value) : min ? dateFromKey(min) : max ? dateFromKey(max) : today}
            startMonth={min ? dateFromKey(min) : undefined}
            endMonth={max ? dateFromKey(max) : undefined}
            today={today}
            disabled={day => {
              const key = dateKey(day);
              return Boolean((min && key < min) || (max && key > max));
            }}
            navLayout="after"
            showOutsideDays
            fixedWeeks
            autoFocus
          />
          <div className="date-picker-footer">
            <button type="button" disabled={!value} onClick={() => choose("")}>Clear date</button>
            <span>UTC</span>
            <button type="button" disabled={Boolean((min && todayKey < min) || (max && todayKey > max))} onClick={() => choose(todayKey)}>Today</button>
          </div>
        </div>
      </FloatingFocusManager>
    </FloatingPortal>}
  </>;
}
