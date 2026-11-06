import { useTranslation } from "react-i18next";

/**
 * The Puntr explainer, self-hosted in Supabase Storage (public "media" bucket) instead of YouTube, so no third-party
 * player or cookies load. 720p H.264, ~10 MB, faststart so it begins playing before it fully downloads.
 * preload="none": nothing is downloaded until the visitor presses play.
 */
export const EXPLAINER_VIDEO_URL =
  "https://hucjuekhitjuygcoomhw.supabase.co/storage/v1/object/public/media/explainer/puntr-explainer-720p.mp4";
export const EXPLAINER_POSTER_URL = "/explainer-poster.jpg";

export function ExplainerVideo({
  autoPlay = false,
  className = "",
}: {
  autoPlay?: boolean;
  className?: string;
}) {
  const { t } = useTranslation("about");
  return (
    <video
      className={`block aspect-video w-full bg-black ${className}`}
      src={EXPLAINER_VIDEO_URL}
      poster={EXPLAINER_POSTER_URL}
      controls
      playsInline
      preload="none"
      autoPlay={autoPlay}
      aria-label={t("video.iframeTitle")}
    >
      <a href={EXPLAINER_VIDEO_URL}>{t("video.iframeTitle")}</a>
    </video>
  );
}
