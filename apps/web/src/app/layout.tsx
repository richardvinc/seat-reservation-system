import './global.css';

export const metadata = {
  title: 'Seat Reservation System',
  description: 'Seat reservation simulation system',
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
