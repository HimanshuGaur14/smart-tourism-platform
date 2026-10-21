import { BarChart3, Compass, Map, Store, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
}

export const primaryNav: NavItem[] = [
  { to: '/explore', label: 'Explore India', icon: Compass },
  { to: '/planner', label: 'Trip planner', icon: Map },
  { to: '/marketplace', label: 'Local marketplace', icon: Store },
  { to: '/intelligence', label: 'Tourism intelligence', icon: BarChart3 },
];
