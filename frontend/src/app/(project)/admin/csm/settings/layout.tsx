'use client';

import CsmSettingsSidebar from '@/components/csm-settings/CsmSettingsSidebar';
import { useProjectIdFromUrl } from '@/components/csm-settings/useProjectIdFromUrl';

export default function CsmSettingsLayout({ children }: { children: React.ReactNode }) {
  const { projectId, projectValid } = useProjectIdFromUrl();

  return (
    <div className="flex min-h-[calc(100vh-3rem)] flex-1 bg-white">
      {projectValid && <CsmSettingsSidebar projectId={projectId} />}
      <div className="min-w-0 flex-1 bg-white">{children}</div>
    </div>
  );
}
