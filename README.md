# Window

Window is a browser-based globe for exploring public geospatial feeds,
including aircraft, satellites, earthquakes and weather. It is an independent
fork of [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view) by
Bilawal Sidhu.

## Run locally

Install Node.js 24.14+ within the 24.x series, or Node.js 26.x, then run:

```sh
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

Open http://127.0.0.1:4174. The base globe and several public feeds work without
credentials. To develop with hot reload, run `npm run dev` and open
http://127.0.0.1:4173. If Windows HTTPS requests fail with a certificate error,
start Node.js with `NODE_OPTIONS=--use-system-ca` in the shell environment.

## Licensing

The source retains the original MIT [LICENSE](LICENSE). See
[ASSET-REVIEW.md](ASSET-REVIEW.md) for the included and excluded assets,
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for dependency notices, and
[DATA_SOURCES.md](DATA_SOURCES.md) for data attribution and provider terms.
The original upstream documentation is retained for reference and may describe
optional content excluded from this release.
