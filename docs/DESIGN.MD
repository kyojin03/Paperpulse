# Design Notes

PaperPulse 2.0 uses Good Samaritan Colleges blue (`#0B3B91`), secondary blue (`#1F5FBF`), accent gold (`#E8A07A`), and white surfaces. The interface is an institutional dashboard that surfaces document activity before a search: concise statistical cards, a released-documents register, and an in-progress register sit below the persistent search control.

Accessibility decisions include semantic landmarks, an always-available skip link, visible focus treatment, labelled controls, keyboard navigation for autocomplete and table rows, a keyboard-dismissible detail dialog, live update messaging, meaningful image alt text, and reduced-motion support. The tables retain sticky headers and horizontal scrolling on narrow displays; summary cards collapse from four to two columns and details to one column.

The public page never receives the Sheet ID, Google credentials, or staff-maintenance controls. It reads only the Apps Script Web App API. Dashboard records use session storage for a short period to improve responsiveness and reduce repeat traffic; the Refresh control clears that cached data before reloading.
