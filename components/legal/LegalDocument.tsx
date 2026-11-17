/** A legal text: numbered sections of paragraphs, same look as the privacy page. */
export function LegalDocument({
  title,
  intro,
  updated,
  sections,
}: {
  title: string;
  intro?: string;
  updated: string;
  sections: { title: string; paragraphs: string[] }[];
}) {
  return (
    <article>
      <header className="mb-10">
        <h1 className="text-3xl font-medium tracking-tight text-neutral-950 sm:text-4xl">{title}</h1>
        {intro && <p className="mt-3 text-neutral-600">{intro}</p>}
        <p className="mt-1 text-sm text-neutral-400">Dernière mise à jour : {updated}</p>
      </header>
      <ol className="space-y-6">
        {sections.map((s, i) => (
          <li key={s.title} className="rounded-3xl border border-neutral-200 p-6 sm:p-8">
            <h2 className="flex items-center gap-3 text-lg font-medium text-neutral-950">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-950 text-sm text-white">{i + 1}</span>
              {s.title}
            </h2>
            <div className="mt-4 space-y-3 text-[15px] leading-relaxed text-neutral-600">
              {s.paragraphs.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </div>
          </li>
        ))}
      </ol>
    </article>
  );
}
