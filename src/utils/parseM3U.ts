export interface Channel {
  name: string;
  logo: string;
  group: string;
  url: string;
  id: string;
}

const EXCLUDE_KEYWORDS = [
  "Welcome to PlayZ TV",
  "PlayZ TV | New App",
  "PlayZ TV",
];

function isExcluded(name: string, group: string): boolean {
  const target = `${name} ${group}`.toLowerCase();
  return EXCLUDE_KEYWORDS.some(
    (k) =>
      target.includes(k.toLowerCase()) ||
      group.toLowerCase().includes("welcome to playz")
  );
}

export function parseM3U(text: string): Channel[] {
  const lines = text.split(/\r?\n/);
  const channels: Channel[] = [];
  let current: Partial<Channel> | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith("#EXTINF:")) {
      const info = line.substring(8);
      const commaIdx = info.lastIndexOf(",");
      const attrsStr = commaIdx !== -1 ? info.substring(0, commaIdx) : info;
      const name = commaIdx !== -1 ? info.substring(commaIdx + 1).trim() : "";

      const getAttr = (key: string): string => {
        const re = new RegExp(`${key}="([^"]*)"`, "i");
        const m = attrsStr.match(re);
        return m ? m[1] : "";
      };

      current = {
        name,
        logo: getAttr("tvg-logo"),
        group: getAttr("group-title") || "Uncategorized",
        url: "",
      };
    } else if (line.startsWith("#") || line.startsWith("http") === false) {
      // not a url
      if (!line.startsWith("#EXTM3U") && !line.startsWith("#EXTINF")) {
        // could be a comment, skip
      }
    } else if (current && (line.startsWith("http://") || line.startsWith("https://"))) {
      current.url = line;
      const ch = current as Channel;
      if (!isExcluded(ch.name, ch.group) && ch.name && ch.url) {
        ch.id = `${ch.name}-${channels.length}`;
        channels.push(ch);
      }
      current = null;
    }
  }

  return channels;
}

export function getUniqueGroups(channels: Channel[]): string[] {
  const set = new Set<string>();
  channels.forEach((c) => {
    if (c.group) set.add(c.group);
  });
  return Array.from(set).sort((a, b) => a.localeCompare(b));
}
