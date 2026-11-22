import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Existing Custom Title",
  openGraph: {
    title: "Existing OG Title",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
