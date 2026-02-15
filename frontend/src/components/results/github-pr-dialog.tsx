'use client';

import { useState, useEffect, useCallback } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  GitBranch,
  ExternalLink,
  Loader2,
  Check,
  AlertCircle,
  Copy,
  Info,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { SeverityBadge } from '@/components/common/severity-badge';
import * as api from '@/lib/api-client';
import type { FixSuggestionOut, GitHubPRResponse } from '@/types';

type DialogStep = 'connect' | 'select' | 'creating' | 'success' | 'error';

const STORAGE_KEY_REPO = 'mirror:github:repo';
const STORAGE_KEY_TOKEN = 'mirror:github:token';

const PROGRESS_STEPS = [
  'Validating repository access...',
  'Creating branch...',
  'Committing fix files...',
  'Opening pull request...',
];

interface GitHubPRDialogProps {
  studyId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GitHubPRDialog({ studyId, open, onOpenChange }: GitHubPRDialogProps) {
  const [step, setStep] = useState<DialogStep>('connect');
  const [repo, setRepo] = useState('');
  const [token, setToken] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [progressIdx, setProgressIdx] = useState(0);
  const [prResult, setPrResult] = useState<GitHubPRResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);

  // Load fixes for the study
  const { data: fixes } = useQuery({
    queryKey: ['fixes', studyId],
    queryFn: () => api.listFixes(studyId),
    enabled: open,
  });

  // Restore saved values on open
  useEffect(() => {
    if (open) {
      setStep('connect');
      setPrResult(null);
      setErrorMsg('');
      setProgressIdx(0);
      setCopied(false);
      const savedRepo = localStorage.getItem(STORAGE_KEY_REPO) ?? '';
      const savedToken = localStorage.getItem(STORAGE_KEY_TOKEN) ?? '';
      setRepo(savedRepo);
      setToken(savedToken);
    }
  }, [open]);

  // Pre-select critical + major issues when fixes load
  useEffect(() => {
    if (fixes?.length) {
      const defaults = new Set(
        fixes
          .filter((f) => f.fix_code && (f.severity === 'critical' || f.severity === 'major'))
          .map((f) => f.issue_id),
      );
      // If no critical/major, select all with fix code
      if (defaults.size === 0) {
        fixes.forEach((f) => {
          if (f.fix_code) defaults.add(f.issue_id);
        });
      }
      setSelectedIds(defaults);
    }
  }, [fixes]);

  const mutation = useMutation({
    mutationFn: (data: { repo: string; token: string; issueIds: string[] }) =>
      api.createGitHubPR(studyId, {
        repo: data.repo,
        token: data.token,
        issue_ids: data.issueIds,
      }),
    onSuccess: (result) => {
      setPrResult(result);
      setStep('success');
    },
    onError: (err: Error) => {
      setErrorMsg(err.message || 'Failed to create PR');
      setStep('error');
    },
  });

  // Simulate progress steps while mutation runs
  useEffect(() => {
    if (step !== 'creating') return;
    setProgressIdx(0);
    const interval = setInterval(() => {
      setProgressIdx((prev) => (prev < PROGRESS_STEPS.length - 1 ? prev + 1 : prev));
    }, 1500);
    return () => clearInterval(interval);
  }, [step]);

  const handleConnect = useCallback(() => {
    // Save to localStorage
    localStorage.setItem(STORAGE_KEY_REPO, repo);
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
    setStep('select');
  }, [repo, token]);

  const handleCreatePR = useCallback(() => {
    setStep('creating');
    mutation.mutate({
      repo,
      token,
      issueIds: Array.from(selectedIds),
    });
  }, [repo, token, selectedIds, mutation]);

