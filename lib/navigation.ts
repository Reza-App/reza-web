import {
  BarChart3,
  Building2,
  CalendarDays,
  CreditCard,
  FileText,
  Gauge,
  type LucideIcon,
  MessageSquareText,
  Settings2,
  ShieldCheck,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';

export interface NavLink {
  label: string;
  href: string;
}

export interface NavSection {
  title: string;
  icon: LucideIcon;
  links: NavLink[];
}

export interface TopNavItem {
  name: string;
  href: string;
  /** Path prefix that marks the item as active. */
  match: string;
  icon: LucideIcon;
}

export const TOP_NAV: TopNavItem[] = [
  { name: 'Agenda', href: '/dashboard/rendez-vous', match: '/dashboard/rendez-vous', icon: CalendarDays },
  { name: 'Clients', href: '/dashboard/clients/fichier-client/gestion', match: '/dashboard/clients', icon: Users },
  { name: 'Caisse', href: '/dashboard/caisse', match: '/dashboard/caisse', icon: CreditCard },
  {
    name: 'Admin',
    href: '/dashboard/admin/param-agenda/gestion-de-prestations',
    match: '/dashboard/admin',
    icon: Settings2,
  },
];

export const CLIENT_SECTIONS: NavSection[] = [
  {
    title: 'Fichier client',
    icon: FileText,
    links: [
      { label: 'Gestion', href: '/dashboard/clients/fichier-client/gestion' },
      { label: 'Doublons', href: '/dashboard/clients/fichier-client/doublons' },
    ],
  },
  {
    title: 'Mes avis',
    icon: MessageSquareText,
    links: [
      { label: 'Avis à modérer', href: '/dashboard/clients/mes-avis/avis-a-moderer' },
      { label: 'Avis modérés', href: '/dashboard/clients/mes-avis/avis-moderes' },
      { label: 'Avis refusés', href: '/dashboard/clients/mes-avis/avis-refuses' },
      { label: 'Règles de modération', href: '/dashboard/clients/mes-avis/regles-moderation' },
      { label: 'Statistiques avis', href: '/dashboard/clients/mes-avis/statistiques-avis' },
    ],
  },
  {
    title: 'Statistiques clients',
    icon: TrendingUp,
    links: [
      { label: '100 meilleurs clients', href: '/dashboard/clients/statistiques/meilleurs-clients' },
      { label: 'Nouveaux clients', href: '/dashboard/clients/statistiques/nouveaux-clients' },
      { label: 'Fréquences globales', href: '/dashboard/clients/statistiques/frequences-globales' },
    ],
  },
];

export const ADMIN_SECTIONS: NavSection[] = [
  {
    title: 'Agenda',
    icon: CalendarDays,
    links: [
      { label: 'Gestion des prestations', href: '/dashboard/admin/param-agenda/gestion-de-prestations' },
      { label: 'Gestion des agendas', href: '/dashboard/admin/param-agenda/gestion-des-agendas' },
      { label: 'Affichage des RDV', href: '/dashboard/admin/param-agenda/gestion-affichage-rdv' },
    ],
  },
  {
    title: 'Établissement',
    icon: Building2,
    links: [
      { label: 'Photos', href: '/dashboard/admin/param-etablissement/gestion-photos' },
      { label: 'Descriptif', href: '/dashboard/admin/param-etablissement/descriptif-etablissement' },
      { label: 'Notifications RDV web', href: '/dashboard/admin/param-etablissement/notifications-rdv-web' },
      { label: 'Horaires et délais', href: '/dashboard/admin/param-etablissement/gestion-horaires-delais' },
      { label: 'Messages', href: '/dashboard/admin/param-etablissement/gestion-message' },
      { label: "Liste d'attente", href: '/dashboard/admin/param-etablissement/gestion-liste-attente' },
    ],
  },
  {
    title: 'Fiche client',
    icon: FileText,
    links: [{ label: 'Gestion des fiches', href: '/dashboard/admin/fiche-clients/gestion-fiche-clients' }],
  },
  {
    title: 'Statistiques RDV',
    icon: BarChart3,
    links: [
      { label: 'Indicateurs clés', href: '/dashboard/admin/statistiques-rdv/indicateurs-cles' },
      { label: 'Autres indicateurs', href: '/dashboard/admin/statistiques-rdv/autres' },
      { label: 'Prestations', href: '/dashboard/admin/statistiques-rdv/Prestations' },
      { label: 'Collaborateurs', href: '/dashboard/admin/statistiques-rdv/collaborateurs' },
      { label: 'RDV', href: '/dashboard/admin/statistiques-rdv/rdv' },
      { label: 'RDV non honorés', href: '/dashboard/admin/statistiques-rdv/rdv-pas-venus' },
    ],
  },
  {
    title: "Taux d'occupation",
    icon: Gauge,
    links: [
      { label: "Vue d'ensemble", href: '/dashboard/admin/taux-occupation/vue-ensemble' },
      { label: 'Collaborateurs', href: '/dashboard/admin/taux-occupation/collaborateurs' },
      { label: 'Prestations', href: '/dashboard/admin/taux-occupation/prestations' },
    ],
  },
  {
    title: 'Corbeille RDV',
    icon: Trash2,
    links: [{ label: 'RDV annulés', href: '/dashboard/admin/corbeille-rdv/rdv-annules' }],
  },
  {
    title: 'Mes factures',
    icon: FileText,
    links: [
      { label: 'Abonnement et paiement', href: '/dashboard/admin/mes-factures/moyen-de-paiement' },
      { label: 'Liste des factures', href: '/dashboard/admin/mes-factures/liste-des-factures' },
    ],
  },
  {
    title: 'Sécurité',
    icon: ShieldCheck,
    links: [{ label: "Journal d'activité", href: '/dashboard/admin/journal' }],
  },
];

export function isActivePath(pathname: string | null, href: string): boolean {
  if (!pathname) return false;
  return pathname === href || pathname.startsWith(`${href}/`);
}
