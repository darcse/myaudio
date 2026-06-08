import type { Metadata } from "next";
import { Toaster } from "sonner";
import { Navigation } from "@/components/Navigation";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyAudio",
  description: "개인 음악·헤드파이 라이브러리",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var m=localStorage.getItem('theme-mode');var r=document.documentElement;r.classList.remove('theme-light','theme-dark');if(m==='light')r.classList.add('theme-light');else if(m==='dark')r.classList.add('theme-dark');}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen font-sans antialiased transition-colors duration-300">
        <Navigation />
        {children}
        <Toaster position="top-center" richColors closeButton />
      </body>
    </html>
  );
}