  const toggleIssue = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!fixes) return;
    const allIds = fixes.filter((f) => f.fix_code).map((f) => f.issue_id);
    setSelectedIds(new Set(allIds));
  }, [fixes]);

  const selectNone = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleCopyUrl = useCallback(async () => {
    if (prResult?.pr_url) {
      await navigator.clipboard.writeText(prResult.pr_url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [prResult]);

  const fixesWithCode = fixes?.filter((f) => f.fix_code) ?? [];
  const isRepoValid = /^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(repo);
  const isTokenValid = token.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {step === 'connect' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Open PR on GitHub
              </DialogTitle>
              <DialogDescription>
                Ship AI-generated UX fixes directly to your repository as a pull request.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="repo">Repository</Label>
                <Input
                  id="repo"
                  placeholder="owner/repo"
                  value={repo}
                  onChange={(e) => setRepo(e.target.value)}
                />
                {repo && !isRepoValid && (
                  <p className="text-xs text-destructive">
                    Use owner/repo format (e.g. acme/website)
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="token">GitHub Token</Label>
                <Input
                  id="token"
                  type="password"
                  placeholder="ghp_... or github_pat_..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                />
                <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="mt-0.5 h-3 w-3 shrink-0" />
                  <span>
                    Needs <code className="rounded bg-muted px-1">repo</code> scope.{' '}
                    <a
                      href="https://github.com/settings/tokens/new?scopes=repo&description=Mirror+UX+Fixes"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline hover:text-foreground"
                    >
                      Create one here
                    </a>
                  </span>
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={handleConnect}
                disabled={!isRepoValid || !isTokenValid}
              >
                Continue
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>Select Fixes to Ship</DialogTitle>
              <DialogDescription>
                {fixesWithCode.length} fix{fixesWithCode.length !== 1 ? 'es' : ''} available.
                Critical and major issues are selected by default.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1 py-2">
              <div className="mb-3 flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={selectAll} className="h-7 px-2 text-xs">
                  Select all
                </Button>
                <Button variant="ghost" size="sm" onClick={selectNone} className="h-7 px-2 text-xs">
                  Select none
                </Button>
                <span className="ml-auto text-xs text-muted-foreground">
                  {selectedIds.size} selected
                </span>
              </div>
              <div className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {fixesWithCode.map((fix) => (
                  <IssueSelectRow
                    key={fix.issue_id}
                    fix={fix}
                    checked={selectedIds.has(fix.issue_id)}
                    onToggle={() => toggleIssue(fix.issue_id)}
                  />
                ))}
                {fixesWithCode.length === 0 && (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    No fixes with code available. Generate fixes first.
                  </p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('connect')}>
                Back
              </Button>
              <Button
                onClick={handleCreatePR}
                disabled={selectedIds.size === 0}
              >
                <GitBranch className="mr-2 h-4 w-4" />
                Create PR ({selectedIds.size} fix{selectedIds.size !== 1 ? 'es' : ''})
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'creating' && (
          <>
            <DialogHeader>
              <DialogTitle>Creating Pull Request...</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-6">
              {PROGRESS_STEPS.map((label, idx) => (
                <div key={label} className="flex items-center gap-3">
                  {idx < progressIdx ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : idx === progressIdx ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border border-muted" />
                  )}
                  <span
                    className={
                      idx <= progressIdx ? 'text-sm' : 'text-sm text-muted-foreground'
                    }
                  >
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}

        {step === 'success' && prResult && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <Check className="h-5 w-5" />
                PR Created
              </DialogTitle>
              <DialogDescription>
                {prResult.fixes_included} fix{prResult.fixes_included !== 1 ? 'es' : ''} shipped
                to <code className="rounded bg-muted px-1">{repo}</code>
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="rounded-lg border p-3">
                <p className="mb-1 text-sm font-medium">
                  PR #{prResult.pr_number}
                </p>
                <p className="mb-2 text-xs text-muted-foreground">
                  Branch: <code>{prResult.branch_name}</code>
                </p>
                <div className="flex flex-wrap gap-1">
                  {prResult.files_created.map((f) => (
                    <Badge key={f} variant="outline" className="text-xs">
                      {f}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={handleCopyUrl}>
                {copied ? (
                  <><Check className="mr-1.5 h-3.5 w-3.5" />Copied</>
                ) : (
                  <><Copy className="mr-1.5 h-3.5 w-3.5" />Copy URL</>
                )}
              </Button>
              <Button asChild>
                <a href={prResult.pr_url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View PR on GitHub
                </a>
              </Button>
            </DialogFooter>
          </>
        )}

        {step === 'error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Failed to Create PR
              </DialogTitle>
            </DialogHeader>
            <div className="py-2">
              <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                {errorMsg}
              </p>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep('connect')}>
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function IssueSelectRow({
  fix,
  checked,
  onToggle,
}: {
  fix: FixSuggestionOut;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2 transition-colors hover:bg-muted/50">
      <Checkbox
        checked={checked}
        onCheckedChange={onToggle}
        className="mt-0.5"
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={fix.severity} />
          {fix.fix_language && (
            <Badge variant="outline" className="text-xs">
              {fix.fix_language}
            </Badge>
          )}
        </div>
        <p className="mt-0.5 truncate text-sm">{fix.description}</p>
        {fix.element && (
          <code className="text-xs text-muted-foreground">{fix.element}</code>
        )}
      </div>
    </label>
  );
}
