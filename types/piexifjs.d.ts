declare module "piexifjs" {
  type PiexifDict = {
    "0th": Record<number, unknown>;
    Exif: Record<number, unknown>;
    GPS: Record<number, unknown>;
    Interop: Record<number, unknown>;
    "1st": Record<number, unknown>;
    thumbnail: string | null;
  };

  type IfdTags = Record<string, number>;

  const piexif: {
    ImageIFD: IfdTags;
    ExifIFD: IfdTags;
    GPSIFD: IfdTags;
    InteropIFD: IfdTags;
    load(data: string): PiexifDict;
    dump(data: PiexifDict): string;
    insert(exifBytes: string, data: string): string;
    remove(data: string): string;
  };

  export default piexif;
}
