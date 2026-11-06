type ExplainerVideoProps = {
  title: string;
};

/** Shared Puntr explainer player used by the homepage and About page. */
export function ExplainerVideo({ title }: ExplainerVideoProps) {
  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-black" style={{ aspectRatio: "16 / 9" }}>
      <iframe
        src="https://www.youtube-nocookie.com/embed/pBCncBbeWkc?rel=0"
        className="absolute inset-0 size-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin"
        title={title}
      />
    </div>
  );
}
