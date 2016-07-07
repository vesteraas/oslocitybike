var firstRun = true;

var WGS84_a = 6378137.0;
var WGS84_b = 6356752.3;

function deg2rad(degrees) {
    return Math.PI * degrees / 180.0;
}

function rad2deg(radians) {
    return 180.0 * radians / Math.PI;
}

function WGS84EarthRadius(lat) {
    var An = WGS84_a * WGS84_a * Math.cos(lat);
    var Bn = WGS84_b * WGS84_b * Math.sin(lat);
    var Ad = WGS84_a * Math.cos(lat);
    var Bd = WGS84_b * Math.sin(lat);
    return Math.sqrt((An * An + Bn * Bn) / (Ad * Ad + Bd * Bd));
}

function getBoundingBox(_lat, _lon, _halfSide) {
    var lat = deg2rad(_lat);
    var lon = deg2rad(_lon);

    var halfSide = 1000 * _halfSide;

    var radius = WGS84EarthRadius(lat);
    var pRadius = radius * Math.cos(lat);

    return {
        latMin: rad2deg(lat - halfSide / radius),
        latMax: rad2deg(lat + halfSide / radius),
        lonMin: rad2deg(lon - halfSide / pRadius),
        lonMax: rad2deg(lon + halfSide / pRadius)
    };
}

function getDistanceBetween(lat1, lon1, lat2, lon2) {
    var radlat1 = deg2rad(lat1);
    var radlat2 = deg2rad(lat2);
    var theta = lon1 - lon2;
    var radtheta = deg2rad(theta);
    var dist = Math.sin(radlat1) * Math.sin(radlat2) + Math.cos(radlat1) * Math.cos(radlat2) * Math.cos(radtheta);
    dist = Math.acos(dist);
    dist = rad2deg(dist);
    dist = dist * 60 * 1.1515;
    return Math.round(dist * 1.609344 * 10) / 10;
}

function getCardinal(angle) {
    var directions = 8;

    var degree = 360 / directions;
    angle = angle + degree / 2;

    if (angle >= 0 * degree && angle < 1 * degree) {
        return "north";
    } else if (angle >= 1 * degree && angle < 2 * degree) {
        return "northeast";
    } else if (angle >= 2 * degree && angle < 3 * degree) {
        return "east";
    } else if (angle >= 3 * degree && angle < 4 * degree) {
        return "southeast";
    } else if (angle >= 4 * degree && angle < 5 * degree) {
        return "south";
    } else if (angle >= 5 * degree && angle < 6 * degree) {
        return "southwest";
    } else if (angle >= 6 * degree && angle < 7 * degree) {
        return "west";
    } else if (angle >= 7 * degree && angle < 8 * degree) {
        return "northwest";
    }
}

function getBearing(lat1, lon1, lat2, lon2) {
    var radlat1 = deg2rad(lat1);
    var radlon1 = deg2rad(lon1);
    var radlat2 = deg2rad(lat2);
    var radlon2 = deg2rad(lon2);

    var dLon = radlon2 - radlon1;
    var dPhi = Math.log(Math.tan(radlat2 / 2.0 + Math.PI / 4.0) / Math.tan(radlat1 / 2.0 + Math.PI / 4.0));

    if (Math.abs(dLon) > Math.PI) {
        if (dLon > 0.0) {
            dLon = -(2.0 * Math.PI - dLon);
        } else {
            dLon = (2.0 * Math.PI + dLon);
        }
    }

    return getCardinal((rad2deg(Math.atan2(dLon, dPhi)) + 360.0) % 360.0);
}

function createDistanceComparator(lat, lon) {
    return function (a, b) {
        var distA = getDistanceBetween(lat, lon, a.Center.Latitude, a.Center.Longitude);
        var distB = getDistanceBetween(lat, lon, b.Center.Latitude, b.Center.Longitude);

        if (distA < distB) {
            return -1;
        }
        if (distA > distB) {
            return 1;
        }

        return 0;
    };
}

function sortArrayByDistance(array, lat, lon) {
    var data = array.sort(createDistanceComparator(lat, lon));
    data.forEach(function (rack) {
        rack.Distance = getDistanceBetween(lat, lon, rack.Center.Latitude, rack.Center.Longitude) + "km";
        rack.Direction = getBearing(lat, lon, rack.Center.Latitude, rack.Center.Longitude);

        delete rack.Center;
    });
    return data;
}

function setText(count, total, rack) {
    simply.text({
        title: 'Rack ' + (count + 1) + ' of ' + total,
        subtitle: '\n' + rack.Title + ', ' + rack.Distance + ' ' + rack.Direction + '\n\nBikes: ' + rack.Availability.Bikes + ', Locks: ' + rack.Availability.Locks
    });
}

function getNearbyBikeRacks() {
    navigator.geolocation.getCurrentPosition(function (pos) {
        pos.coords.latitude = 59.95056;
        pos.coords.longitude = 10.78198;

        var boundingBox = getBoundingBox(pos.coords.latitude, pos.coords.longitude, 2.5);

        var url = 'http://reisapi.ruter.no/Place/GetCityBikeStations?longmin=' +
            boundingBox.lonMin + '&longmax=' +
            boundingBox.lonMax + '&latmin=' +
            boundingBox.latMin + '&latmax=' +
            boundingBox.latMax;

        console.log(url);

        ajax({url: url, type: 'json', headers: {'Accept': 'application/json'}}, function (data) {
            if (!firstRun) {
                simply.vibe('short');
            }
            firstRun = false;
            if (data.length > 0) {
                var racks = sortArrayByDistance(data, pos.coords.latitude, pos.coords.longitude);
                var current = 0;

                localStorage.setItem('current', current);
                localStorage.setItem('racks', JSON.stringify(data));

                setText(0, racks.length, racks[current]);
            } else {
                simply.text({title: 'No racks nearby!', subtitle: 'You are out of range!'});
                localStorage.setItem('current', 0);
                localStorage.setItem('racks', '[]');
            }
        });
    });
}

simply.on('singleClick', function (e) {
    var racks = JSON.parse(localStorage.getItem('racks'));
    var current = localStorage.getItem('current');

    if (e.button === 'up') {
        if (current > 0) {
            current--;
        } else {
            current = racks.length - 1;
        }
    } else if (e.button === 'down') {
        if (current < racks.length - 1) {
            current++;
        } else {
            current = 0;
        }
    } else {
        return;
    }

    localStorage.setItem('current', current);

    var rack = racks[current];

    if (rack) {
        setText(current, racks.length, rack);
    }
});

simply.style('small');
simply.fullscreen(true);

simply.on('longClick', function (e) {
    if (e.button === 'select') {
        getNearbyBikeRacks();
    }
});

simply.text({title: 'OsloCityBike', subtitle: 'Find the nearest bike!'});

setTimeout(function () {
    getNearbyBikeRacks();
}, 2000);
