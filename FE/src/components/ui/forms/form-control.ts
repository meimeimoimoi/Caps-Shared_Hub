/** Light form controls. Keep the dark application Input for dark surfaces. */
export const formControlClassName =
  'w-full px-3 py-2.5 border border-ex-input-border rounded-[5px] bg-white text-ex-ink min-h-11 font-normal caret-ex-accent transition-[border-color,box-shadow] duration-150 ease-in-out focus:border-ex-accent focus:shadow-[0_0_0_3px_var(--color-ex-ring)] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'

export const formButtonClassName =
  'cursor-pointer inline-flex items-center justify-center gap-2 min-h-11 px-[17px] py-[9px] border border-ex-btn-border rounded-md bg-white text-ex-ink font-semibold transition-[background,border-color,opacity] duration-150 ease-in-out hover:bg-ex-btn-hover disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none'

/** Scroll only the list; scrollIntoView also moves the page and its ancestors. */
export function scrollActiveOption(list: HTMLUListElement, index: number) {
  const option = list.children[index] as HTMLElement | undefined
  if (!option) return
  const top = option.offsetTop
  const bottom = top + option.offsetHeight
  if (top < list.scrollTop) list.scrollTop = top
  else if (bottom > list.scrollTop + list.clientHeight)
    list.scrollTop = bottom - list.clientHeight
}
