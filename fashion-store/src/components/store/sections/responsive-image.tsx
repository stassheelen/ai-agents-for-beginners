import { getImageProps } from "next/image";

/** Art-directed image: separate desktop / mobile sources, only one is downloaded. */
export function ResponsiveImage({
  desktop,
  mobile,
  alt,
  priority,
  className,
}: {
  desktop: string;
  mobile?: string | null;
  alt: string;
  priority?: boolean;
  className?: string;
}) {
  const common = { alt, sizes: "100vw", priority, quality: 75 } as const;
  const {
    props: { srcSet: desktopSet, ...rest },
  } = getImageProps({ ...common, src: desktop, fill: true });
  const mobileSet = mobile ? getImageProps({ ...common, src: mobile, fill: true }).props.srcSet : undefined;
  return (
    <picture>
      {mobileSet && <source media="(max-width: 767px)" srcSet={mobileSet} />}
      <source media="(min-width: 768px)" srcSet={desktopSet} />
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <img {...rest} className={className} />
    </picture>
  );
}
