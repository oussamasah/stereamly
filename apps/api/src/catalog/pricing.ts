export type PricedChannel = { id: string; amountMinor: number };
export type PricedPackage = { id: string; name: string; amountMinor: number; channelIds: string[] };
export function calculateQuote(channels: PricedChannel[], packages: PricedPackage[]) {
  const total = channels.reduce((sum, channel) => sum + channel.amountMinor, 0);
  const selected = new Set(channels.map((channel) => channel.id));
  const recommendations = packages.filter((item) => [...selected].every((id) => item.channelIds.includes(id)) && item.amountMinor <= Math.ceil(total * 1.25)).sort((a, b) => a.amountMinor - b.amountMinor).map((item) => ({ ...item, differenceMinor: item.amountMinor - total }));
  return { totalMinor: total, recommendations };
}

