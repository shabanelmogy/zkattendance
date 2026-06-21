import './globals.css';
import './datepicker.css';
import { ThemeProvider } from '@/components/ThemeProvider';
import { I18nProvider } from '@/components/I18nProvider';

export const metadata = {
  title: 'ZK Attendance | HR Dashboard',
  description: 'ZK Teco attendance management system — real-time employee attendance tracking, reports, and analytics.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Prevent flash of wrong theme — runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('zk-theme')||'dark';document.documentElement.setAttribute('data-theme',t);})();`,
          }}
        />
      </head>
      <body>
        <I18nProvider>
          <ThemeProvider>
            {children}
          </ThemeProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
