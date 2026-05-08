"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { DragEvent as ReactDragEvent } from "react";
import exifr from "exifr";
import JSZip from "jszip";
import piexif from "piexifjs";

type LoadStatus = "loading" | "ready" | "error";
type RiskLevel = "high" | "medium" | "low";
type ExportStrategy = "jpeg-edit" | "canvas";
type ExportFormat = "image/jpeg" | "image/png" | "image/webp";
type DateMode = "keep" | "shift" | "set";
type PiexifData = ReturnType<typeof piexif.load>;

type MetadataRow = {
  key: string;
  value: string;
};

type GpsCoordinates = {
  latitude: number;
  longitude: number;
};

type ImageFacts = {
  width: number;
  height: number;
  mimeType: string;
  size: number;
  camera: string;
  lens: string;
  orientation: string;
  captureDate: Date | null;
  gps: GpsCoordinates | null;
  software: string;
  creator: string;
};

type RiskFlag = {
  id: string;
  level: RiskLevel;
  label: string;
  detail: string;
};

type LoadedImage = {
  id: string;
  file: File;
  url: string;
  status: LoadStatus;
  error: string;
  metadata: Record<string, unknown>;
  flattened: MetadataRow[];
  facts: ImageFacts;
  risks: RiskFlag[];
};

type ExportSettings = {
  strategy: ExportStrategy;
  format: ExportFormat;
  quality: number;
  suffix: string;
  removeGps: boolean;
  removeRisky: boolean;
  normalizeOrientation: boolean;
  dateMode: DateMode;
  shiftHours: number;
  shiftMinutes: number;
  setDateTime: string;
  artist: string;
  copyright: string;
  description: string;
  software: string;
};

type ProcessedFile = {
  name: string;
  blob: Blob;
};

const PARSE_OPTIONS = {
  tiff: true,
  ifd0: {},
  ifd1: true,
  exif: true,
  gps: true,
  interop: true,
  xmp: {
    parse: true,
    multiSegment: true,
  },
  icc: true,
  iptc: true,
  jfif: true,
  ihdr: true,
  makerNote: false,
  userComment: true,
  mergeOutput: true,
  translateKeys: true,
  translateValues: true,
  reviveValues: true,
};

const EMPTY_FACTS: ImageFacts = {
  width: 0,
  height: 0,
  mimeType: "",
  size: 0,
  camera: "-",
  lens: "-",
  orientation: "-",
  captureDate: null,
  gps: null,
  software: "-",
  creator: "-",
};

const FORMAT_OPTIONS: Array<{ value: ExportFormat; label: string }> = [
  { value: "image/jpeg", label: "JPEG" },
  { value: "image/png", label: "PNG" },
  { value: "image/webp", label: "WebP" },
];

const DATE_MODE_OPTIONS: Array<{ value: DateMode; label: string }> = [
  { value: "keep", label: "Keep" },
  { value: "shift", label: "Shift" },
  { value: "set", label: "Set" },
];

const JPEG_TYPES = new Set(["image/jpeg", "image/jpg", "image/pjpeg"]);

function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function isProbablyImage(file: File) {
  if (file.type.startsWith("image/")) return true;
  return /\.(avif|bmp|gif|heic|heif|jpeg|jpg|png|tif|tiff|webp)$/i.test(file.name);
}

function isJpeg(file: File) {
  return JPEG_TYPES.has(file.type.toLowerCase()) || /\.(jpe?g)$/i.test(file.name);
}

