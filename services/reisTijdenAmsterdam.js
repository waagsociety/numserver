var app = require('express')(),
		request = require('request'),
		fs = require('fs'),
		storedData = require('../storedData.json'),
		extremes = storedData.extremes,
		min = 0,
		max = 100,
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

		var crunched = crunch( features ),
				travelTimeOverLength = crunched.travelTimeOverLength;

		extremes[ 0 ] = Math.min( travelTimeOverLength, extremes[ 0 ] );
		extremes[ 1 ] = Math.max( travelTimeOverLength, extremes[ 1 ] );

		fs.writeFile( './storedData.json', JSON.stringify( {
			extremes: extremes
		} ) );

		value = fit( travelTimeOverLength, extremes[ 0 ], extremes[ 1 ], min, max );
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

function fit( value, min, max, start, end ) {
	value = Math.max( Math.min( value, max ), min );
	var range1 = max - min,
			range2 = end - start;
	return ( ( ( value - min ) / range1 ) * range2 ) + start;
}
