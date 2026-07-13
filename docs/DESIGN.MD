# Design Notes

PaperPulse uses Good Samaritan Colleges blue (`#0B3B91`), secondary blue (`#1F5FBF`), accent gold (`#E8A07A`), and white surfaces. The interface is intentionally focused on a single public task: finding a document without requiring sign-in.

Accessibility decisions include semantic landmarks, an always-available skip link, visible focus treatment, labelled controls, keyboard navigation for autocomplete, live result updates, meaningful image alt text, and reduced-motion support. The layout changes from four summary cards to two and then one-column result details as screen space decreases.

The public page never receives the Sheet ID, Google credentials, or staff-maintenance controls. It reads only the Apps Script Web App API.
