import { Component, type ReactNode } from 'react';

import { ErrorPage } from '@/widgets/error-page';
import type { Locale } from '@/shared/locale/content';

type AppErrorBoundaryProps = { locale: Locale; children: ReactNode };

/** Shows the 500 page instead of a blank screen when rendering throws. */
export class AppErrorBoundary extends Component<AppErrorBoundaryProps, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <ErrorPage
        code={500}
        locale={this.props.locale}
        onRetry={() => window.location.reload()}
        onHome={() => window.location.assign('/')}
      />
    );
  }
}
