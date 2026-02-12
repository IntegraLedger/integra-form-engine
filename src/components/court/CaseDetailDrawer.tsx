import { useState } from 'react';
import { X, Scale, User, Gavel, Calendar, MapPin, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { ChangeReport, type FieldChange } from '@/components/ui/change-report';
import { useRecordSource, useRefreshRecord, useAcceptChanges } from '@/hooks/use-refresh';
import { formatDate } from '@/utils/formatters';

interface CaseRecord {
  id: number;
  integra_court_id: string;
  court_code: string;
  jurisdiction: string;
  court_level: string;
  case_number: string;
  case_type: string;
  case_subtype: string | null;
  nature_of_suit: string | null;
  case_name: string | null;
  date_filed: string | null;
  date_terminated: string | null;
  disposition: string | null;
  plaintiff: string | null;
  defendant: string | null;
  judge: string | null;
  state_abbr: string | null;
  county_name: string | null;
  source_type: string;
  source_url: string | null;
  source_case_id: string | null;
  created_at: string;
}

interface CaseDetailDrawerProps {
  caseRecord: CaseRecord | null;
  onClose: () => void;
}

const CASE_TYPE_VARIANT: Record<string, string> = {
  civil: 'info',
  criminal: 'failed',
  family: 'active',
  bankruptcy: 'pending',
  probate: 'secondary',
  small_claims: 'completed',
  appellate: 'running',
};

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

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value || '-'}</span>
    </div>
  );
}

export function CaseDetailDrawer({ caseRecord, onClose }: CaseDetailDrawerProps) {
  if (!caseRecord) return null;

  const { data: sourceInfo } = useRecordSource('courts', caseRecord.id);
  const refreshMutation = useRefreshRecord();
  const acceptMutation = useAcceptChanges();
  const [refreshResult, setRefreshResult] = useState<{ diff: FieldChange[]; status: string } | null>(null);

  const handleRefresh = async () => {
    const result = await refreshMutation.mutateAsync({ registry: 'courts', recordId: caseRecord.id });
    setRefreshResult(result);
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 z-40 transition-opacity"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full w-full max-w-lg bg-background border-l border-border z-50 overflow-y-auto shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 bg-background/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-lg font-bold truncate" title={caseRecord.case_name ?? ''}>
              {caseRecord.case_name || caseRecord.case_number}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={CASE_TYPE_VARIANT[caseRecord.case_type] as never ?? 'secondary'} className="text-xs capitalize">
                {caseRecord.case_type}
              </Badge>
              <span className="text-xs text-muted-foreground">{caseRecord.court_code}</span>
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

        {/* Body */}
        <div className="px-6">
          <Section title="Case Information" icon={Scale}>
            <Field label="Case Number" value={caseRecord.case_number} />
            <Field label="Case Name" value={caseRecord.case_name} />
            <Field label="Type" value={caseRecord.case_type} />
            {caseRecord.case_subtype && <Field label="Subtype" value={caseRecord.case_subtype} />}
            {caseRecord.nature_of_suit && <Field label="Nature of Suit" value={caseRecord.nature_of_suit} />}
            <Field label="Disposition" value={caseRecord.disposition} />
          </Section>

          <Section title="Parties" icon={User}>
            <Field label="Plaintiff" value={caseRecord.plaintiff} />
            <Field label="Defendant" value={caseRecord.defendant} />
          </Section>

          <Section title="Court & Judge" icon={Gavel}>
            <Field label="Court" value={caseRecord.court_code} />
            <Field label="Jurisdiction" value={caseRecord.jurisdiction} />
            <Field label="Level" value={caseRecord.court_level} />
            <Field label="Judge" value={caseRecord.judge} />
          </Section>

          <Section title="Dates" icon={Calendar}>
            <Field label="Filed" value={formatDate(caseRecord.date_filed)} />
            <Field label="Terminated" value={formatDate(caseRecord.date_terminated)} />
          </Section>

          <Section title="Location" icon={MapPin}>
            <Field label="State" value={caseRecord.state_abbr} />
            <Field label="County" value={caseRecord.county_name} />
          </Section>

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

          {/* Integra ID */}
          <div className="py-4 border-b border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Integra Court ID</h3>
            <code className="text-xs font-mono text-muted-foreground break-all block bg-muted/50 rounded px-3 py-2">
              {caseRecord.integra_court_id}
            </code>
          </div>

          {/* Source */}
          {caseRecord.source_url && (
            <div className="py-4">
              <a
                href={caseRecord.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
              >
                <ExternalLink className="h-4 w-4" />
                View Original Source
              </a>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
