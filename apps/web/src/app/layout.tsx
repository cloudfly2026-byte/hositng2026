import * as React from 'react';
import type { Metadata } from 'next';
import ThemeRegistry from '../theme/ThemeRegistry';
import { AppShell } from '../components/AppShell';

export const metadata: Metadata = {
  title: 'Velupi Cloud Platform — Portal de Clientes',
  description: 'Plataforma SaaS comercial de Hosting, VPS, Microservicios y Cloud administrado.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, padding: 0, backgroundColor: '#090d16' }}>
        <ThemeRegistry>
          <AppShell>{children}</AppShell>
        </ThemeRegistry>
      </body>
    </html>
  );
}
