'use client'

import { NotionRenderer } from 'react-notion-x'

export default function NotionContent({ recordMap }) {
  return (
    <NotionRenderer
      recordMap={recordMap}
      fullPage={false}
      darkMode={true}
      disableHeader={true}
      className="wiki-notion"
    />
  )
}
