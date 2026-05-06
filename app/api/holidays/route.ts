import { NextResponse } from "next/server";

const SERVICE_KEY =
  "d0e07a1c0c97c65ea97243f4be6b3e2140271cbe3a18d254474158dd645069fa";
const API_URL = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";

type HolidayItem = {
  dateKind: string;
  dateName: string;
  isHoliday: string;
  locdate: string;
  seq: string;
};

function decodeXml(value: string): string {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'");
}

function getTagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1]?.trim() ?? "";
}

function parseHolidayItems(xml: string): HolidayItem[] {
  const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
  return itemMatches.map((itemBlock) => ({
    dateKind: getTagValue(itemBlock, "dateKind"),
    dateName: decodeXml(getTagValue(itemBlock, "dateName")),
    isHoliday: getTagValue(itemBlock, "isHoliday"),
    locdate: getTagValue(itemBlock, "locdate"),
    seq: getTagValue(itemBlock, "seq"),
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const year = searchParams.get("year");
  const month = searchParams.get("month");

  if (!year || !month) {
    return NextResponse.json({ error: "year and month are required." }, { status: 400 });
  }

  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) {
    return NextResponse.json({ error: "Invalid year or month format." }, { status: 400 });
  }

  const paddedMonth = month.padStart(2, "0");
  const params = new URLSearchParams({
    serviceKey: SERVICE_KEY,
    pageNo: "1",
    numOfRows: "100",
    solYear: year,
    solMonth: paddedMonth,
  });

  const url = `${API_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to fetch holiday data." }, { status: 502 });
    }

    const xml = await response.text();
    const resultCode = getTagValue(xml, "resultCode");
    const resultMsg = decodeXml(getTagValue(xml, "resultMsg"));

    if (resultCode !== "00") {
      return NextResponse.json({ error: `Holiday API error: ${resultMsg}` }, { status: 502 });
    }

    const items = parseHolidayItems(xml).filter((item) => item.isHoliday === "Y");

    return NextResponse.json({
      year,
      month: paddedMonth,
      items,
    });
  } catch {
    return NextResponse.json({ error: "Failed to load holiday data." }, { status: 500 });
  }
}
