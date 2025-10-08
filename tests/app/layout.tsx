// tests/app/layout.tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Nostr Framework Tests',
  description: 'React/Next.js Tests für das Nostr Framework',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="de">
      <body>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          padding: '20px',
          fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
        }}>
          <header style={{ 
            marginBottom: '40px',
            paddingBottom: '20px', 
            borderBottom: '2px solid #dee2e6'
          }}>
            <h1 style={{ color: '#007bff', margin: 0 }}>
              🧪 Nostr Framework Test Suite
            </h1>
            <p style={{ color: '#6c757d', margin: '10px 0 0 0' }}>
              React/Next.js kompatible Tests für alle Framework-Komponenten
            </p>
          </header>
          
          <main>{children}</main>
          
          <footer style={{ 
            marginTop: '40px', 
            paddingTop: '20px',
            borderTop: '1px solid #dee2e6',
            color: '#6c757d',
            textAlign: 'center' as const
          }}>
            <p>Nostr Framework v1.1.7 | TypeScript Migration Complete</p>
          </footer>
        </div>
      </body>
    </html>
  )
}