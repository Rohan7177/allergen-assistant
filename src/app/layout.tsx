// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        Ensures that the html, body, and the Next.js root div (__next)
        all take up the full height of the viewport.
      */}
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #__next {
            height: 100%;
            width: 100%; /* Ensure full width as well */
            margin: 0;
            padding: 0;
            /* Do NOT use overflow: hidden here; let the inner ScrollView handle it */
          }
        `}} />
      </head>
      <body className={inter.className} style={{ height: '100%', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
