export interface FormatEditResult {
  text: string;
  selectionStart: number;
  selectionEnd: number;
}

export interface ActiveFormatsState {
  bold: boolean;
  italic: boolean;
  strike: boolean;
  code: boolean;
  headingLevel: number;
  bullet: boolean;
  ordered: boolean;
  checkbox: boolean;
  quote: boolean;
}

const WORD_CHAR_RE = /[\p{L}\p{N}_-]/u;

function isWordChar(ch: string | undefined): boolean {
  return Boolean(ch && WORD_CHAR_RE.test(ch));
}

function getLineBounds(text: string, pos: number): { lineStart: number; lineEnd: number } {
  const lineStart = text.lastIndexOf('\n', Math.max(0, pos - 1)) + 1;
  const nextNl = text.indexOf('\n', pos);
  const lineEnd = nextNl === -1 ? text.length : nextNl;
  return { lineStart, lineEnd };
}

function getMultiLineSelection(
  text: string,
  start: number,
  end: number
): { blockStart: number; blockEnd: number; lines: string[]; lineStarts: number[] } {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));

  const blockStart = text.lastIndexOf('\n', Math.max(0, safeStart - 1)) + 1;
  let blockEndPos = safeEnd;
  if (safeEnd > safeStart && text[safeEnd - 1] === '\n') {
    blockEndPos = safeEnd - 1;
  }
  const nextNl = text.indexOf('\n', blockEndPos);
  const blockEnd = nextNl === -1 ? text.length : nextNl;

  const slice = text.slice(blockStart, blockEnd);
  const lines = slice.split('\n');
  const lineStarts: number[] = [];
  let cursor = blockStart;
  for (const line of lines) {
    lineStarts.push(cursor);
    cursor += line.length + 1;
  }

  return { blockStart, blockEnd, lines, lineStarts };
}

function getWordSpanAt(text: string, pos: number): { start: number; end: number } | null {
  let s = pos;
  let e = pos;
  const touchesLeft = pos > 0 && isWordChar(text[pos - 1]);
  const touchesRight = pos < text.length && isWordChar(text[pos]);
  if (!touchesLeft && !touchesRight) return null;

  while (s > 0 && isWordChar(text[s - 1])) s--;
  while (e < text.length && isWordChar(text[e])) e++;
  return { start: s, end: e };
}

function findEnclosingInlineSpan(
  line: string,
  relStart: number,
  relEnd: number,
  marker: '**' | '*' | '~~' | '`'
): { openIdx: number; closeIdx: number } | null {
  const mLen = marker.length;

  const isMarkerAt = (idx: number): boolean => {
    if (idx < 0 || idx + mLen > line.length) return false;
    if (line.slice(idx, idx + mLen) !== marker) return false;
    if (marker === '*') {
      // Distinguish single * from ** unless it's ***
      const prevStar = idx > 0 && line[idx - 1] === '*';
      const nextStar = idx + 1 < line.length && line[idx + 1] === '*';
      if (prevStar !== nextStar) return false; // part of **
      if (prevStar && nextStar) {
        // Check if triple star ***
        return true;
      }
    }
    return true;
  };

  // Search backward from relStart for candidate opener
  let openIdx = -1;
  for (let i = Math.min(relStart, line.length - mLen); i >= 0; i--) {
    if (isMarkerAt(i)) {
      // If i equals relStart, make sure it's immediately before or empty pair
      openIdx = i;
      break;
    }
  }
  if (openIdx === -1) return null;

  // Search forward from max(relEnd, openIdx + mLen) for candidate closer
  let closeIdx = -1;
  for (let i = Math.max(relEnd, openIdx + mLen); i <= line.length - mLen; i++) {
    if (isMarkerAt(i)) {
      closeIdx = i;
      break;
    }
  }
  if (closeIdx === -1) return null;

  // Verify the opener actually precedes any closer that came before relStart
  // i.e., there isn't a closing pair in between openIdx + mLen and relStart
  const innerBefore = line.slice(openIdx + mLen, relStart);
  if (innerBefore.includes(marker)) {
    if (marker !== '*') return null;
  }

  return { openIdx, closeIdx };
}

