[![make.fun · news-image-20261121](https://make.fun/badge/news-image-20261121.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![rank](https://make.fun/badge/news-image-20261121/yorstann/news-image-21nov/rank.svg)](https://make.fun/bounty/news-image-20261121/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)
[![reward](https://make.fun/badge/news-image-20261121/yorstann/news-image-21nov/reward.svg)](https://make.fun/bounty/news-image-20261121?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261121)

# The World Today — Saturday 21 November 2026

One image that sums up a whole day of world news, drawn entirely by a program.
`main.ts` (Node, standard library only) renders a broadsheet front page with its
own rasterizer, bitmap font and PNG encoder, and writes it to `entry.png`.

The front page leads with **COP31 talks run into overtime** — nearly 200
countries in Antalya missed Friday's deadline and talked through Saturday,
still split over fossil fuels and climate money. Around it, six boxed stories
cover the rest of the day: **Russian missiles fall in Poland** during a huge
attack on Ukraine; an **AI sell-off slides world markets** (S&P 500 −3.7%,
Nikkei −5.1%); the **UN court finds Myanmar committed genocide** against the
Rohingya; **Mexico captures 'El Chapo Isidro'** in a special-forces raid in
Sinaloa; BepiColombo's **eight-year voyage ends at Mercury** as it enters
orbit; and **Leeds stun Chelsea 4–1 at the Bridge**, winning there for the
first time since 1999.

Run it the way the grader does:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```
