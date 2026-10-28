/** One visual line, as React Native's `onTextLayout` reports it. */
export interface LayoutLine {
  text: string;
  y: number;
  height: number;
}

/** Where one source line of a code block sits, relative to the top of its Text. */
export interface LineBox {
  top: number;
  height: number;
}

function countNewlines(text: string): number {
  let count = 0;
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) count++;
  return count;
}

/**
 * The visual lines of `layout` grouped back into the source `lines` they draw,
 * for a Text whose content is `lines.join("\n")`. On native a code block is one
 * selectable Text, so a selection can cross lines; diff tints and line numbers
 * are drawn beside it from these boxes.
 *
 * Android reports each visual line with its trailing newline, so counting
 * newlines is exact even if a tokeniser drew a line's characters differently.
 * When the count doesn't add up (iOS leaves the newline out), the lines are
 * matched by character offsets in the source instead.
 */
export function logicalLineBoxes(
  lines: readonly string[],
  layout: readonly LayoutLine[],
): LineBox[] {
  const owners: number[] = [];
  const breaks = layout.reduce(
    (sum, line) => sum + countNewlines(line.text),
    0,
  );

  if (breaks === lines.length - 1) {
    let current = 0;
    for (const line of layout) {
      owners.push(current);
      current += countNewlines(line.text);
    }
  } else {
    const starts: number[] = [];
    let start = 0;
    for (const line of lines) {
      starts.push(start);
      start += line.length + 1;
    }
    let index = 0;
    let offset = 0;
    for (const line of layout) {
      while (index < lines.length - 1 && offset >= starts[index + 1]!) index++;
      owners.push(index);
      offset += line.text.length;
      // A visual line that ends where its source line ends: step over the
      // newline the layout left out, so the next one starts the next line.
      if (offset === starts[index]! + lines[index]!.length) offset++;
    }
  }

  const boxes: (LineBox | undefined)[] = new Array(lines.length);
  layout.forEach((line, k) => {
    const index = Math.min(owners[k]!, lines.length - 1);
    const box = boxes[index];
    if (!box) {
      boxes[index] = { top: line.y, height: line.height };
    } else {
      box.height =
        Math.max(box.top + box.height, line.y + line.height) - box.top;
    }
  });

  // A source line with no visual line of its own sits, zero tall, below the last.
  let bottom = 0;
  return Array.from(boxes, (box) => {
    const filled = box ?? { top: bottom, height: 0 };
    bottom = filled.top + filled.height;
    return filled;
  });
}

/** Whether two layouts put every line in the same place, to a hundredth of a point. */
export function sameLineBoxes(
  a: readonly LineBox[],
  b: readonly LineBox[],
): boolean {
  return (
    a.length === b.length &&
    a.every(
      (box, i) =>
        Math.abs(box.top - b[i]!.top) < 0.01 &&
        Math.abs(box.height - b[i]!.height) < 0.01,
    )
  );
}
