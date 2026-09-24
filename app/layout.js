import 'react-notion-x/src/styles.css'
import './globals.css'

export const metadata = {
  title: '서버 위키',
  description: '공개 Notion 기반 자동 동기화 서버 위키'
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