/**
 * Obsidian-style inline format toggle:
 * - Selection present: unwraps if already wrapped inside/outside, else wraps cleanly (keeping surrounding spaces untouched).
 * - Collapsed caret inside formatted span: unwraps that span while keeping exact caret offset.
 * - Collapsed caret inside/touching a word: wraps that word while keeping caret at exact char inside word.
 * - Collapsed caret in blank space: inserts marker pair (e.g. **|**) with caret between markers, or removes empty pair if toggled again.
 */
export function toggleInlineFormat(
  text: string,
  start: number,
  end: number,
  marker: '**' | '*' | '~~' | '`'
): FormatEditResult {
  const mLen = marker.length;
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));

  // Case 1: Active non-empty selection
  if (safeStart < safeEnd) {
    const selected = text.slice(safeStart, safeEnd);

    // 1a. Already wrapped immediately outside selection
    if (
      safeStart >= mLen &&
      text.slice(safeStart - mLen, safeStart) === marker &&
      text.slice(safeEnd, safeEnd + mLen) === marker
    ) {
      const next =
        text.slice(0, safeStart - mLen) + selected + text.slice(safeEnd + mLen);
      return {
        text: next,
        selectionStart: safeStart - mLen,
        selectionEnd: safeEnd - mLen,
      };
    }

    // 1b. Selection itself includes wrapping markers
    if (
      selected.length >= mLen * 2 &&
      selected.startsWith(marker) &&
      selected.endsWith(marker)
    ) {
      const inner = selected.slice(mLen, selected.length - mLen);
      const next = text.slice(0, safeStart) + inner + text.slice(safeEnd);
      return {
        text: next,
        selectionStart: safeStart,
        selectionEnd: safeStart + inner.length,
      };
    }

    // 1c. Preserve leading/trailing spaces when wrapping
    const leadingMatch = selected.match(/^\s*/);
    const trailingMatch = selected.match(/\s*$/);
    const leadLen = leadingMatch ? leadingMatch[0].length : 0;
    const trailLen = trailingMatch ? trailingMatch[0].length : 0;
    const core = selected.slice(leadLen, selected.length - trailLen);

    if (core.length === 0) {
      const next = text.slice(0, safeStart) + marker + marker + text.slice(safeEnd);
      return {
        text: next,
        selectionStart: safeStart + mLen,
        selectionEnd: safeStart + mLen,
      };
    }

    const wrapStart = safeStart + leadLen;
    const wrapEnd = safeEnd - trailLen;
    const next =
      text.slice(0, wrapStart) +
      marker +
      core +
      marker +
      text.slice(wrapEnd);
    return {
      text: next,
      selectionStart: wrapStart + mLen,
      selectionEnd: wrapStart + mLen + core.length,
    };
  }

  // Case 2: Collapsed cursor (start === end)
  const { lineStart, lineEnd } = getLineBounds(text, safeStart);
  const line = text.slice(lineStart, lineEnd);
  const relPos = safeStart - lineStart;

  // 2a. Empty pair directly around cursor (**|**)
  if (
    relPos >= mLen &&
    line.slice(relPos - mLen, relPos) === marker &&
    line.slice(relPos, relPos + mLen) === marker
  ) {
    const absOpen = safeStart - mLen;
    const absClose = safeStart + mLen;
    return {
      text: text.slice(0, absOpen) + text.slice(absClose),
      selectionStart: absOpen,
      selectionEnd: absOpen,
    };
  }

  // 2b. Cursor inside an existing formatted span on the same line
  const enclosing = findEnclosingInlineSpan(line, relPos, relPos, marker);
  if (enclosing) {
    const absOpen = lineStart + enclosing.openIdx;
    const absClose = lineStart + enclosing.closeIdx;
    const inner = text.slice(absOpen + mLen, absClose);
    const next = text.slice(0, absOpen) + inner + text.slice(absClose + mLen);
    const nextCaret = Math.max(absOpen, safeStart - mLen);
    return {
      text: next,
      selectionStart: nextCaret,
      selectionEnd: nextCaret,
    };
  }

  // 2c. Cursor inside or touching a word -> wrap that word cleanly
  const wordSpan = getWordSpanAt(text, safeStart);
  if (wordSpan) {
    const word = text.slice(wordSpan.start, wordSpan.end);
    const next =
      text.slice(0, wordSpan.start) +
      marker +
      word +
      marker +
      text.slice(wordSpan.end);
    const nextCaret = safeStart + mLen;
    return {
      text: next,
      selectionStart: nextCaret,
      selectionEnd: nextCaret,
    };
  }

  // 2d. Empty/whitespace cursor -> insert marker pair with caret centered between markers
  const next = text.slice(0, safeStart) + marker + marker + text.slice(safeStart);
  return {
    text: next,
    selectionStart: safeStart + mLen,
    selectionEnd: safeStart + mLen,
  };
}

