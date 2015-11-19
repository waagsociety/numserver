var app = require('express')(),
		request = require('request'),
		fs = require('fs'),
		storedData = require('../storedData.json'),
		valueStoreFilename = './values.csv',
		extremes = storedData.extremes || [ Infinity, -Infinity ],
		extremesH = storedData.extremesH || [ Infinity, -Infinity ],
		extremesO = storedData.extremesO || [ Infinity, -Infinity ],
		min = 0,
		max = 100,
		constipation,
		constipationH,
		constipationO;

fetchUpdate();
setInterval( fetchUpdate, 1000 * 60 * 5 );

app.get('/', function( req, res ) {
	res.send( '' + constipation );
} );

module.exports = app;

function fetchUpdate(){
	var t = Date.now();
	request.get( 'http://tools.amsterdamopendata.nl/ndw/data/reistijdenAmsterdam.geojson', function( err, response ){
		//console.log(err || 'no error');
		var features;
		
		try{
			features = JSON.parse( response.body ).features;
		} catch( e ) {
			console.log( e );
			return;
		}

		//console.log(features.length);

		var responseTime = Date.now() - t,
				crunched = crunch( features ),
				kmhAvg = crunched.kmhAvg,
				kmhAvgH = crunched.statsByType.H.kmhAvg,
				kmhAvgO = crunched.statsByType.O.kmhAvg;

		extremes[ 0 ] = Math.min( kmhAvg, extremes[ 0 ] );
		extremes[ 1 ] = Math.max( kmhAvg, extremes[ 1 ] );
		extremesH[ 0 ] = Math.min( kmhAvgH, extremesH[ 0 ]);
		extremesH[ 1 ] = Math.max( kmhAvgH, extremesH[ 1 ]);
		extremesO[ 0 ] = Math.min( kmhAvgO, extremesO[ 0 ]);
		extremesO[ 1 ] = Math.max( kmhAvgO, extremesO[ 1 ]);

		fs.writeFile( './storedData.json', JSON.stringify( {
			extremes: extremes,
			extremesH: extremesH,
			extremesO: extremesO
		} ) );

		constipation = fit( kmhAvg, extremes[ 0 ], extremes[ 1 ], min, max );
		constipationH = fit( kmhAvgH, extremesH[ 0 ], extremesH[ 1 ], min, max );
		constipationO = fit( kmhAvgO, extremesO[ 0 ], extremesO[ 1 ], min, max );
		console.log( 'constipation:', constipation, kmhAvg, extremes );
		console.log( 'constipationH:', constipationH, kmhAvgH, extremesH );
		console.log( 'constipationO:', constipationO, kmhAvgO, extremesO );

		fs.exists( valueStoreFilename, function( exists ){
			if( !exists ) fs.writeFileSync( valueStoreFilename, [
				'time',
				'responseTime',
				'km/h',
				'constipation',
				'km/h H',
				'constipation H',
				'km/h O',
				'constipation O'
			].join( ', ' ) + '\n', 'utf8' );

			fs.appendFile( valueStoreFilename, [
				new Date().toISOString(),
				responseTime,
				kmhAvg,
				constipation,
				kmhAvgH,
				constipationH,
				kmhAvgO,
				constipationO
			].join( ', ' ) + '\n' );
		} );
	} );
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
			kmhAvg: travelTimesByType[ type ] / lengthByType[ type ] * 1000,
			length: lengthByType[ type ],
			travelTime: travelTimesByType[ type ]
		};
	});

	return {
		travelTimeTotal: travelTimeTotal,
		lengthTotal: lengthTotal / 1000,
		kmhAvg: travelTimeTotal / lengthTotal * 1000,
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
