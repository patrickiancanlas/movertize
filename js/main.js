$(document).ready(function(){
	bool=false;
	document.addEventListener("deviceready", initialize, false);
	if(!bool)
		initialize();
});

function initialize(){
//initialize variables
	bool=true;
	dist=0.1;
	filter=0;

//hide div
	$('.btn').hide();
	$('.canvas').hide();
	$('#menu').show();
	$('#map-canvas').show();
	
//initialize functions
	initMap();
	initOverlays();
	initGPS();

//initialize listeners
	$('#menu').off().on('click',function(){
		$('.btn').hide();
		$('.canvas').hide();
		$('#back').show();
		$('#menu-canvas').show();
		//stopWatch();
	});
	
	$('#back').off().on('click',function(){
		filter = $('#filter').val();
		$('.btn').hide();
		$('.canvas').hide();
		$('#menu').show();
		$('#map-canvas').empty().show();
		initMap();
		initOverlays();
		initGPS();
	});

    $('.qtyplus').click(function(e){
        e.preventDefault();
        fieldName = $(this).attr('field');
        var currentVal = parseInt($('input[name='+fieldName+']').val());
        if (!isNaN(currentVal)) {
            $('input[name='+fieldName+']').val(currentVal + 50);
			dist+=0.05;
        } else {
            $('input[name='+fieldName+']').val(100);
        }
    });

    $('.qtyminus').click(function(e) {
        e.preventDefault();
        fieldName = $(this).attr('field');
        var currentVal = parseInt($('input[name='+fieldName+']').val());
        if (!isNaN(currentVal) && currentVal > 100) {
            $('input[name='+fieldName+']').val(currentVal - 50);
			dist-=0.05;
        } else {
            $('input[name='+fieldName+']').val(100);
        }
    });
}

//fetch map
function initMap(){
	var opt = {
		zoom: 13,
		mapTypeId: google.maps.MapTypeId.ROADMAP,
		streetViewControl: false,
		panControl: false,
		zoomControlOptions: {
			position: google.maps.ControlPosition.RIGHT_TOP
		}
	}

	map = new google.maps.Map(document.getElementById('map-canvas'), opt);
}

//initialize current marker and rectangle
function initOverlays(){
	curLocMrk = new google.maps.Marker({
		map: map,
		icon:  'img/curLocMrk.png',
	});
	
	radius = new google.maps.Rectangle({
		strokeColor: '#82CAFF',
		strokeOpacity: 1,
		strokeWeight: 1,
		fillColor: '#82CAFF',
		fillOpacity: 0.2,
		map: map
	});
}

//fetch position
function initGPS(){
	var opt = {
		enableHighAccuracy: true,
		frequency: 5000
	}
	
	if(navigator.geolocation){
		geoLoc = navigator.geolocation;
		geoLoc.getCurrentPosition(curLoc, showError, opt);
		watchID = geoLoc.watchPosition(movLoc, showError, opt);
	}
	else
		alert("Location detection is not supported on this device.");
}

//show current position on the map
function curLoc(curPos){
	myLoc = new google.maps.LatLng(curPos.coords.latitude, curPos.coords.longitude);
	map.setCenter(myLoc);
	curLocMrk.setPosition(myLoc);
	mbr();
	locationList();
}

//if position changes, update
function movLoc(newPos){
	var newLoc = new google.maps.LatLng(newPos.coords.latitude, newPos.coords.longitude);
	var lat1 = myLoc.lat();
	var lng1 = myLoc.lng();
	var lat2 = newLoc.lat();
	var lng2 = newLoc.lng();
	var dLat = ((lat2 - lat1) * (Math.PI / 180));
	var dLng = ((lng2 - lng1) * (Math.PI / 180));
	var tLat = ((lat1 + lat2) * (Math.PI / 180));
	
	var R = 6371;
	var x = dLng * Math.cos(tLat/2);
	var y = dLat;
	var d = Math.sqrt(x*x + y*y) * R * 1000;
/*	
	if(d > 100){
		myLoc = newLoc;
		curLoc(newPos);
		return;
	}
*/}

//calculate bounding rectangle
function mbr(){
	var lat = myLoc.lat();
	var lng = myLoc.lng();
	var degrad = Math.PI / 180;
	var lng1 = lng + (dist / (Math.abs(Math.cos(degrad * lat) * 111.1)));
	var lng2 = lng - (dist / (Math.abs(Math.cos(degrad * lat) * 111.1)));
	var lat1 = lat + (dist / 111.1);
	var lat2 = lat - (dist / 111.1);

	bnds=new google.maps.LatLngBounds();
	bnds.extend(new google.maps.LatLng(lat1, lng1));
	bnds.extend(new google.maps.LatLng(lat2, lng2));

	radius.setBounds(bnds);
	map.fitBounds(bnds);
}

//show locations inside the rectangle
function locationList(){
	var inp=[];
	inp.push(myLoc.lat());
	inp.push(myLoc.lng());
	inp.push(dist);
	inp.push(filter);
	
	var marker=null;
	var markers=null;
	markers = [];
	$.ajax({
		type:'post',
		url:'http://www.cloudify-phil.com/movertize/stream',
//		url:'http://localhost/movertize/stream',
		data:{r:'get_locations',d:inp},
		async:true,
		
		success:function(data){
			for(a=0;p=data[a];a++){
				marker = new google.maps.Marker({
					position: new google.maps.LatLng(p.lat, p.lng),
					map: map,
					icon: ('img/'+p.type+'.png'),
					draggable: false,
					animation: google.maps.Animation.DROP,
					title: p.id
				});

				var infowindow = null;
				infowindow = new google.maps.InfoWindow({
					content: ('<div class="infowindow"><h4>'+p.name+'</h4></div>')
				});
				
				infowindow.open(map, marker);
				
				google.maps.event.addListener(marker, 'click', function() {
					$('.btn').hide();
					$('#back').show();
					locationInfo(this.title);
				});
				
				markers.push(marker);
			}
		}
	});
}

//once location clicked, will show location info
function locationInfo(id){
	$('.canvas').hide();
	$('#tbl-info').empty();

	$.ajax({
		type:'post',
		url:'http://www.cloudify-phil.com/movertize/stream',
//		url:'http://localhost/movertize/stream',
		data:{r:'location_info',d:id},
		async:true,
		
		success:function(data){
			$('#tbl-info').append('<thead><tr><th>'+data[0].name+'</th></tr></thead>');
		}
	});
	
	$.ajax({
		type:'post',
		url:'http://www.cloudify-phil.com/movertize/stream',
//		url:'http://localhost/movertize/stream',
		data:{r:'get_ads',d:id},
		async:true,
		
		success:function(data){
			for(a=0;p=data[a];a++){
				var h='<tbody><tr><td></td><th>'+p.title+'</th><tr><td></td><td>'+p.content+'</td></tr></tbody>';
				$('#tbl-info').append(h);
			}
		}
	});
	
	$('#info-canvas').show();
}

function stopWatch(){
	geoLoc.clearWatch(watchID);
}

//position detection errors
function showError(error){
	switch(error.code) 
	{
		case error.PERMISSION_DENIED:
			alert("User denied the request for Geolocation.");
			break;
		case error.POSITION_UNAVAILABLE:
			alert("Location information is unavailable.");
			break;
		case error.TIMEOUT:
			alert("The request to get user location timed out.");
			break;
		case error.UNKNOWN_ERROR:
			alert("An unknown error occurred.");
			break;
	}
}