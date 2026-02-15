'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TabletSmartphone } from 'lucide-react';
import { MirorIcon } from '@/components/common/miror-logo';
import { TaglineH2 } from '@/components/common/tagline-h2';
import { PageHeaderBar } from '@/components/layout/page-header-bar';
import { QuickStart } from './quick-start';
import { WebsitePreview } from './website-preview';

export function StudySetupWizard() {
  const searchParams = useSearchParams();
  const [quickStartUrl, setQuickStartUrl] = useState(searchParams.get('url') ?? '');
  const trimmedUrl = quickStartUrl.trim();
  const previewUrl = trimmedUrl
    ? (trimmedUrl.startsWith('http') ? trimmedUrl : `https://${trimmedUrl}`)
    : '';
  const preSelectedPersonaIds = searchParams.get('personas')?.split(',').filter(Boolean) ?? [];

  return (
    <div>
      <PageHeaderBar
        icon={TabletSmartphone}
        title="New test"
        chips={[
          { label: 'Est. runtime', value: '0 min', tooltip: 'Start a test to see the estimated runtime' },
          { label: 'Est. cost', value: '$0.00', tooltip: 'Start a test to see the estimated cost' },
        ]}
      />

      <div className="px-[100px] pt-[40px] pb-[100px]">
        <h1 className="flex items-center gap-2.5 text-3xl tracking-tight" style={{ fontFamily: '"Red Hat Display", sans-serif', fontWeight: 500 }}>
          <MirorIcon size={28} />
          <span>miror</span>
        </h1>
        <div className="mt-2">
          <TaglineH2 />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[440px_1fr] items-start gap-4 pt-6">
          {/* Left column — QuickStart */}
          <div className="flex flex-col gap-4">
            <QuickStart
              initialUrl={searchParams.get('url') ?? ''}
              initialDescription={searchParams.get('description') ?? ''}
              preSelectedPersonaIds={preSelectedPersonaIds.length > 0 ? preSelectedPersonaIds : undefined}
              onUrlChange={setQuickStartUrl}
            />
          </div>

          {/* Right column — browser preview */}
          <div className="hidden lg:block">
            <WebsitePreview
              url={previewUrl}
              onUrlChange={(u) => setQuickStartUrl(u)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
