export interface ParsedLink {
  label: string;
  url: string;
}

export function parseResourceLink(rawText: string): ParsedLink {
  const trimmed = rawText.trim();
  const bracketRegex = /^(.*?)\s*[\(\[]\s*(https?:\/\/[^\s\)]+)\s*[\)\]]$/i;
  const hyphenRegex = /^(.*?)\s*-\s*(https?:\/\/[^\s]+)$/i;
  
  const bracketMatch = trimmed.match(bracketRegex);
  if (bracketMatch) {
    return {
      label: bracketMatch[1].trim(),
      url: bracketMatch[2].trim()
    };
  }
  
  const hyphenMatch = trimmed.match(hyphenRegex);
  if (hyphenMatch) {
    return {
      label: hyphenMatch[1].trim(),
      url: hyphenMatch[2].trim()
    };
  }
  
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://") || trimmed.includes(".")) {
    const url = trimmed.startsWith("http") ? trimmed : `https://${trimmed}`;
    return {
      label: trimmed,
      url: url
    };
  }
  
  return {
    label: trimmed,
    url: `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`
  };
}

export interface DisplayResource {
  type: "video" | "textbook" | "link";
  label: string;
  url?: string;
  icon: string;
}

export function extractYoutubeName(url: string): string {
  try {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
    const match = url.match(regExp);
    if (match && match[2].length === 11) {
      return `YouTube Video (${match[2]})`;
    }
  } catch (e) {}
  return "YouTube Video";
}

export function extractLinkName(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    let host = parsed.hostname.replace("www.", "");
    return `${host} Resource`;
  } catch (e) {}
  return "Web Resource";
}

export const validateResource = (type: "video" | "textbook" | "link", val: string): string => {
  const trimmed = val.trim();
  if (!trimmed) {
    return "Resource value cannot be empty";
  }
  if (type === "video") {
    const isYoutube = trimmed.includes("youtube.com") || trimmed.includes("youtu.be");
    if (!isYoutube) {
      return "Only valid YouTube links are accepted for videos";
    }
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "Must be a valid URL starting with http:// or https://";
    }
  } else if (type === "textbook") {
    const alphanumericRegex = /^[a-zA-Z0-9\s\-_.,()&':]+$/;
    if (!alphanumericRegex.test(trimmed)) {
      return "Textbook name must be alphanumeric (letters, numbers, spaces, and basic punctuation)";
    }
  } else if (type === "link") {
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      return "Must be a valid URL starting with http:// or https://";
    }
  }
  return "";
};

export const formatResourceToSave = (type: "video" | "textbook" | "link", val: string): string => {
  const trimmed = val.trim();
  if (type === "video") {
    return `video:${extractYoutubeName(trimmed)}|${trimmed}`;
  } else if (type === "textbook") {
    return `textbook:${trimmed}`;
  } else {
    return `link:${extractLinkName(trimmed)}|${trimmed}`;
  }
};

export function parseResource(rawStr: string): DisplayResource {
  const trimmed = rawStr.trim();
  if (trimmed.startsWith("video:")) {
    const content = trimmed.substring(6);
    const parts = content.split("|");
    return {
      type: "video",
      label: parts[0] || "YouTube Video",
      url: parts[1] || "",
      icon: "📺",
    };
  } else if (trimmed.startsWith("textbook:")) {
    const label = trimmed.substring(9);
    return {
      type: "textbook",
      label: label || "Textbook",
      icon: "📖",
    };
  } else if (trimmed.startsWith("link:")) {
    const content = trimmed.substring(5);
    const parts = content.split("|");
    return {
      type: "link",
      label: parts[0] || "Web Link",
      url: parts[1] || "",
      icon: "🔗",
    };
  }

  const parsedLegacy = parseResourceLink(trimmed);
  const isVideo = parsedLegacy.url.includes("youtube.com") || parsedLegacy.url.includes("youtu.be");
  return {
    type: isVideo ? "video" : "link",
    label: parsedLegacy.label,
    url: parsedLegacy.url,
    icon: isVideo ? "📺" : "🔗",
  };
}
