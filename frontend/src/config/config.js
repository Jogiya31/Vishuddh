export const getYesterdayDate = () => {
  const today = new Date();
  today.setDate(today.getDate() - 1);
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
};

export function formatToDDMMYYYY(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

export function capitalizeFirst(str) {
  if (typeof str !== "string" || !str.length) return str;
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toISODate(str) {
  if (!str) return "";
  const [dd, mm, yyyy] = str.split("-");
  return `${yyyy}-${mm}-${dd}`;
}