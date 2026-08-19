import "./globals.css";
// import 'highlight.js/styles/atom-one-dark.min.css';
import { AppProviders } from '../components/providers/AppProviders';

export const metadata = {
  title: "Ticket Form Builder",
  description: "Auth + dashboard + CSM ticket form builder, extracted from mediaJira",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Outfit:wght@600;700&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
