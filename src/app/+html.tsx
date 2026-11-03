import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#000000" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: `html,body,#root{width:100%;min-height:100%;margin:0;padding:0;}body{overflow-x:hidden;-webkit-text-size-adjust:100%;text-rendering:optimizeLegibility;}` }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
