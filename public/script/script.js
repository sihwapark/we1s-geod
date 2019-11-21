var map;
var cityArray = [];
var keyArray = [];
var listWiki = ["",];
var listKey = [];
var lastTopic = -1;
var jsonData;
var totalData = 0;
var clr = "#ff9999";
var strk_opct = 0.4;
var fill_opct = 0.4;
var minCirclesize = 9500;
var unitCirclesize = 500;
var infoWindowZIndex = 0;
var heatmap;
var heatmapRadius = 50;
var heatmapDataPoints = [];
var publishers = [];
var linesToPublishers = [];
var circleVisible = true;
var lineVisible = true;
var maxStrokeWeight = 9;

var params = {};

// heatmap color scheme based on: http://colorbrewer2.org/?type=sequential&scheme=YlGn&n=9
var heatmapGradient = ['rgba(173,221,142,0)','rgb(120,198,121)','rgb(65,171,93)','rgb(35,132,67)','rgb(0,104,55)','rgb(0,69,41)'];

function initInput() {
    var input = document.getElementById("topicInput");

    input.addEventListener("keyup", function(event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            submit();
        }
    });   
}

function previous() {
    if(lastTopic > 1) {
        
        var input = document.getElementById("topicInput");
        input.value = lastTopic - 1;

        drawagain(lastTopic - 1);
    }
}

function next() {
    if(lastTopic <= jsonData.Topics.length - 1) {
        
        var input = document.getElementById("topicInput");
        input.value = lastTopic + 1;

        drawagain(lastTopic + 1);
    }
}

function submit() {
    var topicInput = document.getElementById("topicInput").value;
    drawagain(topicInput);
}

function toggleRadius() {
    unitCirclesize = (unitCirclesize == 500)? 0 : 500;
    resizeCirclesForZoom(true);
}

function toggleCircles() {

    if(typeof cityArray[lastTopic] != 'undefined') {
        circleVisible = !circleVisible;
        for (var i = 0; i < cityArray[lastTopic].length; i++) {
            var cityCircle = cityArray[lastTopic][i];
            cityCircle.setVisible(circleVisible);
        }
    }
}

function toggleLines() {

    if(typeof linesToPublishers[lastTopic] != 'undefined') {
        lineVisible = !lineVisible;
        linesToPublishers[lastTopic].forEach(function(lineToPub) {
            lineToPub.line.forEach(function(segment) {
                segment.setVisible(lineVisible);
            });
            
            lineToPub.publisher.circle.setVisible(lineVisible);
        });
    }
}

function toggleHeatmap() {
    heatmap.setMap(heatmap.getMap() ? null : map);
}

function getDataPointsForAllTopics() {
    heatmapDataPoints = [];
    
    for (var i = 0; i < jsonData.Topics.length; i++) {
        totalData += jsonData.Topics[i].Wikidata.length;
    }

    var dataProccessed = 0;
    //var bounds = new google.maps.LatLngBounds();
    for (var i = 0; i < jsonData.Topics.length; i++) {
        var topicNum = i + 1;

        for (var j = 0; j < jsonData.Topics[i].Wikidata.length; j++){
            var count = Number(jsonData.Topics[i].Wikidata[j].Count);
            
            if (jsonData.Topics[i].Wikidata[j].coord !== null) {
                var lat = jsonData.Topics[i].Wikidata[j].coord[0];
                var lon = jsonData.Topics[i].Wikidata[j].coord[1];
                var coord = new google.maps.LatLng(lat, lon);

                heatmapDataPoints.push({
                    location: coord,
                    weight: count
                });

                //if(count > 10) bounds.extend(coord);
            }

            dataProccessed++;

            //console.log(dataProccessed + "/" + totalData);
        }
    }

    //map.fitBounds(bounds);
    //map.panTo(bounds.getCenter());
}

function compareCount(wikifirst, wikisecond) {
    if(Number(wikifirst.Count) < Number(wikisecond.Count)) return 1;
    else if(Number(wikifirst.Count) > Number(wikisecond.Count)) return -1;

    return 0;
}

