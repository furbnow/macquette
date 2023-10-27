function bem(block: string, element: string, modifier?: string | null) {
  let out = `${block}__${element}`;
  if (modifier !== undefined && modifier !== null) {
    out += ` ${block}__${element}--${modifier}`;
  }
  return out;
}

export function partialBem(block: string) {
  return (element: string, modifier?: string | null) => bem(block, element, modifier);
}
