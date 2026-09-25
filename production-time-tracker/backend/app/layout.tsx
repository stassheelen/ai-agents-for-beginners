import type { ReactNode } from "react";

export const metadata = {
  title: "Фіксатор часу — API",
  description: "API для Android-додатка фіксації часу виробництва",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="uk">
      <body style={{ margin: 0, fontFamily: "system-ui, -apple-system, sans-serif", background: "#f5f5f7", color: "#1d1d1f" }}>
        {children}
      </body>
    </html>
  );
}
