'use strict';
/* global google,jQuery,MarkerClusterer */

function cdDojosMapCtrl($scope, $window, $state, $stateParams, $translate, cdDojoService, gmap, Geocoder, atomicNotifyService) {
  $scope.model = {};
  $scope.markers = [];
  var markerClusterer;
  var centerLocation = new google.maps.LatLng(25, -5);

  if (gmap) {
    $scope.mapLoaded = true;
    $scope.mapOptions = {
      center: centerLocation,
      zoom: 2,
      mapTypeId: google.maps.MapTypeId.ROADMAP
    };

    $window.setTimeout(function(){
      if($scope.model.map) {
        var center = $scope.model.map.getCenter();
        google.maps.event.trigger($scope.model.map, 'resize');
        $scope.model.map.setCenter(center);
      }
    }, 100);
  }

  $scope.loadMap = function () {
    clearMarkers();
    cdDojoService.list({verified: 1, deleted: 0}, function (dojos) {
      addMarkersToMap(dojos);
    });

    if($scope.model.map) {
      $scope.model.map.setZoom(2);
      $scope.model.map.setCenter(centerLocation);
      $scope.searchResult = null;
      delete $scope.search.dojo;
    }
  }

  $scope.loadMap();

  if ($stateParams.bannerMessage) {
    var type = $stateParams.bannerType || 'info';
    var timeCollapse = $stateParams.bannerTimeCollapse || 5000;
    switch(type) {
      case 'success':
        atomicNotifyService.success($stateParams.bannerMessage, timeCollapse);
        break;
      default: 
        atomicNotifyService.info($stateParams.bannerMessage, timeCollapse);
        break;
    }
  }

  $scope.$on('$destroy', function(){
    atomicNotifyService.dismissAll();
  });

  $scope.$on('$viewContentLoaded', function() {
    jQuery('body').cookieDisclaimer({
      text: $translate.instant("By using this website you agree to the use of cookies. You can read about our cookie policy <a href='http://ec.europa.eu/ipg/basics/legal/cookies/index_en.htm#section_2'>here</a>."),
      style: "light", // dark,light
      cssPosition: "relative", //fixed,absolute,relative
      acceptBtn: { text: 'x' },
      policyBtn: { active: false },
      cookie: {
        name: "cookieDisclaimer",
        val: "confirmed",
        path: "/",
        expire: 365
      }
    });
  });

  cdDojoService.dojosByCountry({verified: 1, deleted: 0}, function (dojos) {
    $scope.dojoList = dojos;
  });

  $scope.viewDojo = function(dojo) {
    var urlSlug = dojo.url_slug || dojo.urlSlug;
    var urlSlugArray = urlSlug.split('/');
    var country = urlSlugArray[0].toString();
    urlSlugArray.splice(0, 1);
    var path = urlSlugArray.join('/');
    $state.go('dojo-detail',{country:country, path:path});
  }

  $scope.getDojo = function (marker) {
    var dojoId = marker.dojoId;
    cdDojoService.load(dojoId, function (response) {
      $scope.viewDojo(response);
    });
  }

  $scope.openMarkerInfo = function(marker) {
    if (marker.dojoId) {
      $scope.currentMarker = marker;
      $scope.model.markerInfoWindow.open($scope.model.map, marker);
    }
  }

  $scope.search = function () {
    if (!$scope.search.dojo) return;
    $scope.searchResult = null;
    $scope.noResultsFound = null;

    var address = $scope.search.dojo;
    Geocoder.geocode(address).then(function (results) {
      if (!results.length) return;
      var location = results[0].geometry.location;

      if (results[0].geometry.bounds) {
        var bounds = results[0].geometry.bounds;
        $scope.model.map.fitBounds(bounds);
        searchBounds(location, $scope.model.map.getBounds(), true, $scope.search.dojo);
      } else {
        searchNearest(location);
      }
    }, function (reason) {
      console.error(reason);
      $scope.searchResult = true;
      $scope.noResultsFound = $translate.instant('No Dojos match your search query.');
    });
  }

  function clearMarkers() {
    _.each($scope.markers, function (marker) {
      marker.setMap(null);
    });
    $scope.markers = [];
  }

  function searchBounds(location, bounds, fallbackToNearest, search) {
    var boundsRadius = getBoundsRadius(bounds);
    cdDojoService.searchBoundingBox({lat: location.lat(), lon: location.lng(), radius: boundsRadius, search: search}).then(function (result) {
      if (result.length > 0) {
        $scope.searchResult = result;
      }
      else {
        if (fallbackToNearest) {
          searchNearest(location);
        }
      }
    });
  }

  function searchNearest(location) {
    cdDojoService.searchNearestDojos({lat: location.lat(), lon: location.lng()}).then(function (result) {
      if(result.length > 0) {
        $scope.searchResult = result;
      }
      var bounds = new google.maps.LatLngBounds();
      _.each(result, function (dojo) {
        var position = new google.maps.LatLng(dojo.geoPoint && dojo.geoPoint.lat || dojo.geo_point.lat, dojo.geoPoint && dojo.geoPoint.lon || dojo.geo_point.lon)
        bounds.extend(position);
      });
      $scope.model.map.fitBounds(bounds);
    });
  }

  function addMarkersToMap(dojos) {
    if (markerClusterer) markerClusterer.clearMarkers();
    _.each(dojos, function (dojo) {
      if (dojo.geoPoint || dojo.geo_point) {
        var pinColor = dojo.private === 1 ? 'FF0000' : '008000';
        var marker = new google.maps.Marker({
          map: $scope.model.map,
          dojoName: dojo.name,
          dojoId: dojo.id,
          icon: 'http://chart.apis.google.com/chart?chst=d_map_pin_letter&chld=%E2%80%A2|' + pinColor,
          position: new google.maps.LatLng(dojo.geoPoint && dojo.geoPoint.lat || dojo.geo_point.lat, dojo.geoPoint && dojo.geoPoint.lon || dojo.geo_point.lon)
        });
        $scope.markers.push(marker);
      }
    });
    markerClusterer = new MarkerClusterer($scope.model.map, $scope.markers);
  }

  function getBoundsRadius(bounds) {
    var center = bounds.getCenter();
    var northEast = bounds.getNorthEast();
    var earthRadius = 3963.0;
    var lat1 = center.lat() / 57.2958;
    var lon1 = center.lng() / 57.2958;
    var lat2 = northEast.lat() / 57.2958;
    var lon2 = northEast.lng() / 57.2958;
    var distanceInMiles = earthRadius * Math.acos(Math.sin(lat1) * Math.sin(lat2) + Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1));
    return distanceInMiles * 1609.34 //convert to meters
  }

}

angular.module('cpZenPlatform')
  .controller('dojos-map-controller', ['$scope', '$window', '$state', '$stateParams', '$translate', 'cdDojoService', 'gmap', 'Geocoder', 'atomicNotifyService', cdDojosMapCtrl]);