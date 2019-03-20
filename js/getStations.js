var statusRaw = [];
var stationRaw = [];
var stationHTML = '';
var stationDiv = document.getElementById('stationData');
var isLocation = false;

/* Converting degrees to radians ahead of time for easier Haversine calculations */
const degToRad = function (numDegree) {
	return numDegree * Math.PI / 180;
}

/* Use Haversine equation to compute distance between two Longitude/Latitude sets */
const haversine = function (userLat, userLon, stationLat, stationLon) {
	var radius = 6371;
	var userLatRad = degToRad(userLat);
	var stationLatRad = degToRad(stationLat);
	var deltaLatRad = degToRad((userLat - stationLat));
	var deltaLonRad = degToRad((userLon - stationLon));
	var partOne = Math.sin(deltaLatRad/2) * Math.sin(deltaLatRad/2) + Math.sin(deltaLonRad/2) * Math.sin(deltaLonRad/2) * Math.cos(userLatRad) * Math.cos(stationLatRad);
	var partTwo = Math.atan2(Math.sqrt(partOne), Math.sqrt(1-partOne)) * 2;
	var distance = (Math.round((radius * partTwo * 0.621371) * 100))/100;
	return distance;
}

const currentPosition = function (options) {
	return new Promise(function (resolve, reject){
		navigator.geolocation.getCurrentPosition(resolve,reject,options);
	});
}

const checkJson = function(method, url) {
	return new Promise(function (resolve) {
		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			if(xhr.status === 200 && xhr.readyState === 4) {
				resolve(xhr.response);
			}
		}
		xhr.responseType = 'json';
		xhr.open(method,url,true);
		xhr.send();
	})
}

const getStationsRaw = async function(userLat, userLon, locationStatus) {
	/* Ping Station Status first */
	var statusPull = await checkJson('GET','https://gbfs.citibikenyc.com/gbfs/en/station_status.json');
	/* Get general Station Information */
	var stationPull = await checkJson('GET','https://gbfs.citibikenyc.com/gbfs/en/station_information.json');
	var statusData = statusPull['data'];
	var statusPullRaw = statusData['stations'];
	/* Gets a list of all active stations in the system along with bike and dock availability for each */
	for (var key in statusPullRaw) {
		var currentStationStatus = statusPullRaw[key];
		var currentRenting = currentStationStatus['is_renting'];
		var currentReturning = currentStationStatus['is_returning'];
		if (currentRenting == 1 && currentReturning == 1) {
			var currentJsonStatus = {
				'station_id': currentStationStatus['station_id'],
				'num_bikes_available': currentStationStatus['num_bikes_available'],
				'num_ebikes_available': currentStationStatus['num_ebikes_available'],
				'num_docks_available': currentStationStatus['num_docks_available']
				}
			statusRaw.push(currentJsonStatus);
			}
		}
	var stationPullData = stationPull['data'];
	var stationPullRaw = stationPullData['stations'];
	/* Takes the station status object from above, pulls lon/lat and station names for each station, and puts all the information together as on big object */
	for (var statusKey in statusRaw) {
		var currentStatus = statusRaw[statusKey];
		var currentStatusID = currentStatus['station_id'];
		for (var stationKey in stationPullRaw) {
			var currentStation = stationPullRaw[stationKey];
			var currentStationID = currentStation['station_id'];
			if (currentStatusID == currentStationID) {
				var currentJson = {				
					'station_id': currentStatus['station_id'],
					'name': currentStation['name'],
					'num_bikes_available': currentStatus['num_bikes_available'],
					'num_ebikes_available': currentStatus['num_ebikes_available'],
					'num_docks_available': currentStatus['num_docks_available'],
					'lat': currentStation['lat'],
					'lon': currentStation['lon']
				}
				if (locationStatus == true) {
					currentJson['distance'] = haversine(userLat, userLon, currentJson['lat'], currentJson['lon']);
				}
				stationRaw.push(currentJson);
			}

		}
	}
	/* Not everyone is going to allow current location to be tracked. This provides a fallback: sort by alphabetical order. */
	if (locationStatus == true) {
		stationRaw.sort((a,b) => (a.distance > b.distance) ? 1 : -1)
	}
	else {
		stationRaw.sort((a,b) => (a.name > b.name) ? 1 : -1)
	}
	/* Takes all the information from the combined status/information objects and converts to blocks of HTML to be displayed on webapp */
	for (key in stationRaw) {
		var currentStationFinal = stationRaw[key];
		var currentName = currentStationFinal['name'];
		var currentBikes = currentStationFinal['num_bikes_available'];
		var currentEBikes = currentStationFinal['num_ebikes_available'];
		var currentDocks = currentStationFinal['num_docks_available'];
		var distanceSection = '';
		if (locationStatus == true) {
			var currentDistance = currentStationFinal['distance'] + ' mi.';
			distanceSection = ' (' +currentDistance +')';
		}
		currentDiv = '<section><div class="container-station">\n\t<h3 class="station-name">\n\t\t' +currentName +distanceSection  +'\n\t</h3>\n\t<div class="infoSection classic-bikes">\n\t\t<h4 class="bikes-remaining">\n\t\t\t' +currentBikes +'\n\t\t</h4>\n\t\t<h5 class="descriptor">\n\t\t\tClassic\n\t\t</h5>\n\t</div>\n\t<div class="infoSection ebikes">\n\t\t<h4 class="ebikes-remaining">\n\t\t\t' +currentEBikes +'\n\t\t</h4>\n\t\t<h5 class="descriptor">\n\t\t\tElectric\n\t\t</h5>\n\t</div>\n\t<div class="infoSection docks">\n\t\t<h4 class="docks-remaining">\n\t\t\t' +currentDocks +'\n\t\t</h4>\n\t\t<h5 class="descriptor">\n\t\t\tDocks\n\t\t</h5>\n\t</div>' +'\n</div></section>';
		stationHTML += currentDiv;
	}

	stationDiv.innerHTML = stationHTML;
	}

/* Requests the user's current position or instructs app to use fallback */
currentPosition()
	.then((position) => {
		var coordsRaw = position['coords'];
		var Lat = coordsRaw['latitude'];
		var Lon = coordsRaw['longitude'];
		isLocation = true;
		getStationsRaw(Lat, Lon, isLocation);
	})
	.catch((err) => {
		console.log('Geolocation failed. Using fallback option.');
		var Lat = 0;
		var Lon = 0;
		getStationsRaw(Lat, Lon, isLocation);
	});