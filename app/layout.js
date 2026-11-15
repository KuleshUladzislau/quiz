import { Manrope, Unbounded } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["cyrillic", "latin"],
  variable: "--font-body",
  display: "swap",
});

const unbounded = Unbounded({
  subsets: ["cyrillic", "latin"],
  weight: ["500", "700"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = {
  title: "Квиз",
  description: "Короткий опрос",
  referrer: "origin",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#f3eee4",
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru" className={`${manrope.variable} ${unbounded.variable}`}>
      <body>
        {children}
        <noscript>
          <main className="app">
            <p className="eyebrow">Квиз</p>
            <h1>Нужен JavaScript</h1>
            <p className="lead">Включите его в браузере, иначе опрос не откроется.</p>
          </main>
        </noscript>
      </body>
    </html>
  );
}
