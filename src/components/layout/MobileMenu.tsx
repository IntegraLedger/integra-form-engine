import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { navLinks } from '@/constants/navigation';

interface MobileMenuProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onClose: () => void;
}

export function MobileMenu({ theme, onToggleTheme, onClose }: MobileMenuProps) {
  const location = useLocation();

  return (
    <div className="animate-slide-down md:hidden border-t border-border/50 bg-background/95 backdrop-blur-sm">
      <nav className="flex flex-col gap-1 px-4 py-4">
        {navLinks.map((link) => {
          const isActive = !link.external && location.pathname === link.href;

          if (link.external) {
            return (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-md px-3 py-2 text-sm font-medium text-foreground/80 hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={onClose}
              >
                {link.label}
              </a>
            );
          }

          return (
            <Link
              key={link.href}
              to={link.href}
              className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-foreground/80 hover:bg-accent hover:text-accent-foreground'
              }`}
              onClick={onClose}
            >
              {link.label}
            </Link>
          );
        })}

        {/* Dark mode toggle */}
        <div className="mt-2 border-t border-border/50 pt-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleTheme}
            className="w-full justify-start gap-2"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </Button>
        </div>
      </nav>
    </div>
  );
}
