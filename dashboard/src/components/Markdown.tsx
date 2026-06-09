interface Props {
  text: string
}

export function Markdown({ text }: Props) {
  if (!text) return null

  const parts: React.ReactNode[] = []
  let i = 0

  while (i < text.length) {
    // Link: [text](url)
    const linkMatch = text.slice(i).match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      parts.push(
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--sol-blue)", textDecoration: "underline" }}
        >
          {linkMatch[1]}
        </a>
      )
      i += linkMatch[0].length
      continue
    }

    // Bold: **text**
    const boldMatch = text.slice(i).match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      parts.push(
        <strong key={i} style={{ fontWeight: 700 }}>
          {boldMatch[1]}
        </strong>
      )
      i += boldMatch[0].length
      continue
    }

    // Italic: *text*
    const italicMatch = text.slice(i).match(/^\*([^*]+)\*/)
    if (italicMatch) {
      parts.push(
        <em key={i} style={{ fontStyle: "italic" }}>
          {italicMatch[1]}
        </em>
      )
      i += italicMatch[0].length
      continue
    }

    // Line break
    if (text[i] === "\n") {
      parts.push(<br key={i} />)
      i++
      continue
    }

    // Collect plain text until next special char
    let plain = ""
    while (i < text.length && text[i] !== "*" && text[i] !== "[" && text[i] !== "\n") {
      plain += text[i]
      i++
    }
    if (plain) {
      parts.push(plain)
    }
  }

  return <>{parts}</>
}
