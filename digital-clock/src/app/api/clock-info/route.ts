import { NextRequest, NextResponse } from "next/server";

const getValidatedTimeZone = (timeZone: string | null): string => {
  if (!timeZone) {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }

  try {
    Intl.DateTimeFormat("en-US", { timeZone }).format(new Date());
    return timeZone;
  } catch {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  }
};

const getTimeZoneDisplayName = (timeZone: string): string => {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "long",
  }).formatToParts(new Date());

  return (
    parts.find((part) => part.type === "timeZoneName")?.value ??
    timeZone.replaceAll("_", " ")
  );
};

export async function GET(request: NextRequest) {
  const queryTimeZone = request.nextUrl.searchParams.get("timeZone");
  const userTimeZone = getValidatedTimeZone(queryTimeZone);
  const timeZoneName = getTimeZoneDisplayName(userTimeZone);

  return NextResponse.json(
    {
      standardTimeLabel: `${timeZoneName} (${userTimeZone})`,
      userTimeZone,
      generatedAt: new Date().toISOString(),
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
