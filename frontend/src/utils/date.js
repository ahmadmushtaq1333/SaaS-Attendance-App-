/**
 * Formats an ISO UTC date string into the user's local timezone
 * @param {string} dateString - The ISO date string from the backend
 * @param {boolean} showTime - Whether to include the time in the output
 * @returns {string} The localized formatted date string
 */
export const formatLocalDate = (dateString, showTime = true) => {
  if (!dateString) return "";
  
  // Ensure the date string is treated as UTC if it lacks timezone info
  let parseString = dateString;
  if (!parseString.endsWith("Z") && !parseString.includes("+") && !parseString.match(/-\d{2}:\d{2}$/)) {
    parseString += "Z";
  }
  
  // Create a Date object from the ISO string.
  // The browser automatically converts it to the user's local timezone.
  const date = new Date(parseString);
  
  // Format options
  const options = {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(showTime && {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
  
  return date.toLocaleString(undefined, options);
};

/**
 * Returns a Date object properly parsed as UTC, even if the backend omitted the 'Z'
 */
export const parseUTCDate = (dateString) => {
  if (!dateString) return new Date();
  let parseString = dateString;
  if (!parseString.endsWith("Z") && !parseString.includes("+") && !parseString.match(/-\d{2}:\d{2}$/)) {
    parseString += "Z";
  }
  return new Date(parseString);
};
