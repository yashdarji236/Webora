export async function generateMetadata() {
  return {
    title: "Dynamic Title",
  };
}

export default function DynamicLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
