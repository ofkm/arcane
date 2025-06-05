function capitalizeFirstLetter(string) {
  if (!string) return "";
  return string.charAt(0).toUpperCase() + string.slice(1);
}
function shortId(id, length = 12) {
  if (!id) return "N/A";
  return id.substring(0, length);
}
function truncateString(str, maxLength) {
  if (!str) return "";
  if (str.length <= maxLength) {
    return str;
  }
  return str.substring(0, maxLength - 3) + "...";
}
function formatDate(dateString) {
  if (!dateString) return "Unknown";
  try {
    return new Date(dateString).toLocaleString();
  } catch (e) {
    return "Invalid Date";
  }
}
function parseStatusTime(status) {
  const timeRegex = /(\d+)\s+(second|minute|hour|day|week|month|year)s?\s*(ago)?/i;
  const match = status.match(timeRegex);
  if (!match) {
    return 0;
  }
  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();
  const isAgo = !!match[3];
  let hours = 0;
  switch (unit) {
    case "second":
      hours = value / 3600;
      break;
    case "minute":
      hours = value / 60;
      break;
    case "hour":
      hours = value;
      break;
    case "day":
      hours = value * 24;
      break;
    case "week":
      hours = value * 24 * 7;
      break;
    case "month":
      hours = value * 24 * 30;
      break;
    case "year":
      hours = value * 24 * 365;
      break;
  }
  return isAgo ? -hours : hours;
}
export {
  capitalizeFirstLetter as c,
  formatDate as f,
  parseStatusTime as p,
  shortId as s,
  truncateString as t
};
