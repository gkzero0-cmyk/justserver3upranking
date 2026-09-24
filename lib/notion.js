import { unstable_cache } from 'next/cache'
import { NotionAPI } from 'notion-client'
import { getPageTitle, getPageTableOfContents, uuidToId } from 'notion-utils'

export const SOURCE_URL = 'https://daisy-grouse-ac0.notion.site/3dad57d6a55c80469f3de9730cb88975'
export const PAGE_ID = '3dad57d6a55c80469f3de9730cb88975'

const notion = new NotionAPI({
  userLocale: 'ko',
  userTimeZone: 'Asia/Seoul'
})

async function loadPage() {
  const recordMap = await notion.getPage(PAGE_ID)
  const target = uuidToId(PAGE_ID)
  const pageBlock = Object.values(recordMap.block)
    .map((entry) => entry && entry.value)
    .find((value) => value && value.type === 'page' && uuidToId(value.id) === target)

  const title = getPageTitle(recordMap) || '서버 위키'
  const toc = pageBlock
    ? getPageTableOfContents(pageBlock, recordMap)
        .filter((item) => item.text && item.text.trim())
        .map((item) => ({
          id: item.id,
          text: item.text,
          indentLevel: item.indentLevel
        }))
    : []

  return { recordMap, title, toc, syncedAt: new Date().toISOString() }
}

export const getWikiPage = unstable_cache(loadPage, ['public-notion-wiki-v1'], {
  revalidate: 300
})
