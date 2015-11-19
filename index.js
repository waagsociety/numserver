var app = require('express')(),
		services = require('./services/');

app.get('/', function(req, res){
	res.send('' + Math.random());
});

Object.keys( services ).forEach( function( serviceName ) {
	app.use( '/' + serviceName, services[ serviceName ] );
} );

app.listen(2000);
