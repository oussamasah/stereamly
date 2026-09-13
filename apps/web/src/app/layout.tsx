import './globals.css';
export const metadata = { title: 'Streamly — Movies, live TV and sports', description: 'Discover movies, series, live channels and sports with Streamly.' };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning><body>{children}</body></html>;
}
