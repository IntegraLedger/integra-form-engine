export interface NavLink {
  label: string;
  href: string;
  external?: boolean;
}

export const navLinks: NavLink[] = [
  { label: 'Demo', href: '/demo' },
  { label: 'Install', href: '/install' },
  { label: 'Guide', href: '/guide' },
];
