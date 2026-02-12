import { useState } from 'react';
import { X, Scale, User, Calendar, GraduationCap, MapPin, Phone, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { ChangeReport, type FieldChange } from '@/components/ui/change-report';
import { useRecordSource, useRefreshRecord, useAcceptChanges } from '@/hooks/use-refresh';

interface LawyerRecord {
  id: number;
  integra_lawyer_id: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  bar_number: string | null;
  state_abbr: string;
  bar_status: string | null;
  year_admitted: number | null;
  law_school: string | null;
  firm_name: string | null;
  city: string | null;
  state: string | null;
  county: string | null;
  phone: string | null;
}

interface LawyerDetailDrawerProps {
  lawyer: LawyerRecord | null;
  onClose: () => void;
}

const STATUS_VARIANT: Record<string, string> = {
  'currently registered': 'active',
  'delinquent': 'pending',
  'retired': 'secondary',
  'deceased': 'disabled',
  'suspended': 'failed',
  'disbarred': 'failed',
};

function getStatusVariant(status: string | null): string {
  if (!status) return 'secondary';
  const lower = status.toLowerCase();
  for (const [key, variant] of Object.entries(STATUS_VARIANT)) {
    if (lower.includes(key)) return variant;
  }
  return 'secondary';
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="py-4 border-b border-border last:border-0">
      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h3>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value ?? '-'}</span>
    </div>
  );
}

export function LawyerDetailDrawer({ lawyer, onClose }: LawyerDetailDrawerProps) {
  if (!lawyer) return null;

  const { data: sourceInfo } = useRecordSource('lawyers', lawyer.id);
  const refreshMutation = useRefreshRecord();
  const acceptMutation = useAcceptChanges();
  const [refreshResult, setRefreshResult] = useState<{ diff: FieldChange[]; status: string } | null>(null);

  const handleRefresh = async () => {
    const result = await refreshMutation.mutateAsync({ registry: 'lawyers', recordId: lawyer.id });
    setRefreshResult(result);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border z-50 overflow-y-auto shadow-2xl animate-slide-in-right">
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-bold">{lawyer.full_name}</p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={getStatusVariant(lawyer.bar_status) as never} className="text-xs">
                {lawyer.bar_status || 'Unknown'}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">{lawyer.state_abbr}</span>
              {sourceInfo?.found && sourceInfo.source && (
                <FreshnessBadge
                  lastVerifiedAt={sourceInfo.source.lastVerifiedAt}
                  status={sourceInfo.source.lastRefreshStatus}
                />
              )}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {sourceInfo?.found && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRefresh}
                disabled={refreshMutation.isPending}
                title="Check Latest"
              >
                <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-5 w-5" />
            </Button>
          </div>
        </div>

        <div className="px-6">
          <Section title="Attorney Information" icon={Scale}>
            <Field label="Full Name" value={lawyer.full_name} />
            <Field label="Bar Number" value={lawyer.bar_number} />
            <Field label="State" value={lawyer.state_abbr} />
            <Field label="Status" value={lawyer.bar_status} />
          </Section>

          <Section title="Admission" icon={Calendar}>
            <Field label="Year Admitted" value={lawyer.year_admitted} />
          </Section>

          <Section title="Education" icon={GraduationCap}>
            <Field label="Law School" value={lawyer.law_school} />
          </Section>

          <Section title="Practice" icon={User}>
            <Field label="Firm" value={lawyer.firm_name} />
          </Section>

          <Section title="Location" icon={MapPin}>
            <Field label="City" value={lawyer.city} />
            <Field label="State" value={lawyer.state} />
            <Field label="County" value={lawyer.county} />
          </Section>

          {lawyer.phone && (
            <Section title="Contact" icon={Phone}>
              <Field label="Phone" value={lawyer.phone} />
            </Section>
          )}

          {/* Change Report */}
          {refreshResult && refreshResult.diff.length > 0 && (
            <div className="py-4 border-b border-border">
              <ChangeReport
                diff={refreshResult.diff}
                onAcceptAll={() => {}}
                accepting={acceptMutation.isPending}
              />
            </div>
          )}
          {refreshResult && refreshResult.diff.length === 0 && refreshResult.status === 'unchanged' && (
            <div className="py-4 border-b border-border text-center text-xs text-emerald-600 dark:text-emerald-400">
              Data is up to date — no changes detected
            </div>
          )}

          {lawyer.integra_lawyer_id && (
            <div className="py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Integra Lawyer ID</h3>
              <code className="text-xs font-mono text-muted-foreground break-all block bg-muted/50 rounded px-3 py-2">
                {lawyer.integra_lawyer_id}
              </code>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
