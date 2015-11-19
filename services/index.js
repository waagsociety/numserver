var fs = require('fs');

fs.readdirSync( __dirname ).forEach( makeRegisterTransformer( __dirname + '/' ) );

function makeRegisterTransformer( folder ) {
	return function registerTransformer( fileName ) {
		var name = fileName.split( '.' );
		name.pop();
		name = name.join( '.' );
		if( name !== 'index' ){
			module.exports[name] = require( folder + fileName );
		}
	};
}
