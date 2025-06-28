// src/app/layout.tsx
import { Inter } from 'next/font/google';
// We need to import the Image component here if it's used globally or if layout needs it
// import Image from 'next/image'; // Uncomment if Image is needed in layout directly

// Initialize the Inter font for global use
const inter = Inter({ subsets: ['latin'] });

// RootLayout component for your application
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/*
        This style block ensures that the html, body, and the Next.js root div (__next)
        all take up the full height of the viewport. This is crucial for
        flexbox layouts to work correctly for full-screen applications.
      */}
      <head>
        <style dangerouslySetInnerHTML={{ __html: `
          html, body, #__next {
            height: 100%;
            margin: 0;
            padding: 0;
            overflow: hidden; /* Prevent body scrolling, let the chatArea handle it */
          }
        `}} />
      </head>
      <body className={inter.className} style={{ height: '100%', margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
