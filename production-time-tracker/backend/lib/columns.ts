/**
 * Колонки списку подій SharePoint (ті самі, що в scripts/provision-sharepoint.mjs).
 * EventId — індексована й унікальна: SharePoint сам не допускає дублів.
 */
export const EVENT_COLUMNS = [
  { name: "EventId", text: {}, indexed: true, enforceUniqueValues: true, required: true },
  { name: "RecordId", text: {}, indexed: true },
  { name: "SKU", text: {}, indexed: true },
  { name: "ProductName", text: {} },
  { name: "Article", text: {} },
  { name: "QuantityKg", number: { decimalPlaces: "two" } },
  { name: "Phase", text: {} },
  { name: "EventType", text: {}, indexed: true },
  { name: "Timestamp", dateTime: { format: "dateTime" }, indexed: true },
  { name: "DurationSeconds", number: { decimalPlaces: "none" } },
  { name: "DowntimeReason", text: {} },
  { name: "Comment", text: { allowMultipleLines: true } },
  { name: "RecordComment", text: { allowMultipleLines: true } },
  { name: "DeviceId", text: {}, indexed: true },
  { name: "CreatedAt", dateTime: { format: "dateTime" } },
];
