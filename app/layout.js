import "./globals.css";

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
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400..800&family=Unbounded:wght@500;700&display=swap"
          rel="stylesheet"
        />
      </head>
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
