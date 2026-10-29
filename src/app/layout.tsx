import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SovereignClaw — Personal AI OS · NVIDIA × Nebius",
  description:
    "Private personal assistant with persistent local memory, opt-in Python tools, and NVIDIA model inference on Nebius Token Factory.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="light"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <head>
        {/* Inline script: apply saved theme before first paint to avoid flash */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("sc-theme");if(t)document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
