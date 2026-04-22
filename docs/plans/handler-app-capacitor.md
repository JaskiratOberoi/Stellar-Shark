# Android handler app (deferred) — Capacitor wrap

**Status:** not implemented. Use the web app + floating scanner on `https://nexus.stellarinfomatica.com` (HTTPS) first.

## When to build

- IT requires a signed APK and home-screen install for handlers.
- You adopt rugged Zebra / Honeywell scanners and want DataWedge or vendor SDKs.
- You need guaranteed camera on older WebViews without `BarcodeDetector` (uncommon on modern Android Chrome).

## Approach (about one day)

1. **Same Vite build** — no React rewrite. Output `web/dist` is the `webDir` for Capacitor.
2. **Packages** — `@capacitor/core`, `@capacitor/cli`, `@capacitor/android`, and optionally `@capacitor-mlkit/barcode-scanning` (or `@zxing/*` in the WebView; same as today).
3. **Swap the scanner** — keep `web/src/lib/scanner.js` as the single entry; add a `Capacitor` branch that uses ML Kit if `window.Capacitor` is present.
4. **Auth** — the SPA already uses JWT in `localStorage`; the WebView retains it like a browser. Optional: `capacitor-secure-storage-plugin` for stricter org policies.
5. **Distribution** — build `release` APK, sign with your keystore, distribute via internal link (no Play Store required for private ops).

## Out of scope for this document

- Flutter or React Native greenfield (the web app remains the product surface).
- iOS: same story with `@capacitor/ios` if you later need it.

## References

- [Capacitor Android](https://capacitorjs.com/docs/android)
- [Capacitor ML Kit (community) — verify package name and maintenance status at implementation time](https://github.com/capacitor-community/barcode-scanner) — prefer official Capacitor + ML Kit docs when you implement.