function formatBytes(value: number) {
  if (!Number.isFinite(value) || value <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(value) / Math.log(1024)), units.length - 1);
  return `${(value / 1024 ** index).toFixed(index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatNumber(value: number, digits = 6) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function formatDisplayDate(date: Date | null) {
  if (!date) return "-";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function formatDateInput(date: Date | null) {
  if (!date) return "";
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

function formatExifDate(date: Date) {
  return `${date.getFullYear()}:${pad(date.getMonth() + 1)}:${pad(date.getDate())} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}:${pad(date.getSeconds())}`;
}

function normalizeExifDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed) return null;

  const exifLike = trimmed.replace(/^(\d{4}):(\d{2}):(\d{2})/, "$1-$2-$3");
  const normalized = exifLike.includes("T") ? exifLike : exifLike.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function firstString(metadata: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number" && Number.isFinite(value)) return String(value);
  }

  return "";
}

function firstDate(metadata: Record<string, unknown>) {
  const keys = [
    "DateTimeOriginal",
    "CreateDate",
    "DateCreated",
    "ModifyDate",
    "DateTimeDigitized",
    "DateTime",
    "SubSecDateTimeOriginal",
  ];

  for (const key of keys) {
    const date = normalizeExifDate(metadata[key]);
    if (date) return date;
  }

  return null;
}

function rationalToNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (Array.isArray(value) && value.length === 2 && typeof value[0] === "number" && typeof value[1] === "number") {
    return value[1] === 0 ? 0 : value[0] / value[1];
  }
  return null;
}

function dmsToDecimal(value: unknown, ref: unknown) {
  if (typeof value === "number") return value;
  if (!Array.isArray(value) || value.length < 3) return null;

  const degrees = rationalToNumber(value[0]);
  const minutes = rationalToNumber(value[1]);
  const seconds = rationalToNumber(value[2]);
  if (degrees === null || minutes === null || seconds === null) return null;

  const sign = ref === "S" || ref === "W" ? -1 : 1;
  return sign * (Math.abs(degrees) + minutes / 60 + seconds / 3600);
}

function extractGps(metadata: Record<string, unknown>): GpsCoordinates | null {
  const directLatitude = metadata.latitude;
  const directLongitude = metadata.longitude;
  if (typeof directLatitude === "number" && typeof directLongitude === "number") {
    return { latitude: directLatitude, longitude: directLongitude };
  }

  const latitude = dmsToDecimal(metadata.GPSLatitude, metadata.GPSLatitudeRef);
  const longitude = dmsToDecimal(metadata.GPSLongitude, metadata.GPSLongitudeRef);
  if (latitude === null || longitude === null) return null;

  return { latitude, longitude };
}

function readImageDimensions(url: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Image preview could not be decoded."));
    image.src = url;
  });
}

function formatMetadataValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (value instanceof Date) return formatDisplayDate(value);
  if (value instanceof Uint8Array) return `[${value.byteLength} bytes]`;
  if (Array.isArray(value)) return value.map((item) => formatMetadataValue(item)).join(", ");
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[object]";
    }
  }

  return String(value);
}

function flattenMetadata(value: unknown, prefix = "", rows: MetadataRow[] = [], depth = 0) {
  if (!prefix && (value === null || typeof value !== "object")) return rows;

  if (
    value === null ||
    value === undefined ||
    value instanceof Date ||
    value instanceof Uint8Array ||
    typeof value !== "object" ||
    depth >= 4
  ) {
    if (prefix) rows.push({ key: prefix, value: formatMetadataValue(value) });
    return rows;
  }

  if (Array.isArray(value)) {
    if (value.every((item) => item === null || ["string", "number", "boolean", "undefined"].includes(typeof item))) {
      rows.push({ key: prefix, value: formatMetadataValue(value) });
      return rows;
    }

    value.forEach((item, index) => flattenMetadata(item, `${prefix}[${index}]`, rows, depth + 1));
    return rows;
  }

  const entries = Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b));
  if (entries.length === 0 && prefix) {
    rows.push({ key: prefix, value: "{}" });
    return rows;
  }

  entries.forEach(([key, childValue]) => {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    flattenMetadata(childValue, nextPrefix, rows, depth + 1);
  });

  return rows;
}

function metadataHasAny(metadata: Record<string, unknown>, keys: string[]) {
  return keys.some((key) => metadata[key] !== undefined && metadata[key] !== null && String(metadata[key]).trim() !== "");
}

function buildFacts(file: File, metadata: Record<string, unknown>, dimensions: { width: number; height: number }): ImageFacts {
  const make = firstString(metadata, ["Make"]);
  const model = firstString(metadata, ["Model"]);
  const lens = firstString(metadata, ["LensModel", "Lens", "LensID", "LensMake"]);
  const software = firstString(metadata, ["Software", "CreatorTool", "ProcessingSoftware"]);
  const creator = firstString(metadata, ["Artist", "Creator", "By-line", "Copyright", "OwnerName"]);
  const metadataWidth =
    Number(metadata.ImageWidth ?? metadata.ExifImageWidth ?? metadata.PixelXDimension ?? metadata.ImageWidthInPixels) || 0;
  const metadataHeight =
    Number(metadata.ImageHeight ?? metadata.ExifImageHeight ?? metadata.PixelYDimension ?? metadata.ImageLength) || 0;

  return {
    width: dimensions.width || metadataWidth,
    height: dimensions.height || metadataHeight,
    mimeType: file.type || "unknown",
    size: file.size,
    camera: [make, model].filter(Boolean).join(" ") || "-",
    lens: lens || "-",
    orientation: firstString(metadata, ["Orientation"]) || "-",
    captureDate: firstDate(metadata),
    gps: extractGps(metadata),
    software: software || "-",
    creator: creator || "-",
  };
}

function buildRisks(metadata: Record<string, unknown>, facts: ImageFacts): RiskFlag[] {
  const risks: RiskFlag[] = [];

  if (facts.gps) {
    risks.push({
      id: "gps",
      level: "high",
      label: "GPS",
      detail: "Precise location coordinates are embedded.",
    });
  }

  if (metadataHasAny(metadata, ["SerialNumber", "BodySerialNumber", "LensSerialNumber", "CameraOwnerName"])) {
    risks.push({
      id: "serial",
      level: "medium",
      label: "Serial",
      detail: "Device or lens serial information is present.",
    });
  }

  if (metadataHasAny(metadata, ["Artist", "Creator", "By-line", "OwnerName", "Copyright", "ImageDescription"])) {
    risks.push({
      id: "identity",
      level: "medium",
      label: "Identity",
      detail: "Creator, copyright, or description metadata is present.",
    });
  }

  if (facts.captureDate) {
    risks.push({
      id: "capture-date",
      level: "medium",
      label: "Capture date",
      detail: "The original capture time is available.",
    });
  }

  if (facts.software !== "-") {
    risks.push({
      id: "software",
      level: "medium",
      label: "Software",
      detail: "Editing or processing software is recorded.",
    });
  }

  if (facts.camera !== "-" || facts.lens !== "-") {
    risks.push({
      id: "camera",
      level: "low",
      label: "Camera",
      detail: "Camera or lens model information is present.",
    });
  }

  return risks;
}

async function parseLoadedImage(item: LoadedImage): Promise<LoadedImage> {
  if (!isProbablyImage(item.file)) {
    return {
      ...item,
      status: "error",
      error: "This file is not an image.",
    };
  }

  let metadata: Record<string, unknown> = {};
  let parseWarning = "";

  try {
    metadata = ((await exifr.parse(item.file, PARSE_OPTIONS)) ?? {}) as Record<string, unknown>;
  } catch (error) {
    parseWarning = error instanceof Error ? error.message : "Metadata could not be parsed.";
  }

  let dimensions = { width: 0, height: 0 };
  try {
    dimensions = await readImageDimensions(item.url);
  } catch {
    dimensions = { width: 0, height: 0 };
  }

  const facts = buildFacts(item.file, metadata, dimensions);
  const flattened = flattenMetadata(metadata);
  const risks = buildRisks(metadata, facts);

  return {
    ...item,
    status: "ready",
    error: parseWarning,
    metadata,
    flattened,
    facts,
    risks,
  };
}

function loadImageElement(url: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Image could not be decoded for export."));
    image.src = url;
  });
}

async function drawImageToCanvas(item: LoadedImage) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas export is not available in this browser.");

  if ("createImageBitmap" in window) {
    try {
      const bitmap = await createImageBitmap(item.file, { imageOrientation: "from-image" });
      canvas.width = bitmap.width;
      canvas.height = bitmap.height;
      context.drawImage(bitmap, 0, 0);
      bitmap.close();
      return canvas;
    } catch {
      // Fall back to HTMLImageElement below.
    }
  }

  const image = await loadImageElement(item.url);
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  context.drawImage(image, 0, 0);
  return canvas;
}

function canvasToBlob(canvas: HTMLCanvasElement, format: ExportFormat, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Canvas export failed."));
          return;
        }
        resolve(blob);
      },
      format,
      format === "image/png" ? undefined : quality,
    );
  });
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("File could not be read."));
    reader.readAsDataURL(file);
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [header, body] = dataUrl.split(",");
  if (!body) throw new Error("Invalid image data.");

  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = window.atob(body);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes.buffer], { type: mimeType });
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function extensionForMime(mimeType: ExportFormat) {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return "jpg";
}

function splitFileName(fileName: string) {
  const match = fileName.match(/^(.*?)(?:\.([^.]+))?$/);
  return {
    base: match?.[1] || "image",
    extension: match?.[2] || "",
  };
}

function safeSuffix(value: string) {
  return value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "") || "exif";
}

function outputName(fileName: string, settings: ExportSettings, strategy: ExportStrategy) {
  const { base, extension } = splitFileName(fileName);
  const nextExtension = strategy === "jpeg-edit" ? extension || "jpg" : extensionForMime(settings.format);
  return `${base}-${safeSuffix(settings.suffix)}.${nextExtension.toLowerCase()}`;
}

function uniqueName(name: string, seen: Map<string, number>) {
  const key = name.toLowerCase();
  const count = seen.get(key) ?? 0;
  seen.set(key, count + 1);

  if (count === 0) return name;

  const { base, extension } = splitFileName(name);
  return `${base}-${count + 1}.${extension || "jpg"}`;
}

function createEmptyExif(): PiexifData {
  return {
    "0th": {},
    Exif: {},
    GPS: {},
    Interop: {},
    "1st": {},
    thumbnail: null,
  };
}

function tagValue(source: Record<string, number>, key: string) {
  return source[key];
}

function deleteTags(ifd: Record<number, unknown>, tags: Array<number | undefined>) {
  tags.forEach((tag) => {
    if (typeof tag === "number") delete ifd[tag];
  });
}

function setTextTag(ifd: Record<number, unknown>, tag: number | undefined, value: string) {
  if (typeof tag !== "number") return;
  const trimmed = value.trim();
  if (trimmed) ifd[tag] = trimmed.slice(0, 512);
}

function computeOutputDate(settings: ExportSettings, sourceDate: Date | null) {
  if (settings.dateMode === "keep") return null;

  if (settings.dateMode === "set") {
    const date = new Date(settings.setDateTime);
    if (Number.isNaN(date.getTime())) throw new Error("Set a valid capture date before exporting.");
    return date;
  }

  if (!sourceDate) throw new Error("This image does not have a capture date to shift.");
  const minutes = settings.shiftHours * 60 + settings.shiftMinutes;
  return new Date(sourceDate.getTime() + minutes * 60 * 1000);
}

function applyExifEdits(exifData: PiexifData, item: LoadedImage, settings: ExportSettings) {
  exifData["0th"] = exifData["0th"] ?? {};
  exifData.Exif = exifData.Exif ?? {};
  exifData.GPS = exifData.GPS ?? {};
  exifData.Interop = exifData.Interop ?? {};
  exifData["1st"] = exifData["1st"] ?? {};
  exifData.thumbnail = exifData.thumbnail ?? null;

  if (settings.removeGps) {
    exifData.GPS = {};
  }

  if (settings.removeRisky) {
    deleteTags(exifData["0th"], [
      tagValue(piexif.ImageIFD, "Artist"),
      tagValue(piexif.ImageIFD, "Copyright"),
      tagValue(piexif.ImageIFD, "ImageDescription"),
      tagValue(piexif.ImageIFD, "Software"),
    ]);
    deleteTags(exifData.Exif, [
      tagValue(piexif.ExifIFD, "BodySerialNumber"),
      tagValue(piexif.ExifIFD, "CameraOwnerName"),
      tagValue(piexif.ExifIFD, "LensSerialNumber"),
      tagValue(piexif.ExifIFD, "UserComment"),
    ]);
  }

  const outputDate = computeOutputDate(settings, item.facts.captureDate);
  if (outputDate) {
    const exifDate = formatExifDate(outputDate);
    exifData["0th"][tagValue(piexif.ImageIFD, "DateTime")] = exifDate;
    exifData.Exif[tagValue(piexif.ExifIFD, "DateTimeOriginal")] = exifDate;
    exifData.Exif[tagValue(piexif.ExifIFD, "DateTimeDigitized")] = exifDate;
  }

  setTextTag(exifData["0th"], tagValue(piexif.ImageIFD, "Artist"), settings.artist);
  setTextTag(exifData["0th"], tagValue(piexif.ImageIFD, "Copyright"), settings.copyright);
  setTextTag(exifData["0th"], tagValue(piexif.ImageIFD, "ImageDescription"), settings.description);
  setTextTag(exifData["0th"], tagValue(piexif.ImageIFD, "Software"), settings.software);

  return exifData;
}

async function exportJpegEdit(item: LoadedImage, settings: ExportSettings): Promise<ProcessedFile> {
  if (!isJpeg(item.file)) throw new Error("JPEG EXIF edit export is only available for JPEG images.");

  const dataUrl = await readFileAsDataUrl(item.file);
  let exifData: PiexifData;

  try {
    exifData = piexif.load(dataUrl);
  } catch {
    exifData = createEmptyExif();
  }

  const edited = applyExifEdits(exifData, item, settings);
  const exifBytes = piexif.dump(edited);
  const outputDataUrl = piexif.insert(exifBytes, dataUrl);
  return {
    name: outputName(item.file.name, settings, "jpeg-edit"),
    blob: dataUrlToBlob(outputDataUrl),
  };
}

async function exportCanvasImage(item: LoadedImage, settings: ExportSettings): Promise<ProcessedFile> {
  const canvas = await drawImageToCanvas(item);
  const quality = Math.min(1, Math.max(0.1, settings.quality));
  const blob = await canvasToBlob(canvas, settings.format, quality);

  return {
    name: outputName(item.file.name, settings, "canvas"),
    blob,
  };
}

async function processImage(item: LoadedImage, settings: ExportSettings): Promise<ProcessedFile> {
  if (settings.normalizeOrientation || settings.strategy === "canvas") {
    return exportCanvasImage(item, settings);
  }

  return exportJpegEdit(item, settings);
}

function emptyLoadedImage(file: File, url: string): LoadedImage {
  return {
    id: makeId(),
    file,
    url,
    status: "loading",
    error: "",
    metadata: {},
    flattened: [],
    facts: {
      ...EMPTY_FACTS,
      mimeType: file.type || "unknown",
      size: file.size,
    },
    risks: [],
  };
}

export function ExifClient() {
  const [images, setImages] = useState<LoadedImage[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [metadataQuery, setMetadataQuery] = useState("");
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [exportStatus, setExportStatus] = useState("");
  const [exportError, setExportError] = useState("");
  const [isExporting, setIsExporting] = useState(false);
  const [settings, setSettings] = useState<ExportSettings>({
    strategy: "canvas",
    format: "image/jpeg",
    quality: 0.92,
    suffix: "clean",
    removeGps: true,
    removeRisky: true,
    normalizeOrientation: false,
    dateMode: "keep",
    shiftHours: 0,
    shiftMinutes: 0,
    setDateTime: "",
    artist: "",
    copyright: "",
    description: "",
    software: "",
  });

  const urlsRef = useRef<string[]>([]);

  const selectedImage = useMemo(
    () => images.find((image) => image.id === selectedId) ?? images.find((image) => image.status === "ready") ?? images[0],
    [images, selectedId],
  );
  const readyImages = useMemo(() => images.filter((image) => image.status === "ready"), [images]);
  const selectedReady = selectedImage?.status === "ready" ? selectedImage : null;
  const effectiveStrategy: ExportStrategy = settings.normalizeOrientation ? "canvas" : settings.strategy;
  const canEditSelectedJpeg = Boolean(selectedReady && isJpeg(selectedReady.file));
  const batchCanUseStrategy =
    effectiveStrategy === "canvas" || readyImages.length === 0 || readyImages.every((image) => isJpeg(image.file));

  const filteredRows = useMemo(() => {
    const rows = selectedReady?.flattened ?? [];
    const query = metadataQuery.trim().toLocaleLowerCase("ko-KR");
    if (!query) return rows;

    return rows.filter((row) => `${row.key} ${row.value}`.toLocaleLowerCase("ko-KR").includes(query));
  }, [metadataQuery, selectedReady]);

  const gpsLinks = useMemo(() => {
    const gps = selectedReady?.facts.gps;
    if (!gps) return null;

    const value = `${formatNumber(gps.latitude)},${formatNumber(gps.longitude)}`;
    return {
      google: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(value)}`,
      osm: `https://www.openstreetmap.org/?mlat=${gps.latitude}&mlon=${gps.longitude}#map=16/${gps.latitude}/${gps.longitude}`,
    };
  }, [selectedReady]);

  useEffect(() => {
    return () => {
      urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      urlsRef.current = [];
    };
  }, []);

  useEffect(() => {
    if (images.length === 0) {
      setSelectedId("");
      return;
    }

    if (!images.some((image) => image.id === selectedId)) {
      setSelectedId(images[0].id);
    }
  }, [images, selectedId]);

  useEffect(() => {
    if (!selectedReady?.facts.captureDate) return;

    setSettings((previous) =>
      previous.setDateTime ? previous : { ...previous, setDateTime: formatDateInput(selectedReady.facts.captureDate) },
    );
  }, [selectedReady?.id, selectedReady?.facts.captureDate]);

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      const nextFiles = Array.from(fileList);
      if (nextFiles.length === 0) return;

      setExportError("");
      setExportStatus("");

      const nextImages = nextFiles.map((file) => {
        const url = URL.createObjectURL(file);
        urlsRef.current.push(url);
        return emptyLoadedImage(file, url);
      });

      setImages((previous) => [...previous, ...nextImages]);

      if (!selectedId && images.length === 0 && nextImages[0]) {
        setSelectedId(nextImages[0].id);
      }

      nextImages.forEach((image) => {
        void parseLoadedImage(image).then((parsed) => {
          setImages((previous) => previous.map((item) => (item.id === parsed.id ? parsed : item)));
        });
      });
    },
    [images.length, selectedId],
  );

  function handleDropZoneDragEnter(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(true);
  }

  function handleDropZoneDragOver(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  }

  function handleDropZoneDragLeave(event: ReactDragEvent<HTMLDivElement>) {
    const nextTarget = event.relatedTarget;
    if (nextTarget instanceof Node && event.currentTarget.contains(nextTarget)) return;
    setIsDragging(false);
  }

  function handleDropZoneDrop(event: ReactDragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function updateSetting<Key extends keyof ExportSettings>(key: Key, value: ExportSettings[Key]) {
    setSettings((previous) => ({ ...previous, [key]: value }));
    setExportError("");
    setExportStatus("");
  }

  function removeImage(id: string) {
    setImages((previous) => {
      const target = previous.find((image) => image.id === id);
      if (target) URL.revokeObjectURL(target.url);
      urlsRef.current = urlsRef.current.filter((url) => url !== target?.url);
      return previous.filter((image) => image.id !== id);
    });
  }

  function clearImages() {
    urlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    urlsRef.current = [];
    setImages([]);
    setSelectedId("");
    setExportError("");
    setExportStatus("");
  }

  async function copyText(value: string) {
    try {
      await window.navigator.clipboard.writeText(value);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1400);
  }

  async function exportSelected() {
    if (!selectedReady) return;
    if (effectiveStrategy === "jpeg-edit" && !canEditSelectedJpeg) {
      setExportError("JPEG EXIF edit export needs a JPEG source. Use canvas export for this file.");
      return;
    }

    setIsExporting(true);
    setExportError("");
    setExportStatus("");

    try {
      const processed = await processImage(selectedReady, settings);
      downloadBlob(processed.blob, processed.name);
      setExportStatus(`Exported ${processed.name}.`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  async function exportZip() {
    if (readyImages.length === 0) return;
    if (!batchCanUseStrategy) {
      setExportError("The current JPEG EXIF edit strategy needs every batch file to be JPEG.");
      return;
    }

    setIsExporting(true);
    setExportError("");
    setExportStatus("");

    try {
      const zip = new JSZip();
      const seen = new Map<string, number>();

      for (const image of readyImages) {
        const processed = await processImage(image, settings);
        zip.file(uniqueName(processed.name, seen), processed.blob);
      }

      const blob = await zip.generateAsync({ type: "blob" });
      downloadBlob(blob, `exif-toolkit-${safeSuffix(settings.suffix)}.zip`);
      setExportStatus(`Exported ${readyImages.length} files as ZIP.`);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "ZIP export failed.");
    } finally {
      setIsExporting(false);
    }
  }

  const uploadLabel = isDragging ? "Drop to load photos" : "Drop photos here";
  const hasImages = images.length > 0;

  return (
    <>
      <section className="panel stack">
        <div className="eyebrow">utility / exif</div>
        <div className="utility-title-row">
          <div>
            <h1 style={{ marginBottom: 8 }}>EXIF Toolkit</h1>
            <p className="muted" style={{ margin: 0 }}>
              Inspect, clean, edit, and export photo metadata locally in the browser.
            </p>
          </div>
          <div className="utility-status-tags">
            <span className="tag neutral">local only</span>
            <span className="tag neutral">
              {readyImages.length} / {images.length} ready
            </span>
          </div>
        </div>
      </section>

      <section className="exif-layout section">
        <div className="exif-side-stack">
          <section className="panel stack">
            <div
              className={`exif-drop-zone${isDragging ? " is-dragging" : ""}`}
              onDragEnter={handleDropZoneDragEnter}
              onDragOver={handleDropZoneDragOver}
              onDragLeave={handleDropZoneDragLeave}
              onDrop={handleDropZoneDrop}
            >
              <input
                className="exif-file-input"
                type="file"
                accept="image/*,.heic,.heif,.tif,.tiff"
                multiple
                aria-label="Choose photo files"
                onChange={(event) => {
                  if (event.currentTarget.files) addFiles(event.currentTarget.files);
                  event.currentTarget.value = "";
                }}
              />
              <div>
                <strong>{uploadLabel}</strong>
                <span>Choose files</span>
              </div>
            </div>

            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Files</h2>
              <button type="button" className="ghost-button" onClick={clearImages} disabled={!hasImages || isExporting}>
                Clear
              </button>
            </div>

            <div className="exif-file-list">
              {hasImages ? (
                images.map((image) => (
                  <div key={image.id} className={`exif-file-row${selectedImage?.id === image.id ? " is-active" : ""}`}>
                    <button type="button" className="exif-file-button" onClick={() => setSelectedId(image.id)}>
                      <span>{image.file.name}</span>
                      <small>
                        {image.status === "loading"
                          ? "Loading"
                          : image.status === "error"
                            ? "Error"
                            : `${image.risks.length} risks / ${formatBytes(image.file.size)}`}
                      </small>
                    </button>
                    <button
                      type="button"
                      className="exif-row-action"
                      onClick={() => removeImage(image.id)}
                      aria-label={`Remove ${image.file.name}`}
                      title="Remove"
                    >
                      x
                    </button>
                  </div>
                ))
              ) : (
                <p className="muted" style={{ margin: 0 }}>
                  No files loaded.
                </p>
              )}
            </div>
          </section>

          <section className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Preview</h2>
              {selectedReady ? <span className="tag neutral">{isJpeg(selectedReady.file) ? "JPEG edit ready" : "canvas only"}</span> : null}
            </div>

            <div className="exif-preview-frame">
              {selectedImage?.status === "ready" ? (
                <img src={selectedImage.url} alt={`${selectedImage.file.name} preview`} />
              ) : selectedImage?.status === "loading" ? (
                <span className="muted">Loading preview.</span>
              ) : (
                <span className="muted">Select an image.</span>
              )}
            </div>

            {selectedImage?.error ? <div className="notice notice-error">{selectedImage.error}</div> : null}

            {selectedReady ? (
              <div className="utility-fact-grid">
                <div className="utility-fact">
                  <span>Dimensions</span>
                  <strong>
                    {selectedReady.facts.width && selectedReady.facts.height
                      ? `${selectedReady.facts.width} x ${selectedReady.facts.height}`
                      : "-"}
                  </strong>
                </div>
                <div className="utility-fact">
                  <span>File size</span>
                  <strong>{formatBytes(selectedReady.facts.size)}</strong>
                </div>
                <div className="utility-fact">
                  <span>MIME</span>
                  <strong>{selectedReady.facts.mimeType}</strong>
                </div>
                <div className="utility-fact">
                  <span>Rows</span>
                  <strong>{selectedReady.flattened.length}</strong>
                </div>
              </div>
            ) : null}
          </section>

          <section className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Export</h2>
              <span className="tag neutral">{effectiveStrategy === "canvas" ? "strip all" : "edit EXIF"}</span>
            </div>

            <div className="segmented-control utility-mode-control" role="group" aria-label="Export strategy">
              <button
                type="button"
                className={`segment${settings.strategy === "canvas" ? " active" : ""}`}
                onClick={() => updateSetting("strategy", "canvas")}
              >
                Canvas
              </button>
              <button
                type="button"
                className={`segment${settings.strategy === "jpeg-edit" ? " active" : ""}`}
                onClick={() => updateSetting("strategy", "jpeg-edit")}
              >
                JPEG EXIF
              </button>
            </div>

            {effectiveStrategy === "jpeg-edit" && selectedReady && !canEditSelectedJpeg ? (
              <div className="notice notice-error">This selected file is not a JPEG. Canvas export can still strip metadata.</div>
            ) : null}

            <div className="exif-check-grid">
              <label>
                <input
                  type="checkbox"
                  checked={settings.removeGps}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("removeGps", event.target.checked)}
                />
                Remove GPS
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.removeRisky}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("removeRisky", event.target.checked)}
                />
                Remove identity fields
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={settings.normalizeOrientation}
                  onChange={(event) => updateSetting("normalizeOrientation", event.target.checked)}
                />
                Normalize orientation
              </label>
            </div>

            <div className="utility-control-grid">
              <label className="field">
                <span className="label">Format</span>
                <select
                  className="input"
                  value={settings.format}
                  disabled={effectiveStrategy === "jpeg-edit"}
                  onChange={(event) => updateSetting("format", event.target.value as ExportFormat)}
                >
                  {FORMAT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span className="label">Suffix</span>
                <input className="input" value={settings.suffix} onChange={(event) => updateSetting("suffix", event.target.value)} />
              </label>
            </div>

            <label className="field">
              <span className="label">Quality {Math.round(settings.quality * 100)}%</span>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.01"
                value={settings.quality}
                disabled={effectiveStrategy === "jpeg-edit" || settings.format === "image/png"}
                onChange={(event) => updateSetting("quality", Number(event.target.value))}
              />
            </label>

            <div className="actions">
              <button type="button" className="button" onClick={exportSelected} disabled={!selectedReady || isExporting}>
                {isExporting ? "Exporting" : "Download selected"}
              </button>
              <button type="button" className="ghost-button" onClick={exportZip} disabled={readyImages.length === 0 || isExporting}>
                ZIP all
              </button>
            </div>

            {exportError ? <div className="notice notice-error">{exportError}</div> : null}
            {exportStatus ? <div className="notice notice-success">{exportStatus}</div> : null}
          </section>
        </div>

        <div className="exif-main-stack">
          <section className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>Summary</h2>
              {selectedReady ? <span className="tag neutral">{selectedReady.file.name}</span> : null}
            </div>

            {selectedReady ? (
              <>
                <div className="utility-fact-grid">
                  <div className="utility-fact">
                    <span>Camera</span>
                    <strong>{selectedReady.facts.camera}</strong>
                  </div>
                  <div className="utility-fact">
                    <span>Lens</span>
                    <strong>{selectedReady.facts.lens}</strong>
                  </div>
                  <div className="utility-fact">
                    <span>Capture date</span>
                    <strong>{formatDisplayDate(selectedReady.facts.captureDate)}</strong>
                  </div>
                  <div className="utility-fact">
                    <span>Orientation</span>
                    <strong>{selectedReady.facts.orientation}</strong>
                  </div>
                  <div className="utility-fact">
                    <span>Software</span>
                    <strong>{selectedReady.facts.software}</strong>
                  </div>
                  <div className="utility-fact">
                    <span>Creator</span>
                    <strong>{selectedReady.facts.creator}</strong>
                  </div>
                </div>

                <div className="exif-risk-list" aria-label="Privacy risks">
                  {selectedReady.risks.length ? (
                    selectedReady.risks.map((risk) => (
                      <span key={risk.id} className={`exif-risk risk-${risk.level}`} title={risk.detail}>
                        {risk.label}
                      </span>
                    ))
                  ) : (
                    <span className="tag neutral">No obvious metadata risks</span>
                  )}
                </div>
              </>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                Load a photo to inspect metadata.
              </p>
            )}
          </section>

          <section className="panel stack">
            <div className="exif-tool-grid">
              <div className="stack">
                <div className="list-item-header">
                  <h2 style={{ margin: 0 }}>GPS</h2>
                  {selectedReady?.facts.gps ? <span className="exif-risk risk-high">location</span> : <span className="tag neutral">none</span>}
                </div>

                {selectedReady?.facts.gps ? (
                  <>
                    <div className="utility-fact-grid">
                      <div className="utility-fact">
                        <span>Latitude</span>
                        <strong>{formatNumber(selectedReady.facts.gps.latitude)}</strong>
                      </div>
                      <div className="utility-fact">
                        <span>Longitude</span>
                        <strong>{formatNumber(selectedReady.facts.gps.longitude)}</strong>
                      </div>
                    </div>
                    <div className="actions">
                      <a className="ghost-button" href={gpsLinks?.google} target="_blank" rel="noreferrer">
                        Google Maps
                      </a>
                      <a className="ghost-button" href={gpsLinks?.osm} target="_blank" rel="noreferrer">
                        OSM
                      </a>
                    </div>
                  </>
                ) : (
                  <p className="muted" style={{ margin: 0 }}>
                    No GPS coordinates detected.
                  </p>
                )}
              </div>

              <div className="stack">
                <div className="list-item-header">
                  <h2 style={{ margin: 0 }}>Capture Date</h2>
                  <span className="tag neutral">{settings.dateMode}</span>
                </div>

                <div className="segmented-control utility-mode-control" role="group" aria-label="Date edit mode">
                  {DATE_MODE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`segment${settings.dateMode === option.value ? " active" : ""}`}
                      disabled={effectiveStrategy === "canvas"}
                      onClick={() => updateSetting("dateMode", option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <div className="utility-fact">
                  <span>Detected</span>
                  <strong>
                    {selectedReady
                      ? formatDisplayDate(selectedReady.facts.captureDate)
                      : "Load a photo to inspect capture date"}
                  </strong>
                </div>

                {effectiveStrategy === "canvas" ? (
                  <p className="muted" style={{ margin: 0 }}>
                    Canvas export strips metadata, so date editing is available in JPEG EXIF mode.
                  </p>
                ) : selectedReady && !selectedReady.facts.captureDate && settings.dateMode === "shift" ? (
                  <div className="notice notice-error">This image has no detected capture date to shift.</div>
                ) : null}

                {settings.dateMode === "shift" ? (
                  <div className="utility-control-grid">
                    <label className="field">
                      <span className="label">Hours</span>
                      <input
                        className="input"
                        type="number"
                        value={settings.shiftHours}
                        disabled={effectiveStrategy === "canvas"}
                        onChange={(event) => updateSetting("shiftHours", Number(event.target.value))}
                      />
                    </label>
                    <label className="field">
                      <span className="label">Minutes</span>
                      <input
                        className="input"
                        type="number"
                        value={settings.shiftMinutes}
                        disabled={effectiveStrategy === "canvas"}
                        onChange={(event) => updateSetting("shiftMinutes", Number(event.target.value))}
                      />
                    </label>
                  </div>
                ) : null}

                {settings.dateMode === "set" ? (
                  <label className="field">
                    <span className="label">Exact date</span>
                    <input
                      className="input"
                      type="datetime-local"
                      value={settings.setDateTime}
                      disabled={effectiveStrategy === "canvas"}
                      onChange={(event) => updateSetting("setDateTime", event.target.value)}
                    />
                  </label>
                ) : null}
              </div>
            </div>
          </section>

          <section className="panel stack">
            <div className="list-item-header">
              <h2 style={{ margin: 0 }}>JPEG Fields</h2>
              <span className="tag neutral">{effectiveStrategy === "jpeg-edit" ? "writable" : "canvas strips metadata"}</span>
            </div>

            <div className="exif-text-grid">
              <label className="field">
                <span className="label">Artist</span>
                <input
                  className="input"
                  value={settings.artist}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("artist", event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Copyright</span>
                <input
                  className="input"
                  value={settings.copyright}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("copyright", event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Description</span>
                <input
                  className="input"
                  value={settings.description}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("description", event.target.value)}
                />
              </label>
              <label className="field">
                <span className="label">Software</span>
                <input
                  className="input"
                  value={settings.software}
                  disabled={effectiveStrategy === "canvas"}
                  onChange={(event) => updateSetting("software", event.target.value)}
                />
              </label>
            </div>
          </section>

          <section className="panel stack">
            <div className="exif-raw-toolbar">
              <div>
                <h2 style={{ margin: 0 }}>Raw Metadata</h2>
                <p className="muted" style={{ margin: "6px 0 0" }}>
                  {filteredRows.length} / {selectedReady?.flattened.length ?? 0} rows
                </p>
              </div>
              <div className="exif-raw-actions">
                <input
                  className="input"
                  type="search"
                  value={metadataQuery}
                  placeholder="Search metadata"
                  onChange={(event) => setMetadataQuery(event.target.value)}
                />
                <button
                  type="button"
                  className="ghost-button"
                  disabled={filteredRows.length === 0}
                  onClick={() => copyText(filteredRows.map((row) => `${row.key}: ${row.value}`).join("\n"))}
                >
                  {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "Copy rows"}
                </button>
              </div>
            </div>

            <div className="exif-table-wrap">
              <table className="table exif-table">
                <thead>
                  <tr>
                    <th>Key</th>
                    <th>Value</th>
                    <th>Copy</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length ? (
                    filteredRows.slice(0, 300).map((row, index) => (
                      <tr key={`${row.key}-${index}`}>
                        <td>{row.key}</td>
                        <td>{row.value}</td>
                        <td>
                          <button type="button" className="ghost-button" onClick={() => copyText(`${row.key}: ${row.value}`)}>
                            Copy
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3}>{selectedReady ? "No metadata rows match." : "No metadata loaded."}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </section>
    </>
  );
}