/**
 * Computes new selection bounds after replacing lines line-by-line cleanly.
 */
function applyLineTransform(
  text: string,
  start: number,
  end: number,
  transformLine: (line: string, index: number, allLines: string[]) => string
): FormatEditResult {
  const { blockStart, blockEnd, lines, lineStarts } = getMultiLineSelection(
    text,
    start,
    end
  );
  const nextLines = lines.map((line, i) => transformLine(line, i, lines));

  let nextStart = start;
  let nextEnd = end;

  for (let i = 0; i < lines.length; i++) {
    const origLineStart = lineStarts[i];
    const origLineEnd = origLineStart + lines[i].length;
    const delta = nextLines[i].length - lines[i].length;

    if (delta === 0) continue;

    // Prefix adjustment happens at start of line, or stripping heading/list prefix
    if (start >= origLineStart && start <= origLineEnd) {
      nextStart = Math.max(origLineStart, start + delta);
    } else if (start > origLineEnd) {
      nextStart += delta;
    }

    if (end >= origLineStart && end <= origLineEnd) {
      nextEnd = Math.max(origLineStart, end + delta);
    } else if (end > origLineEnd) {
      nextEnd += delta;
    }
  }

  const replaced = nextLines.join('\n');
  const nextText = text.slice(0, blockStart) + replaced + text.slice(blockEnd);

  return {
    text: nextText,
    selectionStart: Math.max(blockStart, Math.min(nextStart, blockStart + replaced.length)),
    selectionEnd: Math.max(
      Math.max(blockStart, Math.min(nextStart, blockStart + replaced.length)),
      Math.min(nextEnd, blockStart + replaced.length)
    ),
  };
}

