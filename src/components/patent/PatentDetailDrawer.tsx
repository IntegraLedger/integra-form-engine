import { useState } from 'react';
import { X, Lightbulb, User, Calendar, FileText, ExternalLink, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FreshnessBadge } from '@/components/ui/freshness-badge';
import { ChangeReport, type FieldChange } from '@/components/ui/change-report';
import { useRecordSource, useRefreshRecord, useAcceptChanges } from '@/hooks/use-refresh';
import { formatDate } from '@/utils/formatters';

interface PatentRecord {
  patent_id: string;
  patent_type: string;
  patent_date: string | null;
  patent_title: string | null;
  wipo_kind: string | null;
  num_claims: number | null;
  withdrawn: boolean | null;
  assignee_name: string | null;
  assignee_type: string | null;
  integra_patent_id: string | null;
  id?: number;
}

interface PatentDetailDrawerProps {
  patent: PatentRecord | null;
  onClose: () => void;
}

const TYPE_VARIANT: Record<string, string> = {
  utility: 'secondary',
  design: 'secondary',
  plant: 'active',
  reissue: 'pending',
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

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="flex justify-between items-start py-1.5">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium text-right max-w-[60%] break-words">{value ?? '-'}</span>
    </div>
  );
}

export function PatentDetailDrawer({ patent, onClose }: PatentDetailDrawerProps) {
  if (!patent) return null;

  const recordId = patent.id ?? (Number(patent.patent_id) || null);
  const { data: sourceInfo } = useRecordSource('patents', recordId);
  const refreshMutation = useRefreshRecord();
  const acceptMutation = useAcceptChanges();
  const [refreshResult, setRefreshResult] = useState<{ diff: FieldChange[]; status: string } | null>(null);

  const handleRefresh = async () => {
    if (!recordId) return;
    const result = await refreshMutation.mutateAsync({ registry: 'patents', recordId });
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
            <p className="text-lg font-bold" title={patent.patent_title ?? ''}>
              {patent.patent_title || patent.patent_id}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={TYPE_VARIANT[patent.patent_type] as never ?? 'secondary'} className="text-xs capitalize">
                {patent.patent_type}
              </Badge>
              <span className="text-xs font-mono text-muted-foreground">{patent.patent_id}</span>
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
          <Section title="Patent Information" icon={Lightbulb}>
            <Field label="Patent Number" value={patent.patent_id} />
            <Field label="Title" value={patent.patent_title} />
            <Field label="Type" value={patent.patent_type} />
            {patent.wipo_kind && <Field label="WIPO Kind" value={patent.wipo_kind} />}
            <Field label="Withdrawn" value={patent.withdrawn ? 'Yes' : 'No'} />
          </Section>

          <Section title="Claims" icon={FileText}>
            <Field label="Number of Claims" value={patent.num_claims} />
          </Section>

          <Section title="Assignee" icon={User}>
            <Field label="Name" value={patent.assignee_name} />
            {patent.assignee_type && <Field label="Type" value={patent.assignee_type} />}
          </Section>

          <Section title="Dates" icon={Calendar}>
            <Field label="Grant Date" value={formatDate(patent.patent_date)} />
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
          {patent.integra_patent_id && (
            <div className="py-4 border-b border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Integra Patent ID</h3>
              <code className="text-xs font-mono text-muted-foreground break-all block bg-muted/50 rounded px-3 py-2">
                {patent.integra_patent_id}
              </code>
            </div>
          )}

          {/* USPTO Link */}
          <div className="py-4">
            <a
              href={`https://patents.google.com/patent/US${patent.patent_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              <ExternalLink className="h-4 w-4" />
              View on Google Patents
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
