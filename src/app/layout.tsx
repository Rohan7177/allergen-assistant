// src/app/layout.tsx
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Allergen Assistant',
  description: 'Find allergen-friendly dishes and alternatives.',
};

const fontHref = 'https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="stylesheet" href={fontHref} />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          html, body {
            height: 100%;
            min-height: 100dvh;
            width: 100%;
            margin: 0;
            padding: 0;
          }

          body {
            display: flex;
            flex-direction: column;
          }

          #__next {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: inherit;
            width: 100%;
            /* Do NOT use overflow: hidden here; let the inner ScrollView handle it */
          }
        `,
          }}
        />
      </head>
      <body
        className={inter.className}
        style={{
          height: '100%',
          minHeight: '100dvh',
          width: '100%',
          margin: 0,
          padding: 0,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {children}
      </body>
    </html>
  );
}
