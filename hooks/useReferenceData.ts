'use client';

import { memoize } from '@/lib/api/memo';
import { employeeService, serviceCatalog } from '@/lib/api/services/catalog.service';
import { useAuth } from '@/contexts/AuthContext';
import { useApiQuery } from './useApiQuery';

const TTL_MS = 60_000;

/** Cache keys are scoped by salon so switching salon never shows stale data. */
export const referenceKeys = {
  employees: (salonId: string) => `employees:${salonId}`,
  services: (salonId: string) => `services:${salonId}`,
};

export function useEmployees() {
  const { activeSalon } = useAuth();
  const key = activeSalon ? referenceKeys.employees(activeSalon.id) : null;
  return useApiQuery(key, () => memoize(key!, TTL_MS, () => employeeService.list()));
}

export function useServices() {
  const { activeSalon } = useAuth();
  const key = activeSalon ? referenceKeys.services(activeSalon.id) : null;
  return useApiQuery(key, () => memoize(key!, TTL_MS, () => serviceCatalog.list()));
}
