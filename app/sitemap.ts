import type { MetadataRoute } from "next";

import { getPublicVisualizations } from "@/lib/data";

const siteUrl = "https://www.doptsw.org";

const staticPaths = [
  "/",
  "/about",
  "/calendar",
  "/diff",
  "/diagram",
  "/tetris",
  "/ladder",
  "/codec",
  "/mojibake",
  "/time",
  "/regex",
  "/table-converter",
  "/exif",
  "/mindmap",
  "/sudoku",
  "/animal-merge",
];
const staticPathSet = new Set(staticPaths);

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const baseEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "daily" : "weekly",
    priority: path === "/" ? 1 : 0.8,
  }));

  const utilityEntries = await getPublicVisualizations();
  const dynamicEntries: MetadataRoute.Sitemap = utilityEntries
    .map((item) => item.url)
    .filter(
      (url): url is string =>
        typeof url === "string" && url.startsWith("/") && !url.startsWith("/admin") && !staticPathSet.has(url),
    )
    .map((url) => ({
      url: `${siteUrl}${url}`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    }));

  return [...baseEntries, ...dynamicEntries];
}


