export function ModelOverview({
  title,
  description,
  imageSrc,
  imageAlt,
  accentColor,
}: {
  title: string;
  description: string;
  imageSrc: string;
  imageAlt: string;
  accentColor: string;
}) {
  return (
    <section className="px-4 py-16">
      <div className="mx-auto grid w-full max-w-5xl items-center gap-10 lg:grid-cols-2">
        <div>
          <h2 className="text-foreground max-w-2xl font-serif text-2xl font-normal tracking-[-0.01em] sm:text-3xl">
            {title}
          </h2>
          <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
            {description}
          </p>
        </div>
        <figure
          className="border-border bg-muted relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border"
          style={{ boxShadow: `0 24px 70px -42px ${accentColor}` }}
        >
          <img
            src={imageSrc}
            alt={imageAlt}
            className="size-full object-cover"
            loading="lazy"
          />
        </figure>
      </div>
    </section>
  );
}
