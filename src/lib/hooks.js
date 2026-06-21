'use client';
import { useQuery } from '@tanstack/react-query';

/**
 * Fetch dashboard stats for a given date.
 */
export function useDashboard(date) {
  const dateKey = date || new Date().toISOString().slice(0, 10);
  return useQuery({
    queryKey: ['dashboard', dateKey],
    queryFn: async () => {
      const res = await fetch(`/api/dashboard?date=${dateKey}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load dashboard');
      }
      return res.json();
    },
  });
}

/**
 * Fetch attendance records with filters, pagination, and sorting.
 */
export function useAttendance({ from, to, empId, page = 1, limit = 25, sortBy = 'date', sortOrder = 'asc' } = {}) {
  return useQuery({
    queryKey: ['attendance', { from, to, empId, page, limit, sortBy, sortOrder }],
    queryFn: async () => {
      const params = new URLSearchParams({ page, limit, sortBy, sortOrder });
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      if (empId) params.set('empId', empId);

      const res = await fetch(`/api/attendance?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load attendance');
      }
      return res.json();
    },
  });
}

/**
 * Fetch employee list with optional search.
 */
export function useEmployees(search = '') {
  return useQuery({
    queryKey: ['employees', 'list', search],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: 'list' });
      if (search) params.set('search', search);

      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load employees');
      }
      return res.json();
    },
    staleTime: 2 * 60 * 1000, // Employee list changes rarely
  });
}

/**
 * Fetch employee summary (attendance stats per employee) for a date range.
 */
export function useEmployeeSummary({ from, to } = {}) {
  return useQuery({
    queryKey: ['employees', 'summary', from, to],
    queryFn: async () => {
      const params = new URLSearchParams({ mode: 'summary' });
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      const res = await fetch(`/api/employees?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to load employee summary');
      }
      return res.json();
    },
  });
}
