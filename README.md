# RNG Tools v2.3

Browser-based tools for number generation, Web/Bin allocation, and TXT vs Excel comparison.

**Live site:** [https://wing510.github.io/RNGv2.3/](https://wing510.github.io/RNGv2.3/)

## Features

- **Number** — Generate red/other number files (0000–9999)
- **Settings** — Web/Bin setup, allocation, and download
- **Comparison** — Compare TXT (Before) vs Excel (After)
- **中文 / EN** — Language switch at the top

## Use online

Open [https://wing510.github.io/RNGv2.3/](https://wing510.github.io/RNGv2.3/) in Chrome or Edge, then log in.

## Deploy on company server (IIS)

Copy all files to `C:\inetpub\wwwroot\rng\` and serve via IIS. Static site only — no database or backend required.

## Files

```
index.html   Login + main shell
GEN.html     Number generator
WB.html      Web/Bin settings
TEC.html     TXT vs Excel compare
css/         Styles
js/          Scripts (incl. i18n.js)
```

## Repo

[https://github.com/wing510/RNGv2.3](https://github.com/wing510/RNGv2.3)
