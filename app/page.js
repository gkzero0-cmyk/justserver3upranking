import NotionContent from '../components/notion-content'
import { getWikiPage, SOURCE_URL } from '../lib/notion'

export const revalidate = 300

function time(iso) {
  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Seoul'
  }).format(new Date(iso))
}

export async function generateMetadata() {
  try {
    const page = await getWikiPage()
    return {
      title: page.title + ' | Wiki',
      description: page.title + '의 가이드와 서버 정보를 한눈에 확인하세요.'
    }
  } catch {
    return { title: '서버 위키' }
  }
}

export default async function Home() {
  try {
    const page = await getWikiPage()

    return (
      <main id="top" className="shell">
        <aside className="side">
          <div className="brand">
            <span>LIVE GUIDE</span>
            <h1>{page.title}</h1>
            <p>Notion과 자동 동기화되는 독립형 위키</p>
          </div>

          <nav>
            <a className="home" href="#top">🏠 홈</a>
            {page.toc.map((item) => (
              <a
                key={item.id}
                href={'#' + item.id.replaceAll('-', '')}
                style={{ paddingLeft: 14 + Math.min(item.indentLevel, 2) * 12 }}
              >
                {item.text}
              </a>
            ))}
          </nav>

          <div className="sync">
            <i />
            <div>
              <b>Notion 동기화 정상</b>
              <small>{time(page.syncedAt)} 기준</small>
            </div>
          </div>
        </aside>

        <section className="content">
          <header>
            <div>
              <em>SERVER WIKI</em>
              <strong>{page.title}</strong>
            </div>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer">원본 Notion ↗</a>
          </header>

          <section className="hero">
            <span>PUBLIC NOTION · AUTO SYNC</span>
            <h2>{page.title}</h2>
            <p>규칙과 시스템을 빠르게 찾을 수 있도록 공개 Notion 원문을 위키형 인터페이스로 재구성했습니다.</p>
            <div>
              <b>🔎 빠른 목차</b>
              <b>📱 모바일 최적화</b>
              <b>♻️ 5분 자동 갱신</b>
            </div>
          </section>

          <article className="doc">
            <NotionContent recordMap={page.recordMap} />
          </article>
        </section>
      </main>
    )
  } catch (error) {
    console.error('Notion sync failed', error)
    return (
      <main className="error">
        <section>
          <span>↻</span>
          <p>SOURCE SYNC</p>
          <h1>Notion 원문 동기화를 기다리고 있습니다.</h1>
          <p>다음 요청에서 자동으로 다시 불러옵니다.</p>
          <a href={SOURCE_URL} target="_blank" rel="noreferrer">Notion 원문 열기 ↗</a>
        </section>
      </main>
    )
  }
}