function addDataLayerForTopic(num) {

    var wiki = "";
    var keyWord = "";
    cityArray[num] = [];
    var maxCount = -1;
    
    var topic = jsonData.Topics.filter(function(t) { 
                                return Number(t.Topic) == num;
                            })[0];
    var polylines = [];

    for (var j = 0; j < topic.Wikidata.length; j++) {
        var count = Number(topic.Wikidata[j].Count);
        if (topic.Wikidata[j].coord !== null) {
            if(maxCount < count) maxCount = count;
        }
    }

    topic.Wikidata.sort(compareCount);

    for (var j = 0; j < topic.Wikidata.length; j++) {
        var name = topic.Wikidata[j].Title;
        var count = Number(topic.Wikidata[j].Count);

        if (topic.Wikidata[j].coord !== null) {
            var lat = topic.Wikidata[j].coord[0];
            var lon = topic.Wikidata[j].coord[1];
            var radius = unitCirclesize * count + minCirclesize;

            addDataPointCircle(lat, lon, clr, strk_opct, fill_opct, radius, name, num, count, maxCount);
            
            var indexOfCircle = cityArray[num].length - 1;
            wiki += "<li class='item' id=" + num + "-" + indexOfCircle + " onclick='clickForTitle("+num+","+indexOfCircle + ", this)'>" + name + "("+ count + ")</li>";

            var lines = topic.Wikidata[j].Lines;

            if(typeof lines != 'undefined') {
                var lineCoordinate = [
                    {lat:lat, lng:lon},
                    {lat:0, lng:0}
                ];
               
                var startLatLng = new google.maps.LatLng(lineCoordinate[0].lat,lineCoordinate[0].lng);
               
                for(var i = 0; i < lines.length; i++) {
                    var name = lines[i].Line;
                    var latEnd = lines[i].Linecoord[0];
                    var lonEnd = lines[i].Linecoord[1];

                    if(typeof publishers[name] == 'undefined') {
                        var coord = {lat: latEnd, lng: lonEnd};
                        publishers[name] = {coord: coord};
                        addPublisherCircle(name, coord);
                    } else {
                        //if(publishers[name].coord.lat != latEnd || publishers[name].coord.lng != lonEnd)
                        //console.log('coordinate is different:', name, publishers[name], latEnd, lonEnd);
                    }
                    
                    var linecount = Number(lines[i].Linecount);

                    lineCoordinate[1].lat = latEnd;
                    lineCoordinate[1].lng = lonEnd;

                    var endLatLng = new google.maps.LatLng(lineCoordinate[1].lat,lineCoordinate[1].lng);

                    var gradientLine = [];

                    var mainPolyline = new google.maps.Polyline({
                            path: lineCoordinate,
                            geodesic: true,
                            strokeColor: 'rgb(255, 200, 0)',
                            strokeOpacity: 0.15,
                            strokeWeight: Math.min(linecount, maxStrokeWeight)
                    });
                    mainPolyline.setVisible(lineVisible);
                    mainPolyline.setMap(map);

                    gradientLine.push(mainPolyline);

                    var interpolated = google.maps.geometry.spherical.interpolate(startLatLng, endLatLng, 0.1);

                    var gradientLineStart = new google.maps.Polyline({
                        path: [startLatLng, interpolated],
                        geodesic: true,
                        strokeColor: 'rgb(255, 96, 96)',
                        strokeOpacity: 0.2,
                        strokeWeight: Math.min(linecount, maxStrokeWeight),
                    });

                    gradientLineStart.setVisible(lineVisible);
                    gradientLineStart.setMap(map);

                    gradientLine.push(gradientLineStart);

                    interpolated = google.maps.geometry.spherical.interpolate(startLatLng, endLatLng, 0.9);

                    var gradientLineEnd = new google.maps.Polyline({
                        path: [interpolated, endLatLng],
                        geodesic: true,
                        strokeColor: 'rgb(255, 255, 255)',
                        strokeOpacity: 0.2,
                        strokeWeight: Math.min(linecount, maxStrokeWeight),
                    });

                    gradientLineEnd.setVisible(lineVisible);
                    gradientLineEnd.setMap(map);

                    gradientLine.push(gradientLineEnd);

                    polylines.push({line:gradientLine, publisher:publishers[name]});
                }
            }
        }
    }

    linesToPublishers[num] = polylines;
    
    for (var i = 0; i < 20; i++){
        keyWord += "<li>" + keyArray[num - 1][i]+ "</li>";
    }

    listKey[num] = keyWord;
    listWiki[num] = wiki;
}

function clickForTitle(num, indexOfCircle, element) {
    var infoWindow = cityArray[num][indexOfCircle].infoWindow;
    var marker = cityArray[num][indexOfCircle].marker;
    $(element).toggleClass('item');
    $(element).toggleClass('item-active');
    
    if(!cityArray[num][indexOfCircle].infoWindowStaying){
        marker.setVisible(true);
        infoWindow.open(map, marker);
        infoWindow.setZIndex(++infoWindowZIndex);
        id=num + "-" + indexOfCircle 
        cityArray[num][indexOfCircle].infoWindowStaying = true;
        cityArray[num][indexOfCircle].setOptions({strokeOpacity: 1});
    }
    else {
        marker.setVisible(false);
        infoWindow.close();
        infoWindow.setZIndex(0);
        cityArray[num][indexOfCircle].infoWindowStaying = false;
        cityArray[num][indexOfCircle].setOptions({strokeOpacity: strk_opct});
    }
}

