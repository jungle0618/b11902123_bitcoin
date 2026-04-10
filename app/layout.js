import './global.css';

export const metadata = {
  title: 'DAT.co 指標追蹤器',
  description: '監控和視覺化 DAT.co 財務指標',
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta charSet="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}