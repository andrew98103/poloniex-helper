( function() {
	var PLX = {
		plugin_name:	'_poloniex_helper_',
		cached:			{ volume: {}, totalVal: 0 },
		msgs:			{},
		_get: function( item ) {
			var saved = $.parseJSON( localStorage.getItem( this.plugin_name ) );

			if ( typeof saved	=== 'undefined' )	this._set( {} );
			if ( typeof item	=== 'undefined' )	return saved;
			if ( saved.hasOwnProperty( item ) )		return saved[ item ];

			return false;
		},
		_set: function( obj ) {
			if ( typeof obj !== 'object' ) return false;

			return localStorage.setItem( this.plugin_name,
				JSON.stringify( {
					[ obj.name ]: obj.val
				} )
			);
		},
		_add: function( item, val ) {
			var saved = this._get();

			if ( typeof item	!== 'string' ) return false;
			if ( typeof val	!== 'object' ) return false;

			return this._set( { name: item, val: $.extend( saved[ item ], val ) } );
		},
		_del: function( item ) {
			var saved = this._get();

			if ( typeof item !== 'string' )	return false;
			if ( ! this._get( item ) )			return false;

			delete saved[ item ];

			return this._set( saved );
		},
		toUSD:			function ( btc ) {
			if ( ! allTickerData.hasOwnProperty( 'USDT_BTC' ) ) return;

			return ( parseFloat( btc ) * parseFloat( allTickerData.USDT_BTC.highestBid ) ).toFixed( 2 );
		},
		toBTC:			function ( usd ) {
			if ( ! allTickerData.hasOwnProperty( 'USDT_BTC' ) ) return;

			return ( parseFloat( usd ) / parseFloat( allTickerData.USDT_BTC.highestBid ) );
		},
		numFormat:		function ( val, unit ) {
			var isNeg = val < 0;

			if ( typeof unit === 'undefined' )	unit = '$';

			return ( isNeg ? '-' : '' ) + ( unit ? unit : '' ) + parseFloat( ( '' + ( Math.abs( val ) || 0 ) ).replace( /[^-\d.]/g, '' ) ).toFixed( 2 ).replace( /./g, function( c, i, a ) {
				return i && c !== '.' && ( ( a.length - i ) % 3 === 0 ) ? ',' + c : c;
			} );
		},
		prc:			function ( now, earlier ) {
			return ( ( ( now - earlier ) / earlier ) * 100 ).toFixed( 2 );
		},
		debounce:		function debounce( func, wait, immediate ) {
			var timeout;

			return function() {
				var context = this,
					args = arguments,
					later = function() {
						timeout = null;

						if ( ! immediate ) func.apply( context, args );
					},
					callNow = immediate && ! timeout;

					clearTimeout( timeout );
					timeout = setTimeout( later, wait );

				if ( callNow ) func.apply( context, args );
			};
		},
		tickerRate:		200,
		maxPay:			function( opts ) {
			var opts			= $.extend( {
					btc:			0,
					rate:			0.00000625,
					fee:			0.0025,
					lowest_ask:		0,
					profit_margin:	0.001
				}, opts ),
				max_pay			= parseFloat( ( opts.rate - ( opts.rate * ( opts.fee + opts.profit_margin ) ) ).toFixed( 8 ) );

			return max_pay >= opts.lowest_ask ? parseFloat( ( opts.lowest_ask - .00000001 ).toFixed( 8 ) ) : max_pay;
		},
		minSell:			function( opts ) {
			var opts			= $.extend( {
					rate:			0.00000625,
					fee:			0.0025,
					highest_bid:	0,
					profit_margin:	0.001
				}, opts ),
				min_sell		= parseFloat( ( opts.rate * ( 1 + ( opts.fee + opts.profit_margin ) ) ).toFixed( 8 ) )

			return min_sell <= opts.highest_bid ? parseFloat( ( opts.highest_bid + .00000001 ).toFixed( 8 ) ) : min_sell;
		},
		getOwnedCoins:	function() {
			var market = [], myCoins = {};

			if ( typeof allBalances === 'undefined' || typeof allTickerData === 'undefined' || ! privateInfoFetched ) return setTimeout( function() { PLX.getOwnedCoins(); }, 1e3 );

			$.each( allBalances.btcValues, function( coin, val ) {
				if ( ! parseFloat( val ) ) return;
				myCoins[ coin ] = parseFloat( val );
			} );
			$.each( allBalances.marginBalances.balances, function( coin, val ) {
				myCoins[ coin ] += parseFloat( val );
			} );

			PLX.myCoins = myCoins;

			if ( $( '#marketBTC' ).length ) {
				$.each( $( '#marketBTC tbody tr' ), function() {
					var row = $( this );

					if ( parseFloat( row.children( 'td.colEstVal' ).text() ) == 0 ) return;

					market.push( {
						coin:		row.children( 'td.coin' ).text(),
						price:		parseFloat( row.children( 'td.price' ).text() ),
						volume:		parseFloat( row.children( 'td.volume' ).text() ),
						change:		{ day: parseFloat( row.children( 'td.change' ).text() ) },
						balance:	parseFloat( row.children( 'td.colBalance' ).text() )
					} )
				} );

				this.tmpl.add( 'box', {
					title:		'Coins',
					sub_title:	'Total BTC:',
					sub_value:	0,
					data:		[
						'<p>',
						market.length ? JSON.stringify( market ) : '',
						$.map( myCoins, function( i, v ) {
							return '<b>' + v + '</b>: ' + i + '&nbsp;&nbsp;&nbsp;( ' + PLX.numFormat( PLX.toUSD( i ) ) + ' USD )<br>';
						} ),
						'</p>'
					].join( '\n' )
				} );
			}
		},
		getMarginData:	function() {
			var margin		= typeof allBalances === 'object' ? allBalances.marginBalances.info : { pl: 0 },
				marginData	= $.map( margin, function( i, v ) {
					return '<b>' + v + '</b>: ' + i;
				} );

			if ( typeof allTickerData !== 'object' ) return;

			margin.pl = PLX.numFormat( PLX.toUSD( margin.pl ) );
			PLX.tmpl.add( 'box', {
				title:		'Margin',
				sub_title:	'<u>Profit/Loss:</u> ' + margin.pl,
				sub_value:	'',
				data:		[
					'<p style="float:left;">',
						marginData.join( '<br>' ),
					'</p>',
					'<div id="marginHistory"></div>'
				].join( '\n' )
			} );

			setInterval( function() {
				var plBTC	= allBalances.marginBalances.info.pl,
					plUSD	= PLX.numFormat( PLX.toUSD( plBTC ) ),
					posNeg	= plBTC < 0 ? 'valueNegative' : 'valuePositive';

				if ( ! plBTC ) return;

				$( '#marginHistory' ).append( '<div clsas="' + posNeg + '">' + plBTC + '&nbsp;&nbsp;&nbsp;&nbsp;' + plUSD + '</div>' );
			}, 5e3 );
		},
		formatDate:		function( date ) {
			var day		= date.getDate(),
				month	= date.getMonth(),
				year	= date.getFullYear();

			return month + '-' + day + '-' + year + '_' + date.getHours() + '-' + date.getMinutes();
		},
		getVolumeMsg:	function( e, api ) {
			var pair	= $( this ).data( 'pair' ) || 'USDT_BTC',
				btc		= parseFloat( $( this ).data( 'btc' ) || 0 ),
				vol		= PLX.cached.volume[ pair ],
				last	= typeof api.cache.lastBtc === 'undefined' ? { [pair]: btc } : api.cache.lastBtc[ pair ]; 

			return [
				'Session: '			+ ( btc - vol.btc ).toFixed( 8 ) + ' (' + PLX.prc( btc, vol.btc ) + '%)',
				'Last Viewed: '		+ ( btc - last ).toFixed( 8 ) + ' (' + PLX.prc( btc, last) + '%)',
				'24 Hour High: '	+ vol.high24hr,
				'24 Hour Low: '		+ vol.low24hr
			].join( '<br>\n' );
		},
		run:			function() {
			var _this	= this;

			if ( localStorage.getItem( this.plugin_name ) === null ) this._set( {} );

			this.tmpl.add( 'box', {
				title:		'Notes',
				sub_title:	'Buys/Sells',
				sub_value:	'',
				data:		'<pre>' + _this._get( 'notes' ) + '</pre><div><input type="text" data-item="notes" style="max-width: 75%"> <button class="theButton">Save</button></div>',
				handle:		function( el ) {
					$( el ).on( 'click', 'button', function() {
						_this.add( 'notes', $( this ).closest( 'div' ).find( 'input[data-item="notes"]' ).val() );
					} );
				}
			} );

			setTimeout( function() {
				//setInterval( function() {
					PLX.getMarginData();
					PLX.getOwnedCoins();
				//}, 5e3 );
			}, 5e3 );

			var btcToUsdTooltip = $( '<div/>' ).qtip( {
				content: {
					text: function( e, api ) {
						return PLX.numFormat( PLX.toUSD( api.cache.query ) ) || api.cache.query;
					}
				},
				position: {
					target: 'mouse',
					adjust: { mouse: true }
				},
				classes: 'qtip-default qtip-dark qtip-rounded qtip-shadow',
				show: false,
				hide: 'unfocus'
			} ).qtip( 'api' );

			$( 'body' ).on( 'mousedown', function() {
				$( 'body' ).one( 'mouseup', function( e ) {
					var selection = $.trim( ( window.getSelection && window.getSelection() || document.selection && document.selection.createRange() ).toString() );

					if ( ! selection )						return;
					if ( isNaN( PLX.toUSD( selection ) ) )	return;

					btcToUsdTooltip.cache.query = selection;
					btcToUsdTooltip.set( 'content.text', btcToUsdTooltip.get( 'content.text' ) ).show( e );
				} );
			} );

			/*$( 'body' ).on( 'mouseup', function() {
				var regex	= /(?:Buy|Sell)\t([0-9.]+)\t([0-9.]+)/gi,
					data	= window.getSelection().toString();

				if ( ! data.length ) return;

				$.each( data.split( '\n' ), function( i, line ) {
					var matches	= regex.exec( line ),
						btc		= matches ? matches.hasOwnProperty( 1 ) ? matches[ 1 ] : 0 : 0,
						units	= matches ? matches.hasOwnProperty( 2 ) ? matches[ 2 ] : 0 : 0,
						cost	= parseFloat( btc * units ).toFixed( 7 );

					console.log( 'units', units, 'btc', btc, 'cost', cost );
				} );
			} );*/

			$( '#marketTables .tableHead ul.tabs' ).after( $( '<span id="totalVal"></span>' ) );
			tickerEvent = ( function() {
				var originalTickerEvent = tickerEvent;

				return function( args, kwargs ) {
					var totalVal		= 0,
						change;

					if ( ( +new Date | 0 ) - PLX.lastRan < PLX.tickRate ) return;

					PLX.lastRan = +new Date | 0;
					originalTickerEvent.apply( this, arguments );

					if ( ! loggedIn || ! allBalances instanceof Object || ! allTickerData.hasOwnProperty( 'USDT_BTC' ) ) return;

					$.each( $( 'section.marketContainer.active tbody tr.marketRow[data-url!=""]' ), function() {
						var row		= $( this ),
							pair	= row.data( 'url' ).toUpperCase(),
							pairs	= pair.split('_'),
							tick	= allTickerData[ pair ],
							bal		= 0 || parseFloat( allBalances.balances[ pairs[ 1 ] ] ) + parseFloat( allBalances.onOrders[ pairs[ 1 ] ] ) + ( allBalances.marginBalances.balances.hasOwnProperty( pairs[ 1 ] ) ? parseFloat( allBalances.marginBalances.balances[ pairs[ 1 ] ] ) : 0 ),
							btc		= ! bal ? 0 : bal * parseFloat( tick.highestBid ),
							usdt	= ! btc ? 0 : PLX.toUSD( btc );

						if ( pairs[ 0 ] == 'USDT' && btc )	usdt = btc; btc = PLX.toBTC( usdt );
						if ( ! PLX.cached.volume[ pair ] )	PLX.cached.volume[ pair ] = { volume: tick.baseVolume, btc: tick.last, high24hr: tick.high24hr, low24hr: tick.low24hr };
						if ( btc )							row.find( 'td.colEstVal' ).html( PLX.numFormat( usdt ) + '&nbsp;&nbsp;' + btc.toFixed( 4 ) + '&nbsp;&nbsp;' + bal.toFixed( 4 ) + ' ' );

						totalVal += parseFloat( btc );
						row.find( 'td.volume' ).html( parseFloat( row.find( 'td.volume' ).text() ).toFixed( 0 ) );
						row.find( 'td.change' ).data( { pair: pair, btc: tick.last } ).not( '[qtip-created]' ).attr( 'qtip-created', 'true' ).qtip( {
							show: { solo: true },
							content: {
								title: 'Volume: ' + tick.baseVolume,
								text: PLX.getVolumeMsg
							},
							style: {
								classes: 'qtip-default qtip-dark qtip-rounded qtip-shadow',
								width:	'200px'
							},
							position: {
								my: 'bottom center',
								at: 'top center',
								target: 'event'
							},
							hide: {
								fixed: true,
								delay: 300
							},
							events: {
								hide: function( e, api ) {
									if ( typeof api.cache.lastBtc === 'undefined' ) api.cache.lastBtc = {};

									api.cache.lastBtc[ pair ] = tick.last;
								}
							}
						} );
					} );

					if ( totalVal == PLX.cached.totalVal ) {
						change = '';
					} else {
						change = PLX.cached.totalVal > totalVal ? 'valueNegative' : 'valuePositive';
					}

					PLX.cached.totalVal = totalVal;
					$( '#totalVal' ).html( '<span class=' + change + '>' + PLX.numFormat( PLX.toUSD( parseFloat( allBalances.balances.BTC ) + totalVal ) ) + ' ' + totalVal.toFixed( 4 ) + '</span>' );

					if ( ! margin ) return;

					$.each ( $( '#positionsSideTable tbody tr:gt(0), #marginPosition tbody tr:eq(1) td span, #marginBalancesTable tbody tr:lt(5)' ), function() {
						var $pl	= $( this ), pl, prc;

						if ( $pl.parents( '#positionsSideTable' ).length )																$pl = $( this ).find( 'td:eq(3) span' );
						if ( $pl.parents( '#marginBalancesTable' ).length )																$pl = $( this ).find( 'td:eq(1) span' );
						if ( $pl.parents( '#marginPosition' ).length && ! $( '#marginPosition tr:eq(1) td span' ).index( $pl ) >= 1 )	return;

						pl	= parseFloat( $pl.find( '[data-btc]' ).text() || $pl.text().replace( ' BTC', '' ) );
						prc	= ( ( pl / allBalances.marginBalances.info.totalValue ) * 100 ).toFixed( 2 );

						if ( ! isNaN( pl ) && pl !== -Infinity ) $pl.html( prc + '%&nbsp;&nbsp;' + PLX.numFormat( PLX.toUSD( pl ) ) + '&nbsp;&nbsp;&nbsp;<span data-btc>' + pl + '</span>' ) ;
					} );
				}
			} )();

			var whichBuyRow		= 2, // 0-index
				whichSellRow	= 2, // 0-index
				$buyButton		= $( '#buyForm .loginRequired > .cta > .theButton' ),
				$sellButton		= $( '#sellForm .loginRequired > .cta > .theButton' );

			if ( $buyButton )	$buyButton.before( '<button id="quickBuyBtn" class="theButton" type="button" style="margin-right: 7px;">Quick Fill</button>' );
			if ( $sellButton )	$sellButton.before( '<button id="quickSellBtn" class="theButton" type="button" style="margin-right: 7px;">Quick Fill</button>' );

			$( '#quickBuyBtn' ).click( function() {
				var btcToSpend	= $( '#buyTotal' ).val(),
					buyPrice	= $( '#asksTableBody tr' ).eq( whichBuyRow ).find( 'td.orderRate' ).html();

				$( '#buyRate' ).val( buyPrice );

				if ( btcToSpend && btcToSpend > 0 ) {
					$( '#buyTotal' ).trigger( 'keyup' );
				} else {
					$( '#primaryBalance' ).click();
				}
			} );

			$( '#quickSellBtn' ).click( function() {
				var sellAmount		= $( '#sellAmount' ).val(),
					btcToReceive	= $( '#sellTotal' ).val(),
					sellPrice		= $( '#bidsTableBody tr' ).eq( whichSellRow ).find( 'td.orderRate' ).html();

				$( '#sellRate' ).val( sellPrice );

				if ( btcToReceive && btcToReceive > 0 ) {
					if ( sellAmount === $( '#secondaryBalance' ).html() ) {
						$( '#secondaryBalance' ).click();
					} else {
						$( '#sellTotal' ).trigger( 'keyup' );
					}
				} else {
					$( '#secondaryBalance' ).click();
				}
			} );

			window.PLX = PLX;
		},
		tmpl:	{
			add:	function( type, data ) {
				var el;

				if ( ! this.hasOwnProperty( type ) ) return;

				el = this[ type ]( data );
				$( el ).draggable( {
					handle: 'i.fa-arrows',
					create: function( e ) {
						$( this ).position( {
							of: window,
							my: 'left bottom',
							at: 'left+' + ( -111 + ( ( $( this ).index() * 125 ) || 0 ) ) + ' bottom'
						} );
					}
				} )
				.on( 'click', '.fa-minus', function() {
					//console.log( 'allBalances', typeof allBalances );
					$( this ).closest( 'div[data-item].opened' ).removeClass( 'opened' ).addClass( 'closed' )
					.css( 'left', ( -111 + ( ( $( this ).closest( 'div[data-item]' ).index() * 125 ) || 0 ) ) + 'px;' );
				} )
				.on( 'click', '.fa-plus', function() {
					$( this ).closest( 'div[data-item].closed' ).removeClass( 'closed' ).addClass( 'opened' );
				} );
			},
			box:	function( opts ) {
				var opts	= $.extend( {
						title:		'New Box',
						sub_title:	'Hmm...',
						sub_value:	'Something should go here..',
						link:		'',
						data:		'',
						state:		'closed',
						handle:		false
					}, opts ),
					el		= $( [
						'<div class="col ' + opts.state + '" data-item="dynamicBox" data-nth="' + $( 'div[data-item].closed' ).length + '">',
							'<div class="tab head"><i class="fa fa-plus"></i> ' + opts.title + '</div>',
							'<div class="head">',
								'<div class="name"><i class="fa fa-arrows"></i> <i class="fa fa-minus"></i> ' + opts.title + '</div>',
								'<div class="info">',
									'<div class="desc">' + opts.sub_title + '</div>',
									'<div class="details">' + opts.sub_value + '</div>',
								'</div>',
								'<div class="linkContainer">',
									'<div class="link loginRequired">' + opts.link + '</div>',
								'</div>',
							'</div>',
							'<div class="data">' + opts.data + '</div>',
						'</div>'
					].join( '\n' ) );
					//style="left: ' + ( -115 + ( ( $( 'div[data-item].closed' ).length || 1 ) * 125 ) ) + 'px;"

				$( 'body' ).append( el );

				if ( typeof opts.handle === 'function' ) opts.handle.call( el, opts );

				return el;
			}
		}
	};

	return PLX.run();
} )();