//To-Do: add loading animation
function loadData() {
    fetch('keys.txt')
        .then(response => response.text())
        .then((data) => {
            var txtData = data;

            var keyTopic = txtData.trim().split("\n");
            for (var i = 0; i < keyTopic.length; i++){
                var keywordString = keyTopic[i].split("\t")[2];
                var keywords = keywordString.trim().split(" ");
                keyArray.push(keywords);
            }
            
            fetch("Map_Items_Topic_Lines.json")
                .then(function (data){
                    data.json()
                        .then(function (data) {
                            jsonData = data;

                            var topicNum = 1;
                            if(typeof params["topicNum"] != 'undefined') topicNum = parseInt(params["topicNum"]);

                            addDataLayerForTopic(topicNum);      
                            document.getElementById("wikititles").innerHTML = listWiki[topicNum];
                            document.getElementById("keyWords").innerHTML = listKey[topicNum];
                            document.getElementById("total").innerHTML = "(Total: " + cityArray[topicNum].length + ")";
                            lastTopic = topicNum;
                            document.getElementById("topicInput").value = topicNum;
                            getDataPointsForAllTopics();

                            heatmap = new google.maps.visualization.HeatmapLayer({
                                data: heatmapDataPoints,
                                dissipating: true,
                                opacity: 0.8,
                                radius: heatmapRadius,
                                gradient: heatmapGradient,
                                map: map
                            });
                        });
                });
        });
}

function addPublisherCircle(name, coord) {

    var circle = new google.maps.Circle({
        strokeColor: 'white',
        strokeOpacity: strk_opct,
        strokeWeight: 2,
        fillColor: 'white',
        fillOpacity: fill_opct,
        map: map,
        center: coord,
        // zIndex: 9999 - 9999 * count / maxCount,
        radius: minCirclesize * 2
    });

    circle.setVisible(lineVisible);
    publishers[name].circle = circle;
}

//add circles on the map
function addDataPointCircle(lat, lon, clr, strk_opct, fill_opct, radius, name, topicNum, count, maxCount) {

    var coord = {
        lat:lat,
        lng:lon};
    var contentString =
        "<h3>" + name + " (count: " + count + "), Topic " + topicNum + "</h3>";
    
    var circleIndex = cityArray[topicNum].length;

    var infowindow = new google.maps.InfoWindow({
        content: contentString
    });

    var marker = new google.maps.Marker({
        position: coord,
        map: map,
        title: name + topicNum
    });
    marker.setVisible(false);

    marker.addListener('click', function() {
        infowindow.setZIndex(++infoWindowZIndex);
    });

    infowindow.addListener('closeclick', function() {
        cityCircle.infoWindowStaying = false;
        marker.setVisible(false);
        cityCircle.setOptions({strokeOpacity: strk_opct});
        infowindow.setZIndex(0);
        var id= topicNum + "-" + circleIndex;
        var e = document.getElementById(id);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
    });

    var cityCircle = new google.maps.Circle({
        strokeColor: clr,
        strokeOpacity: strk_opct,
        strokeWeight: 2,
        fillColor: clr,
        fillOpacity: fill_opct,
        map: map,
        center: coord,
        zIndex: 9999 - 9999 * count / maxCount,
        radius: radius
    });
    
    cityCircle.infoWindowStaying = false;
    cityCircle.infoWindow = infowindow;
    cityCircle.marker = marker;
    cityCircle.count = count;
    cityCircle.weightedRadius = radius;
    cityCircle.zoomLevel = map.getZoom();
    cityCircle.setMap(map);
    cityCircle.setVisible(circleVisible);

    cityCircle.addListener('mouseover', function () {
        var id= topicNum + "-" + circleIndex;
        document.getElementById(id).scrollIntoView();

        if(cityCircle.infoWindowStaying) return;

        marker.setVisible(true);
        infowindow.setZIndex(++infoWindowZIndex);
        infowindow.open(map, marker);
        cityCircle.setOptions({
                                // zIndex: zIndex,
                                // strokeColor: clr,
                                strokeOpacity: 1
                                // fillOpacity: fill_opct,
                                // radius: circlesize
                            });
        var e = document.getElementById(id);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
        cityCircle.setOptions({ strokeOpacity: 1 });
    });

    cityCircle.addListener('mouseout', function (event) {
        if(cityCircle.infoWindowStaying) return;
        marker.setVisible(false);
        infowindow.close();
        cityCircle.setOptions({strokeOpacity: strk_opct});
        infowindow.setZIndex(0);

        var id= topicNum + "-" + circleIndex;
        var e = document.getElementById(id);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
    });

    cityCircle.addListener('click', function () {
        cityCircle.infoWindowStaying = !cityCircle.infoWindowStaying;
    });

    cityArray[topicNum].push(cityCircle);
}

function hideCircles(topic) {
    if(topic != -1) {
        cityArray[topic].forEach(function(circle) {
            circle.setVisible(false);
        });
    }
}

