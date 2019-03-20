const testPosition = function (options) {
	return new Promise(function (resolve, reject){
		navigator.geolocation.getCurrentPosition(resolve,reject,options);
	});
}

testPosition()
	.then((position) => {
		var coordsRaw = position['coords'];
		console.log(coordsRaw['latitude'] +', ' +coordsRaw['longitude']);
	})
	.catch((err) => {
		console.error(err.message);
	});