'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';
import { useI18n } from '@/components/I18nProvider';

export default function DatePicker({ value, onChange, placeholder, id }) {
  const { lang, t } = useI18n();
  const defaultPlaceholder = placeholder || t('datepicker.select_date');
  const [open, setOpen] = useState(false);
  // Internal state for the calendar view (what month we are looking at)
  const [viewDate, setViewDate] = useState(value ? new Date(value) : new Date());
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [ref]);

  useEffect(() => {
    if (value) {
      setViewDate(new Date(value));
    }
  }, [value]);

  const toggle = () => setOpen(!open);

  const formatDisplayDate = (isoString) => {
    if (!isoString) return defaultPlaceholder;
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return defaultPlaceholder;
    const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';
    return d.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
  const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

  const renderCalendar = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();

    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    // Previous month filler days
    const prevMonthDays = getDaysInMonth(year, month - 1);
    for (let i = firstDay - 1; i >= 0; i--) {
      days.push({ day: prevMonthDays - i, isCurrentMonth: false, offset: -1 });
    }
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ day: i, isCurrentMonth: true, offset: 0 });
    }
    // Next month filler days
    const remaining = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remaining; i++) {
      days.push({ day: i, isCurrentMonth: false, offset: 1 });
    }

    const handleSelect = (dayInfo) => {
      let targetMonth = month + dayInfo.offset;
      let targetYear = year;
      if (targetMonth < 0) { targetMonth = 11; targetYear--; }
      else if (targetMonth > 11) { targetMonth = 0; targetYear++; }

      const d = new Date(targetYear, targetMonth, dayInfo.day);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      onChange(iso);
      setOpen(false);
    };

    const locale = lang === 'ar' ? 'ar-EG' : 'en-GB';

    return (
      <div className="custom-calendar-popover">
        <div className="calendar-header">
          <button onClick={() => setViewDate(new Date(year, month - 1, 1))} className="calendar-nav-btn"><ChevronLeft size={16} /></button>
          <div className="calendar-title">
            {viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
          </div>
          <button onClick={() => setViewDate(new Date(year, month + 1, 1))} className="calendar-nav-btn"><ChevronRight size={16} /></button>
        </div>
        <div className="calendar-grid">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d, index) => {
            const dayNames = lang === 'ar' ? ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'] : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
            return <div key={d} className="calendar-day-name">{dayNames[index]}</div>;
          })}
          {days.map((d, i) => {
            let targetMonth = month + d.offset;
            let targetYear = year;
            if (targetMonth < 0) { targetMonth = 11; targetYear--; }
            else if (targetMonth > 11) { targetMonth = 0; targetYear++; }
            const iso = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
            const isSelected = value === iso;
            const isToday = iso === new Date().toISOString().slice(0, 10);

            let className = 'calendar-day';
            if (!d.isCurrentMonth) className += ' outside';
            if (isSelected) className += ' selected';
            if (isToday && !isSelected) className += ' today';

            return (
              <button key={i} className={className} onClick={() => handleSelect(d)}>
                {d.day}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="custom-datepicker-wrapper" ref={ref} id={id ? `${id}-wrapper` : undefined}>
      <button className="custom-datepicker-input" onClick={toggle} type="button" id={id}>
        <CalendarIcon size={15} style={{ color: 'var(--accent-blue)', flexShrink: 0 }} />
        <span style={{ flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>
          {formatDisplayDate(value)}
        </span>
      </button>
      {open && renderCalendar()}
    </div>
  );
}
