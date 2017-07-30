# poloniex-helper
Some simple addons to help with Poloniex

- Adds USDT converted price of all coins owned.
- Adds USDT amount on margin trades.
- Highlight a bitcoin amount to show value in USDT.
- Add a quick fill order form (credit to Ryad & PoloYolo)

![Screenshot](http://andrew98103.github.io/poloniex-helper/screenshot.png)

## What's included

```bash
poloniex-helper/
├── dist/
    ├── font-awesome.min.css	# font awesome library
    ├── style.css				# extend poloniex's styles
    ├── jquery-ui.css
    ├── initializer.js			# sets up script and style injections
    ├── jquery-3.1.1.min.js         
    ├── jquery-ui.min.js
    ├── user.js					# main js file
	├── manifest.json			# chrome extension manifest
	├── icon-128.png
	├── icon-lg.png
	├── icon-md.png
	├── icon-sm.png
    └── screenshot.png
```

## Todo

- [ ] Fix total BTC calculation as it sometimes doesn't include full amount.
- [ ] Implement Notes and other tabs at bottom of window
- [ ] Show BTC balances on all pages instead of just market/margin
- [ ] Auto buy/sell ?

## Change log

0.0.5

* Show total BTC above market coins
* Display red/green values as it fluctuates

0.0.4

* Bug Fixes
* Show percentages for margin trades

0.0.3

* Added USDT conversion for margin trades
* Fix USDT conversion when in USDT market tab (show btc value of USDT)
* Added Quick Order Script from Ryad & PoloYolo
* Highlight with mouse to convert selected text from BTC to USDT
* Hover over volume column to show 24hr high/low

0.0.2

* Added USDT conversion in balance column

0.0.1

* Basic Operations & functions to tie into Poloniex's JS API