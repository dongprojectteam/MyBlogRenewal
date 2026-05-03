import Image from "next/image";

export function ProfilePhoto({ url }: { url: string | null }) {
  return (
    <div className="photo-frame">
      {url ? (
        <Image src={url} alt="Profile" width={640} height={800} />
      ) : (
        <div className="photo-placeholder">D</div>
      )}
    </div>
  );
}
