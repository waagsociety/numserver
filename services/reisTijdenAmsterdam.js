var app = require('express')(),
		request = require('request'),
		fs = require('fs'),
		previousData = require('../previous.json'),
		value;

setInterval( fetchUpdate, 1000 * 60 * 5 );
fetchUpdate();

app.get('/', function( req, res ) {
	res.send( '' + value );
} );

module.exports = app;

function fetchUpdate(){
	request.get( 'http://tools.amsterdamopendata.nl/ndw/data/reistijdenAmsterdam.geojson', function( err, response ){
		//console.log(err || 'no error');
		var features;
		
		try{
			features = JSON.parse( response.body ).features;
		} catch( e ) {
			console.log( e );
		}

		//console.log(features.length);

		var crunched = crunch( features );

		//console.log( crunched );

		fs.writeFile('./previous.json', JSON.stringify( crunched, false, 2));

		var delta = createDelta( previousData.travelTimeOverLength, crunched.travelTimeOverLength );
		previousData = crunched;

		console.log(delta, crunched.travelTimeOverLength );

		value = delta;
	});
}

function crunch( features ){
	var travelTimeTotal = 0,
			lengthTotal = 0,
			travelTimesByType = {},
			lengthByType = {},
			unavailableSegments = 0;

	features.forEach( function( feature ) {
		var type = feature.properties.Type,
				travelTime = feature.properties.Traveltime,
				length = feature.properties.Length;
		
		if(typeof travelTime !== 'number' || isNaN(travelTime)){
			unavailableSegments++;
			return;
		}

		travelTimeTotal += travelTime;
		lengthTotal += length;

		travelTimesByType[ type ] = travelTimesByType[ type ] || 0;
		lengthByType[ type ] = lengthByType[ type ] || 0;

		travelTimesByType[ type ] += travelTime;
		lengthByType[ type ] += length;
	});

	statsByType = {};

	Object.keys( lengthByType ).forEach( function( type ) {
		statsByType[ type ] = {
			travelTimeOverLength: travelTimesByType[ type ] / lengthByType[ type ] * 1000,
			length: lengthByType[ type ],
			travelTime: travelTimesByType[ type ]
		};
	});

	return {
		travelTimeTotal: travelTimeTotal,
		lengthTotal: lengthTotal / 1000,
		travelTimeOverLength: travelTimeTotal / lengthTotal * 1000,
		statsByType: statsByType,
		unavailableSegments: unavailableSegments
	};
}

function createDelta(previous, current){
	var delta;
	if( current > previous) delta = current / previous - 1;
	else if( current < previous ) delta = -previous / current + 1;
	else delta = 0;
	return delta * 100;
}
