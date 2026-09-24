import Form from 'next/form';

/**
 * The hero search box. Submitting lands on the directory with the term applied.
 *
 * `next/form` rather than a click handler: with a string action it is a real GET form,
 * so it still works with no JavaScript, the result is a shareable URL, and Next
 * prefetches /creators while the box is on screen and navigates client-side on submit.
 *
 * No `required`: an empty search is a reasonable way to ask for everyone, and /creators
 * canonicalises back to itself, so the extra `?q=` costs nothing.
 */
export function HeroSearch() {
  return (
    <Form
      action="/creators"
      role="search"
      className="mx-auto mt-8 flex w-full max-w-xl items-center gap-2 rounded-full p-1.5"
      style={{ background: 'var(--hero-plate)' }}
    >
      <label htmlFor="hero-search" className="sr-only">
        Search creators by name, niche or city
      </label>
      <input
        id="hero-search"
        name="q"
        type="search"
        autoComplete="off"
        placeholder="Search by name, niche or city"
        // 0.8 is the lowest step that puts the placeholder over 4.5:1 on this plate
        // (0.75 measured 4.46). Typed text stays at 8:1, so the two still read apart.
        className="h-11 min-w-0 flex-1 bg-transparent px-5 text-[15px] outline-none placeholder:opacity-80"
        style={{ color: 'var(--hero-on-plate)' }}
      />
      <button
        type="submit"
        className="btn h-11 shrink-0 rounded-full px-6 text-[14.5px]"
        style={{ background: 'var(--violet-600)', color: '#ffffff' }}
      >
        Search
      </button>
    </Form>
  );
}
