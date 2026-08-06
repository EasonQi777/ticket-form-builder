/**
 * Trimmed-down replacement for mediaJira's (project) layout.
 *
 * The original wrapped every page in a `DashboardPanelPreferenceProvider`
 * tied to the upcoming-meetings side panel, which isn't part of this
 * extracted project (see README "Known simplifications" and the rewritten
 * `DashboardLayout` in src/components/dashboard/DashboardLayout.tsx). Pages
 * under this route group handle their own auth guarding (see
 * `components/auth/ProtectedRoute`) and project scoping (`lib/projectStore`),
 * so no additional context is needed here.
 */
export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
