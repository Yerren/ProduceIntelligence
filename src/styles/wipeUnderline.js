// Underline that wipes in from the left when the enclosing `group` is hovered/focused (echoing the nav),
// at the site's 2px line weight. box-decoration-clone keeps it going across every line of a wrapped title.
export const wipeUnderline =
  'bg-[linear-gradient(currentColor,currentColor)] bg-size-[0%_2px] bg-left-bottom bg-no-repeat pb-0.5 box-decoration-clone transition-[background-size] duration-300 ease-out group-hover:bg-size-[100%_2px] group-focus-visible:bg-size-[100%_2px] motion-reduce:transition-none'