const ANY_LIST_OR_QUOTE_PREFIX_RE = /^(\s*)(?:-\s\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+|>\s+|#{1,6}\s+)/;

/**
 * Obsidian-style bullet / ordered / quote line prefix toggle.
 */
export function toggleLinePrefix(
  text: string,
  start: number,
  end: number,
  kind: 'bullet' | 'ordered' | 'quote'
): FormatEditResult {
  const { lines } = getMultiLineSelection(text, start, end);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const targetLines = nonEmpty.length > 0 ? nonEmpty : lines;

  if (kind === 'bullet') {
    const allMatch = targetLines.every((l) => /^\s*[-*+]\s+(?!\[[ xX]\])/.test(l));
    return applyLineTransform(text, start, end, (line) => {
      if (nonEmpty.length > 0 && line.trim().length === 0) return line;
      if (allMatch) {
        return line.replace(/^(\s*)[-*+]\s+/, '$1');
      }
      if (ANY_LIST_OR_QUOTE_PREFIX_RE.test(line)) {
        return line.replace(ANY_LIST_OR_QUOTE_PREFIX_RE, '$1- ');
      }
      const indent = line.match(/^\s*/)?.[0] || '';
      return `${indent}- ${line.slice(indent.length)}`;
    });
  }

  if (kind === 'ordered') {
    const allMatch = targetLines.every((l) => /^\s*\d+\.\s+/.test(l));
    let counter = 1;
    return applyLineTransform(text, start, end, (line) => {
      if (nonEmpty.length > 0 && line.trim().length === 0) return line;
      if (allMatch) {
        return line.replace(/^(\s*)\d+\.\s+/, '$1');
      }
      const prefix = `${counter++}. `;
      if (ANY_LIST_OR_QUOTE_PREFIX_RE.test(line)) {
        return line.replace(ANY_LIST_OR_QUOTE_PREFIX_RE, `$1${prefix}`);
      }
      const indent = line.match(/^\s*/)?.[0] || '';
      return `${indent}${prefix}${line.slice(indent.length)}`;
    });
  }

  // kind === 'quote'
  const allMatch = targetLines.every((l) => /^\s*>\s?/.test(l));
  return applyLineTransform(text, start, end, (line) => {
    if (nonEmpty.length > 0 && line.trim().length === 0) return line;
    if (allMatch) {
      return line.replace(/^(\s*)>\s?/, '$1');
    }
    return `> ${line}`;
  });
}

/**
 * Obsidian checkbox toggle cycle:
 * plain / bullet -> - [ ]  -> - [x]  -> plain
 */
export function toggleCheckboxPrefix(
  text: string,
  start: number,
  end: number
): FormatEditResult {
  const { lines } = getMultiLineSelection(text, start, end);
  const nonEmpty = lines.filter((l) => l.trim().length > 0);
  const targetLines = nonEmpty.length > 0 ? nonEmpty : lines;

  const allUnchecked = targetLines.every((l) => /^\s*-\s\[ \]\s+/.test(l));
  const allChecked = targetLines.every((l) => /^\s*-\s\[[xX]\]\s+/.test(l));

  return applyLineTransform(text, start, end, (line) => {
    if (nonEmpty.length > 0 && line.trim().length === 0) return line;
    if (allChecked) {
      return line.replace(/^(\s*)-\s\[[xX]\]\s+/, '$1');
    }
    if (allUnchecked) {
      return line.replace(/^(\s*)-\s\[ \]\s+/, '$1- [x] ');
    }
    if (ANY_LIST_OR_QUOTE_PREFIX_RE.test(line)) {
      return line.replace(ANY_LIST_OR_QUOTE_PREFIX_RE, '$1- [ ] ');
    }
    const indent = line.match(/^\s*/)?.[0] || '';
    return `${indent}- [ ] ${line.slice(indent.length)}`;
  });
}

/**
 * Cycles heading level like Obsidian: plain -> ## -> ### -> #### -> # -> plain
 * Or toggles exact heading level when targetLevel is provided.
 */
export function cycleHeadingPrefix(
  text: string,
  start: number,
  end: number,
  targetLevel?: 1 | 2 | 3 | 4
): FormatEditResult {
  const { lines } = getMultiLineSelection(text, start, end);
  const firstNonEmpty = lines.find((l) => l.trim().length > 0) ?? lines[0] ?? '';
  const match = firstNonEmpty.match(/^(#{1,6})\s+/);
  const currentLevel = match ? match[1].length : 0;

  let nextPrefix = '';
  if (targetLevel) {
    nextPrefix = currentLevel === targetLevel ? '' : `${'#'.repeat(targetLevel)} `;
  } else {
    const cycleMap: Record<number, string> = {
      0: '## ',
      2: '### ',
      3: '#### ',
      4: '# ',
      1: '',
      5: '',
      6: '',
    };
    nextPrefix = cycleMap[currentLevel] ?? '## ';
  }

  return applyLineTransform(text, start, end, (line) => {
    if (lines.length > 1 && line.trim().length === 0) return line;
    const stripped = line.replace(/^#{1,6}\s+/, '');
    return `${nextPrefix}${stripped}`;
  });
}

/**
 * Indents (+2 spaces) or outdents (-2 spaces) selected line(s).
 */
export function indentSelection(
  text: string,
  start: number,
  end: number,
  direction: 1 | -1
): FormatEditResult {
  return applyLineTransform(text, start, end, (line) => {
    if (direction === 1) {
      return `  ${line}`;
    }
    if (line.startsWith('  ')) return line.slice(2);
    if (line.startsWith('\t')) return line.slice(1);
    if (line.startsWith(' ')) return line.slice(1);
    return line;
  });
}

/**
 * Inserts or wraps a Markdown link contextually at the cursor.
 */
export function insertSmartLink(
  text: string,
  start: number,
  end: number
): FormatEditResult {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));

  if (safeStart < safeEnd) {
    const selected = text.slice(safeStart, safeEnd).trim();
    if (/^https?:\/\/\S+$/i.test(selected)) {
      const replacement = `[](${selected})`;
      return {
        text: text.slice(0, safeStart) + replacement + text.slice(safeEnd),
        selectionStart: safeStart + 1,
        selectionEnd: safeStart + 1,
      };
    }
    const replacement = `[${selected}](https://)`;
    const urlStart = safeStart + selected.length + 3;
    return {
      text: text.slice(0, safeStart) + replacement + text.slice(safeEnd),
      selectionStart: urlStart,
      selectionEnd: urlStart + 'https://'.length,
    };
  }

  const wordSpan = getWordSpanAt(text, safeStart);
  if (wordSpan) {
    const word = text.slice(wordSpan.start, wordSpan.end);
    const replacement = `[${word}](https://)`;
    const urlStart = wordSpan.start + word.length + 3;
    return {
      text: text.slice(0, wordSpan.start) + replacement + text.slice(wordSpan.end),
      selectionStart: urlStart,
      selectionEnd: urlStart + 'https://'.length,
    };
  }

  const replacement = `[tiêu đề](https://)`;
  return {
    text: text.slice(0, safeStart) + replacement + text.slice(safeStart),
    selectionStart: safeStart + 1,
    selectionEnd: safeStart + 1 + 'tiêu đề'.length,
  };
}

/**
 * Inserts block elements cleanly on their own line without scrambling surrounding text.
 */
export function insertBlockElement(
  text: string,
  start: number,
  end: number,
  kind: 'codeblock' | 'table' | 'hr'
): FormatEditResult {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  const selected = text.slice(safeStart, safeEnd);

  const needsLeadingNewline = safeStart > 0 && text[safeStart - 1] !== '\n';
  const lead = needsLeadingNewline ? '\n' : '';
  const needsTrailingNewline = safeEnd < text.length && text[safeEnd] !== '\n';
  const trail = needsTrailingNewline ? '\n' : '';

  if (kind === 'codeblock') {
    const open = `${lead}\`\`\`ts\n`;
    const body = selected || '';
    const close = `\n\`\`\`${trail}`;
    const next = text.slice(0, safeStart) + open + body + close + text.slice(safeEnd);
    const cursorPos = safeStart + open.length;
    return {
      text: next,
      selectionStart: cursorPos,
      selectionEnd: cursorPos + body.length,
    };
  }

  if (kind === 'table') {
    const tpl =
      `${lead}| Cột 1 | Cột 2 |\n| --- | --- |\n| Nội dung 1 | Nội dung 2 |\n` +
      (trail ? '' : '');
    const next = text.slice(0, safeStart) + tpl + text.slice(safeEnd);
    const colStart = safeStart + lead.length + 2;
    return {
      text: next,
      selectionStart: colStart,
      selectionEnd: colStart + 'Cột 1'.length,
    };
  }

  // hr
  const hrStr = `${safeStart > 0 && text[safeStart - 1] !== '\n' ? '\n' : ''}---\n`;
  const next = text.slice(0, safeStart) + hrStr + text.slice(safeEnd);
  const caret = safeStart + hrStr.length;
  return {
    text: next,
    selectionStart: caret,
    selectionEnd: caret,
  };
}

/**
 * Obsidian-like smart Enter continuation for lists, checklists, and blockquotes.
 * Returns null when the cursor is not in a list/quote context so default Enter runs.
 */
export function handleSmartEnter(
  text: string,
  start: number,
  end: number
): FormatEditResult | null {
  if (start !== end) return null;

  const { lineStart } = getLineBounds(text, start);
  const lineBeforeCaret = text.slice(lineStart, start);

  // Match checklist: `  - [ ] ...` or `  - [x] ...`
  const checkMatch = lineBeforeCaret.match(/^(\s*)-\s\[[ xX]\]\s(.*)$/);
  if (checkMatch) {
    const [, indent, content] = checkMatch;
    if (content.trim().length === 0) {
      // Clear empty checklist line
      return {
        text: text.slice(0, lineStart) + text.slice(start),
        selectionStart: lineStart,
        selectionEnd: lineStart,
      };
    }
    const insertion = `\n${indent}- [ ] `;
    return {
      text: text.slice(0, start) + insertion + text.slice(start),
      selectionStart: start + insertion.length,
      selectionEnd: start + insertion.length,
    };
  }

  // Match unordered list: `  - ...` / `  * ...` / `  + ...`
  const bulletMatch = lineBeforeCaret.match(/^(\s*)([-*+])\s(.*)$/);
  if (bulletMatch) {
    const [, indent, bullet, content] = bulletMatch;
    if (content.trim().length === 0) {
      return {
        text: text.slice(0, lineStart) + text.slice(start),
        selectionStart: lineStart,
        selectionEnd: lineStart,
      };
    }
    const insertion = `\n${indent}${bullet} `;
    return {
      text: text.slice(0, start) + insertion + text.slice(start),
      selectionStart: start + insertion.length,
      selectionEnd: start + insertion.length,
    };
  }

  // Match ordered list: `  1. ...`
  const orderedMatch = lineBeforeCaret.match(/^(\s*)(\d+)\.\s(.*)$/);
  if (orderedMatch) {
    const [, indent, numStr, content] = orderedMatch;
    if (content.trim().length === 0) {
      return {
        text: text.slice(0, lineStart) + text.slice(start),
        selectionStart: lineStart,
        selectionEnd: lineStart,
      };
    }
    const nextNum = Number(numStr) + 1;
    const insertion = `\n${indent}${nextNum}. `;
    return {
      text: text.slice(0, start) + insertion + text.slice(start),
      selectionStart: start + insertion.length,
      selectionEnd: start + insertion.length,
    };
  }

  // Match blockquote: `> ...`
  const quoteMatch = lineBeforeCaret.match(/^(\s*)>\s?(.*)$/);
  if (quoteMatch) {
    const [, indent, content] = quoteMatch;
    if (content.trim().length === 0) {
      return {
        text: text.slice(0, lineStart) + text.slice(start),
        selectionStart: lineStart,
        selectionEnd: lineStart,
      };
    }
    const insertion = `\n${indent}> `;
    return {
      text: text.slice(0, start) + insertion + text.slice(start),
      selectionStart: start + insertion.length,
      selectionEnd: start + insertion.length,
    };
  }

  return null;
}

/**
 * Inspects cursor/line to light up active format buttons in the Obsidian toolbar.
 */
export function getActiveFormatsAtCursor(
  text: string,
  start: number,
  end: number
): ActiveFormatsState {
  const safeStart = Math.max(0, Math.min(start, text.length));
  const safeEnd = Math.max(safeStart, Math.min(end, text.length));
  const { lineStart, lineEnd } = getLineBounds(text, safeStart);
  const line = text.slice(lineStart, lineEnd);
  const relStart = safeStart - lineStart;
  const relEnd = Math.min(line.length, safeEnd - lineStart);

  const headingMatch = line.match(/^(#{1,6})\s+/);
  const headingLevel = headingMatch ? headingMatch[1].length : 0;

  return {
    bold: Boolean(findEnclosingInlineSpan(line, relStart, relEnd, '**')),
    italic: Boolean(findEnclosingInlineSpan(line, relStart, relEnd, '*')),
    strike: Boolean(findEnclosingInlineSpan(line, relStart, relEnd, '~~')),
    code: Boolean(findEnclosingInlineSpan(line, relStart, relEnd, '`')),
    headingLevel,
    checkbox: /^\s*-\s\[[ xX]\]\s+/.test(line),
    bullet: /^\s*[-*+]\s+(?!\[[ xX]\])/.test(line),
    ordered: /^\s*\d+\.\s+/.test(line),
    quote: /^\s*>\s?/.test(line),
  };
}
