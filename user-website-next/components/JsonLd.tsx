/**
 * Emits a JSON-LD block.
 *
 * The payload is built from our own API data, never from user input rendered as HTML,
 * and JSON.stringify escapes it — but `<` inside a string would still close the script
 * tag early, so it is escaped explicitly.
 */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}
