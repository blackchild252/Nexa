import React from 'react';

/**
 * Keeps a failing ad from taking the whole Yaayz screen down (V5.99.43 / B289).
 * If anything inside throws while rendering, the ad slot simply renders nothing.
 */
export class YaayzAdBoundary extends React.Component<{ children?: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* ad failures are not shown to the user */ }
  render() { return this.state.failed ? null : this.props.children; }
}
