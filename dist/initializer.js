( function() {
	function injectStyle( file ) {
		var style	= document.createElement( 'link' );

		style.rel	= 'stylesheet';
		style.type	= 'text/css';
		style.href	= chrome.extension.getURL( file );

		( document.head || document.documentElement ).appendChild( style );
	}

	function injectScript( file, node ) {
		var th	= document.getElementsByTagName( node )[ 0 ],
			s	= document.createElement( 'script' );

		s.setAttribute( 'type', 'text/javascript' );
		s.setAttribute( 'src', chrome.extension.getURL( file ) );
		th.appendChild( s );
	}

	injectStyle( 'style.css' );
	injectScript( 'user.js', 'body' );
} )();
