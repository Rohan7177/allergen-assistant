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
