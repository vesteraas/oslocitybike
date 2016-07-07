# oslocitybike
Pebble Watch application for Oslo City Bike, written using [simply.js](http://simplyjs.io/).

On startup, the application gathers realtime data about bike racks within a radius of 1.5 km from your current location, and then displays the nearest rack.  You can use the UP and DOWN buttons to navigate between the racks.  The racks are sorted by distance.  The information is displayed in the following manner:

```
Rack 1 of 14

Storo Storsenter
0.6km southwest

Bikes: 16, Locks: 23
```

Press and hold the select button to refresh the rack status.  A short vibration indicates when the data is refreshed, and the application then display the nearest rack.
