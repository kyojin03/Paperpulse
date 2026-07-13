# Google Sheets Register

## Required schema

Use one header row with these columns. Their order may vary, but their names must match exactly.

| Column | Purpose | Format |
| --- | --- | --- |
| Tracking Number | Unique public document identifier | Text |
| Subject | Searchable document description | Text |
| Requesting Office | Office that submitted the document | Text |
| Date Received | Date OVPAA received the document | Date |
| Date Signed | Date it was signed, if applicable | Date or blank |
| Status | Current workflow state | Received, For Signature, Signed, or Released |
| Remarks | Publicly appropriate update | Text or blank |
| Last Updated | Most recent staff update | Date/time |

## Staff workflow

1. Add a row when OVPAA receives a document and assign a unique tracking number.
2. Update `Status`, `Remarks`, and `Last Updated` whenever the document progresses.
3. Enter `Date Signed` only once the document has been signed.
4. Use the four approved status values exactly. Unexpected values are excluded from the summary totals.
5. Keep personal information, sensitive discussions, attachment links, and internal-only notes out of the public columns.

## Data quality checks

- Do not leave Tracking Number or Subject blank.
- Do not duplicate a tracking number.
- Use real Google Sheets date values, not free-form date phrases.
- Keep the header row in the sheet and do not rename any required column.
- Review the public result after substantial updates.
