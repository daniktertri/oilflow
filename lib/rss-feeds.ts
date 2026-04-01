export type RssFeedConfig = {
  source: string;
  sourceName: string;
  url: string;
  category: string;
};

export const RSS_FEEDS: RssFeedConfig[] = [
  {
    source: "oilprice",
    sourceName: "OilPrice.com",
    url: "https://oilprice.com/rss/main",
    category: "market",
  },
  {
    source: "eia",
    sourceName: "EIA Today in Energy",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
    category: "inventory",
  },
  {
    source: "cnbc",
    sourceName: "CNBC Energy",
    url: "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=19836572",
    category: "market",
  },
];