function hideLines(topic) {
    if(topic != -1) {
        linesToPublishers[topic].forEach(function(lineToPub) {
            lineToPub.line.forEach(function(segment) {
                segment.setVisible(false);
            });
            
            lineToPub.publisher.circle.setVisible(false);
        });
    }
}

function drawagain(selectedTopic){
    selectedTopic = Number(selectedTopic);
    
    if(lastTopic == selectedTopic) return;

    hideCircles(lastTopic);
    hideLines(lastTopic);

    if(typeof cityArray[selectedTopic] == 'undefined') {
        addDataLayerForTopic(selectedTopic);
    } else {
        if(circleVisible) {
            cityArray[selectedTopic].forEach(function(circle) {
                circle.setVisible(true);
            });
        }

        if(lineVisible) {
            linesToPublishers[selectedTopic].forEach(function(lineToPub) {
                lineToPub.line.forEach(function(segment) {
                    segment.setVisible(true);
                });
                
                lineToPub.publisher.circle.setVisible(true);
            })
        }
    }

    document.getElementById("wikititles").innerHTML = listWiki[selectedTopic];
    document.getElementById("keyWords").innerHTML = listKey[selectedTopic];
    document.getElementById("total").innerHTML = "(Total: " + cityArray[selectedTopic].length + ")";
    lastTopic = selectedTopic;
}

function resizeCirclesForZoom(force = false) {
    var zoomLevel = map.getZoom();

    if(force == false && zoomLevel < 5) return;

    var mapBound = map.getBounds();
    if(typeof cityArray[lastTopic] != 'undefined') {
        for (var i = 0; i < cityArray[lastTopic].length; i++) {
            var cityCircle = cityArray[lastTopic][i];
            var circleBound = cityCircle.getBounds();

            if((mapBound.contains(cityCircle.center)) 
                || (mapBound.intersects(circleBound))
                && (force || (cityCircle.zoomLevel != zoomLevel))) {

                var count = cityCircle.count;
                cityCircle.setRadius(scaleRadiusForZoom(zoomLevel, count));
                cityCircle.zoomLevel = zoomLevel;
            }
        }
    }
}

function scaleRadiusForZoom(zoomLevel, count) {
    var radius = unitCirclesize * count + minCirclesize;

    if(zoomLevel > 6) {
        var ratio = (zoomLevel - 5) / 6;
        var scaleFactor = Math.cos(0.5 * Math.PI * ratio);
        if(scaleFactor <= 0.05) scaleFactor = 0.05;

        radius *= scaleFactor;
    }
    
    return radius;
}

function getParams(url) {
//based on the comments and ideas in https://gist.github.com/jlong/2428561
    var parser = document.createElement('a');
    parser.href = url;
    var queries = parser.search.replace(/^\?/, '').split('&');
    var params = {};
    queries.forEach(function(q) {
        var split = q.split('=');
        params[split[0]] = split[1];
    });

    return params;
}

function initMap(){

    params = getParams(window.location.href);

    var center = {
        lat: 39.8283,
        lng: -98.5795
    };
    
    map = new google.maps.Map(document.getElementById('map'), {
        streetViewControl: false,
        fullscreenControlOptions: {
            position: google.maps.ControlPosition.RIGHT_BOTTOM
        },
        mapTypeControl : false,
        center: center,
        zoom: 3
    });

    $.ajax({
      dataType: "json",
      url: "map_style.json",
      success: function(json) {
        var mapType = new google.maps.StyledMapType(json['settings'], {name: 'Styled Map'});
        
        map.mapTypes.set('styled_map', mapType);
        map.setMapTypeId('styled_map');
      }
    });

    loadData();
    initInput();

    map.addListener('dragend', function() {
        resizeCirclesForZoom();
    });

    map.addListener('zoom_changed', function() {
        resizeCirclesForZoom();
    });

    var legend = document.createElement('div');
    legend.className ='legend';
    var div = document.createElement('div');
    div.innerHTML = '<img src="heatmap.gif"> All Topics<br><br><img src="dataPoint.gif">Title Points';
    legend.appendChild(div);
    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);

    var modal = document.getElementById("infoModal");
    var settingWindow = document.getElementById("settingWindow");

    var info = document.getElementById("info");
    var setting = document.getElementById("setting");

    var closeSetting = document.getElementById("close-setting");
    var closeModal = document.getElementById("close-modal");

    info.onclick = function() {
        modal.style.display = "block";
    }

    setting.onclick = function() {
        settingWindow.style.display = "block";
    }

    closeModal.onclick = function() {
        modal.style.display = "none";
    }

    closeSetting.onclick = function() {
        settingWindow.style.display = "none";
    }

    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    }

    window.onkeyup = function(event) {
        if(event.key == ',') previous();
        else if(event.key == '.') next();
    }
}