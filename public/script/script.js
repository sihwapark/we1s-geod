var map;
var cityArray = [];
var keyArray = [];
var listWiki = ["",];
var listPublisher = [];
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
var selectedPublishers = [];
var selectedTitles = [];

var CustomPopup;

var params = {};
var dataFolder = "" // if it is using node.js version, it should be "" otherwise "data/"
var imageFolder = "" // if it is using node.js version, it should be "" otherwise "images/"

// heatmap color scheme based on: http://colorbrewer2.org/?type=sequential&scheme=YlGn&n=9
var heatmapGradient = ['rgba(173,221,142,0)','rgb(120,198,121)','rgb(65,171,93)','rgb(35,132,67)','rgb(0,104,55)','rgb(0,69,41)'];
var lineGradient = ['rgb(255, 200, 0)', 'rgb(255, 96, 96)', 'rgb(255, 255, 255)'];
var lineOpacity = [0.15, 0.2, 0.2];
var lineOpacitySelected = [0.5, 0.3, 0.3];

var isUinonSearch = false;

publishers.makeGradientSelected = function(pubID, topicNum, cityIndex=-1) {
    let allCity = (cityIndex == -1);
    this[pubID].polylines[topicNum].forEach(function(polylines) {
        if(allCity || (polylines.cityIndex == cityIndex)) {            
            polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: lineGradient[i], strokeOpacity: lineOpacitySelected[i]}); });
        }
    });
};

publishers.changeLinesColor = function(pubID, topicNum, color, opacity, cityIndex=-1) {
    let allCity = (cityIndex == -1);
    this[pubID].polylines[topicNum].forEach(function(polylines) { 
        if(allCity || (polylines.cityIndex == cityIndex))
            polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: color, strokeOpacity: opacity}); });
    });
};

// Loader example from :https://stackoverflow.com/questions/22131821/how-can-i-display-a-loading-gif-until-an-entire-html-page-has-been-loaded/22131856
function hideLoader() {
    $('#loading').hide();
}

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
            var cityCircle = cityArray[lastTopic][i].circle;
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

function addDataLayerForTopic(num) {

    var wiki = "";
    var pub = "";
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

    topic.Wikidata.sort(function(wikifirst, wikisecond) {
        return Number(wikisecond.Count) - Number(wikifirst.Count);
    });

    var pubList = [];
    var zoomLevel = map.getZoom();
    for (var j = 0; j < topic.Wikidata.length; j++) {
        var name = topic.Wikidata[j].Title;
        var count = Number(topic.Wikidata[j].Count);

        if (topic.Wikidata[j].coord !== null) {
            var lat = topic.Wikidata[j].coord[0];
            var lon = topic.Wikidata[j].coord[1];
            var radius = scaleRadiusForZoom(zoomLevel, count);

            addDataPointCircle(lat, lon, clr, strk_opct, fill_opct, radius, name, num, count, maxCount);
            
            var indexOfCircle = cityArray[num].length - 1;
            wiki += "<li class='item' id=" + num + "-" + indexOfCircle + " onclick='clickForTitle(" + num + "," + indexOfCircle + ", this)'>" + name + " (" + count + ")</li>";

            var lines = topic.Wikidata[j].Lines;
            var totalLines = 0;
            if(typeof lines != 'undefined' && lines.length > 0) {

                var lineCoordinate = [
                    {lat:lat, lng:lon},
                    {lat:0, lng:0}
                ];
               
                var startLatLng = new google.maps.LatLng(lineCoordinate[0].lat,lineCoordinate[0].lng);
                
                for(var i = 0; i < lines.length; i++) {
                    var pubName = lines[i].Line;
                    var latEnd = lines[i].Linecoord[0];
                    var lonEnd = lines[i].Linecoord[1];
                    var linecount = Number(lines[i].Linecount);
                    totalLines += linecount;
                    
                    // in some cases, names are the same but coods are different
                    // so to prevent it, uniqueID combined wiht coord is used.
                    var uniqueID = pubName + '(' + latEnd + ',' + lonEnd +')';
                    var coord = {lat: latEnd, lng: lonEnd};
                    if(typeof publishers[uniqueID] == 'undefined') {
                        
                        publishers[uniqueID] = {id: uniqueID, name: pubName, coord: coord, counts:[], polylines:[]};
                        publishers[uniqueID].counts[num] = linecount;
                        var radius = scaleRadiusForZoom(zoomLevel, 0);
                        addPublisherCircle(num, uniqueID, pubName, coord, radius);

                        pubList.push(publishers[uniqueID]);
                    } else {    
                        if(typeof publishers[uniqueID].counts[num] != 'undefined')
                            publishers[uniqueID].counts[num] += linecount;
                        else {
                            publishers[uniqueID].counts[num] = linecount;
                            pubList.push(publishers[uniqueID]);
                        }

                        publishers[uniqueID].circle.setVisible(lineVisible);
                        // console.log(publishers[uniqueID]);
                    }

                    cityArray[num][indexOfCircle].publisherID.push(uniqueID);

                    lineCoordinate[1].lat = latEnd;
                    lineCoordinate[1].lng = lonEnd;

                    var endLatLng = new google.maps.LatLng(lineCoordinate[1].lat,lineCoordinate[1].lng);

                    var gradientLine = [];

                    var mainPolyline = new google.maps.Polyline({
                            path: lineCoordinate,
                            geodesic: true,
                            strokeColor: lineGradient[0] ,
                            strokeOpacity: lineOpacity[0],
                            strokeWeight: Math.min(linecount, maxStrokeWeight)
                    });
                    mainPolyline.setVisible(lineVisible);
                    mainPolyline.setMap(map);

                    gradientLine.push(mainPolyline);

                    var interpolated = google.maps.geometry.spherical.interpolate(startLatLng, endLatLng, 0.1);

                    var gradientLineStart = new google.maps.Polyline({
                        path: [startLatLng, interpolated],
                        geodesic: true,
                        strokeColor: lineGradient[1],
                        strokeOpacity: lineOpacity[1],
                        strokeWeight: Math.min(linecount, maxStrokeWeight),
                    });

                    gradientLineStart.setVisible(lineVisible);
                    gradientLineStart.setMap(map);

                    gradientLine.push(gradientLineStart);

                    interpolated = google.maps.geometry.spherical.interpolate(startLatLng, endLatLng, 0.9);

                    var gradientLineEnd = new google.maps.Polyline({
                        path: [interpolated, endLatLng],
                        geodesic: true,
                        strokeColor: lineGradient[2],
                        strokeOpacity: lineOpacity[2],
                        strokeWeight: Math.min(linecount, maxStrokeWeight),
                    });

                    gradientLineEnd.setVisible(lineVisible);
                    gradientLineEnd.setMap(map);

                    gradientLine.push(gradientLineEnd);

                    polylines.push({line:gradientLine, publisher:publishers[uniqueID]});

                    if(typeof publishers[uniqueID].polylines[num] == 'undefined')
                        publishers[uniqueID].polylines[num] = [];
                    publishers[uniqueID].polylines[num].push({line: gradientLine, cityIndex: indexOfCircle});
                }
            } //else console.log("lines are undefined");

            //console.log(name, count, totalLines);
        }
    }

    linesToPublishers[num] = polylines;
    
    for (var i = 0; i < 20; i++){
        keyWord += "<li>" + keyArray[num - 1][i]+ "</li>";
    }

    pubList.sort(function(pubA, pubB) { return pubB.counts[num] - pubA.counts[num]});

    pubList.forEach(function(p) {
        pub += "<li class='item' id='" + p.id + "' onclick=\"clickForPublisher(" + num + ", this)\">" + p.name + " (" + p.counts[num] + ") </li>";

        // wiki += "<li class='item' id=" + num + "-" + indexOfCircle + " onclick='clickForTitle("+num+","+indexOfCircle + ", this)'>" + name + " ("+ count + ")</li>";
    });

    listKey[num] = keyWord;
    listPublisher[num] = pub;
    listWiki[num] = wiki;
}

function changeAllLinesColor(topicNum, color, opacity) {
    linesToPublishers[topicNum].forEach(function(polylines) {
        polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: color, strokeOpacity: opacity}); });
    });
}

function makeAllLinesGradient(topicNum) {
    linesToPublishers[topicNum].forEach(function(polylines) {
        polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: lineGradient[i], strokeOpacity: lineOpacity[i]}); });
    });
}

function deselectAllPublishers() {
    
    selectedPublishers.forEach(function(pub) {
        $(pub.element).toggleClass('item');
        $(pub.element).toggleClass('item-active');

        let circle = publishers[pub.id].circle;
        var infoWindow = circle.infoWindow;
        var marker = circle.marker;

        toggleCircle(circle, infoWindow, marker);

        if(isUinonSearch) {
            publishers.changeLinesColor(pub.id, lastTopic, 'rgb(0, 0, 0)', 0.1);
        }
    });

    selectedPublishers = [];
    
    if(selectedTitles.length == 0) {
        makeAllLinesGradient(lastTopic);
        toggleSearchFilter(false);
    } else {

        selectedTitles.forEach(function(title) {
             title.publisherID.forEach(function(pubID) {
                publishers.makeGradientSelected(pubID, lastTopic, title.id);
            });
        });
    }

    document.getElementById('deselectPublishers').style.visibility = 'hidden';
}

function deselectAllTitles() {
    
    selectedTitles.forEach(function(title) {
        $(title.element).toggleClass('item');
        $(title.element).toggleClass('item-active');

        let circle = cityArray[lastTopic][title.id].circle;
        var infoWindow = circle.infoWindow;
        var marker = circle.marker;

        toggleCircle(circle, infoWindow, marker);

        if(isUinonSearch) {
             title.publisherID.forEach(function(pubID) {
                publishers.changeLinesColor(pubID, lastTopic, 'rgb(0, 0, 0)', 0.1);
            });
        }
    });

    selectedTitles = [];
        
    if(selectedPublishers.length == 0) {
        makeAllLinesGradient(lastTopic);
        toggleSearchFilter(false);
    } else {
        selectedPublishers.forEach(function(pub){
            publishers.makeGradientSelected(pub.id, lastTopic);
        });    
    }

    document.getElementById('deselectTitles').style.visibility = 'hidden';
}

function toggleCircle(circle, infoWindow, marker) {

    if(!circle.infoWindowStaying) {
        marker.setVisible(true);
        infoWindow.open(map, marker);
        infoWindow.setZIndex(++infoWindowZIndex);
        circle.infoWindowStaying = true;
        circle.setOptions({strokeOpacity: 1});
    } else {
        marker.setVisible(false);
        infoWindow.close();
        infoWindow.setZIndex(0);
        circle.infoWindowStaying = false;
        circle.setOptions({strokeOpacity: strk_opct});
    }
}

function toggleSearchFilter(on) {
    let filter = document.getElementById('searchFilter');
    if(on) {
        filter.style.width = '52px';
        filter.style.visibility = 'visible';
    } else {
        filter.style.width = '0';
        filter.style.visibility = 'hidden';
    }
}

function toggleLineFromPublisher(topicNum, pubID, element) {
    let deselect = document.getElementById('deselectPublishers');
    let found = selectedPublishers.find(function(pub) { return pub.id == pubID; });

    if(typeof found == 'undefined') { // selected
        if(selectedPublishers.length == 0) { // if it is the first selection, black out all lines first
            changeAllLinesColor(topicNum, 'rgb(0, 0, 0)', 0.1);
            
            deselect.style.visibility = 'visible'; // show the Deselect All Publishers button

            toggleSearchFilter(true);
        }

        selectedPublishers.push({id: pubID, element: element});
        

        if(selectedTitles.length == 0) { // if no title is selected
            publishers.makeGradientSelected(pubID, topicNum);
        } else { // if not
            if(isUinonSearch) { // Union operation with selectedTitles
                selectedTitles.forEach(function(title) {
                    title.publisherID.forEach(function(pID) {
                        publishers.makeGradientSelected(pID, topicNum, title.id);            
                    });
                });
            }

            publishers[pubID].polylines[topicNum].forEach(function(polylines) {
                let found = selectedTitles.find(function(title) { return polylines.cityIndex == title.id; });
                if(isUinonSearch || typeof found != 'undefined') { // Intersection operation with selectedTitles
                    polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: lineGradient[i], strokeOpacity: lineOpacitySelected[i]}); });
                }
            });
        }
    } else { // deselected
        let idx = selectedPublishers.indexOf(found);
        selectedPublishers.splice(idx, 1);

        if(selectedPublishers.length == 0) {
            if(selectedTitles.length == 0) {
                makeAllLinesGradient(topicNum);
                toggleSearchFilter(false);
            } else {
                if(isUinonSearch) publishers.changeLinesColor(found.id, topicNum, 'rgb(0, 0, 0)', 0.1);

                selectedTitles.forEach(function(title) {
                     title.publisherID.forEach(function(pID) {
                        publishers.makeGradientSelected(pID, topicNum, title.id);            
                    });
                });
            }

            deselect.style.visibility = 'hidden';
        } else {
            publishers.changeLinesColor(found.id, topicNum, 'rgb(0, 0, 0)', 0.1);

            if(isUinonSearch) { // Union operation with selectedTitles
                selectedTitles.forEach(function(title) {
                    title.publisherID.forEach(function(pID) {
                        publishers.makeGradientSelected(pID, topicNum, title.id);            
                    });
                });
            }
        }
    }
}

function clickForPublisher(topicNum, element) {
    let pubID = element.id;
    $(element).toggleClass('item');
    $(element).toggleClass('item-active');
    
    toggleLineFromPublisher(topicNum, pubID, element);

    let circle = publishers[pubID].circle;
    var infoWindow = circle.infoWindow;
    var marker = circle.marker;

    toggleCircle(circle, infoWindow, marker);
}

function toggleLineFromTitle(topicNum, titleID, publisherID, element) {
    let deselect = document.getElementById('deselectTitles');
    let found = selectedTitles.find(function(title) { return title.id == titleID; });
    if(typeof found == 'undefined') {
        if(selectedTitles.length == 0) {
            changeAllLinesColor(topicNum, 'rgb(0, 0, 0)', 0.1);

            deselect.style.visibility = 'visible';
            toggleSearchFilter(true);
        }

        selectedTitles.push({id: titleID, publisherID: publisherID, element: element});

        if(selectedPublishers.length == 0) {
            publisherID.forEach(function(pubID) {
                publishers.makeGradientSelected(pubID, topicNum, titleID);
            });
        } else {
            if(isUinonSearch) { // Union operation with selectedPublishers
                selectedPublishers.forEach(function(pub){
                    publishers.makeGradientSelected(pub.id, topicNum);
                });
            }

            publisherID.forEach(function(pubID) {
                let found = selectedPublishers.find(function(pub) { return pub.id == pubID; });
                
                if(isUinonSearch || typeof found != 'undefined') {
                    publishers.makeGradientSelected(pubID, topicNum, titleID);    
                }
            });
        }

    } else {
        let idx = selectedTitles.indexOf(found);
        selectedTitles.splice(idx, 1);

        if(selectedTitles.length == 0) {
            if(selectedPublishers.length == 0) {
                makeAllLinesGradient(topicNum);
                toggleSearchFilter(false);
            } else {

                if(isUinonSearch) { // Union operation with selectedTitles
                    found.publisherID.forEach(function(pubID) {
                        publishers.changeLinesColor(pubID, topicNum, 'rgb(0, 0, 0)', 0.1, titleID);
                    }); 
                }

                selectedPublishers.forEach(function(pub){
                    publishers.makeGradientSelected(pub.id, topicNum);
                });    
            }

            deselect.style.visibility = 'hidden';
            
        } else {

            found.publisherID.forEach(function(pubID) {
                publishers.changeLinesColor(pubID, topicNum, 'rgb(0, 0, 0)', 0.1, titleID);
            });

            if(isUinonSearch) { // Union operation with selectedTitles
                selectedPublishers.forEach(function(pub){
                    publishers.makeGradientSelected(pub.id, topicNum);
                });  
            }
        }
    }
}

function redrawLines() {
    changeAllLinesColor(lastTopic, 'rgb(0, 0, 0)', 0.1);

    if(isUinonSearch) {
        selectedPublishers.forEach(function(pub){
            publishers.makeGradientSelected(pub.id, lastTopic);
        });

        selectedTitles.forEach(function(title) {
            title.publisherID.forEach(function(pID) {
                publishers.makeGradientSelected(pID, lastTopic, title.id);            
            });
        });
    } else {
        if(selectedTitles.length == 0) { // if no title is selected
            selectedPublishers.forEach(function(pub){
                publishers.makeGradientSelected(pub.id, lastTopic);
            });
        } else if(selectedPublishers.length == 0) {
            selectedTitles.forEach(function(title) {
                title.publisherID.forEach(function(pID) {
                    publishers.makeGradientSelected(pID, lastTopic, title.id);            
                });
            });
        } else {
            selectedPublishers.forEach(function(pub){
                publishers[pub.id].polylines[lastTopic].forEach(function(polylines) {
                    let found = selectedTitles.find(function(title) { return polylines.cityIndex == title.id; });
                    if(typeof found != 'undefined') {
                        polylines.line.forEach(function(line, i) { line.setOptions({strokeColor: lineGradient[i], strokeOpacity: lineOpacitySelected[i]}); });
                    }
                });
            });
        }
    }
}

function clickForTitle(topicNum, indexOfCircle, element) {
    var infoWindow = cityArray[topicNum][indexOfCircle].circle.infoWindow;
    var marker = cityArray[topicNum][indexOfCircle].circle.marker;
    $(element).toggleClass('item');
    $(element).toggleClass('item-active');
    
    let publisherID =  cityArray[topicNum][indexOfCircle].publisherID;
    toggleLineFromTitle(topicNum, indexOfCircle, publisherID, element);
    
    toggleCircle(cityArray[topicNum][indexOfCircle].circle, infoWindow, marker);
}

//To-Do: add loading animation
function loadData() {
    fetch(dataFolder +'keys.txt')
        .then(response => response.text())
        .then((data) => {
            var txtData = data;

            var keyTopic = txtData.trim().split("\n");
            for (var i = 0; i < keyTopic.length; i++){
                var keywordString = keyTopic[i].split("\t")[2];
                var keywords = keywordString.trim().split(" ");
                keyArray.push(keywords);
            }
            
            fetch(dataFolder +"Map_Items_Topic_Lines.json")
                .then(function (data){
                    data.json()
                        .then(function (data) {
                            jsonData = data;

                            var topicNum = 1;
                            if(typeof params["topicNum"] != 'undefined') topicNum = parseInt(params["topicNum"]);

                            addDataLayerForTopic(topicNum);      
                            document.getElementById("wikititles").innerHTML = listWiki[topicNum];
                            document.getElementById("publishers").innerHTML = listPublisher[topicNum];
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
                            // Hide loader after 10 seconds, even if the page hasn't finished loading
                            setTimeout(hideLoader, 10 * 1000);
                        });
                });
        });
}

function addPublisherCircle(topicNum, pubID, name, coord, radius) {

    var circle = new google.maps.Circle({
        strokeColor: 'white',
        strokeOpacity: strk_opct,
        strokeWeight: 2,
        fillColor: 'white',
        fillOpacity: fill_opct,
        map: map,
        center: coord,
        // zIndex: 9999 - 9999 * count / maxCount,
        radius: radius
    });

    var infoWindow = new google.maps.InfoWindow({
        content: "<h3> Publisher: " + name + "</h3>"
    });

    var marker = new google.maps.Marker({
        position: coord,
        map: map,
        title: pubID
    });

    marker.setVisible(false);

    marker.addListener('click', function() {
        infoWindow.setZIndex(++infoWindowZIndex);
    });

    infoWindow.addListener('closeclick', function() {
        circle.infoWindowStaying = false;
        marker.setVisible(false);
        circle.setOptions({strokeOpacity: strk_opct});
        infoWindow.setZIndex(0);

        var e = document.getElementById(pubID);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');

        toggleLineFromPublisher(topicNum, pubID, e);
    });

    circle.infoWindowStaying = false;
    circle.infoWindow = infoWindow;
    circle.marker = marker;
    // circle.count = count;
    // circle.weightedRadius = radius;
    circle.zoomLevel = map.getZoom();

    circle.addListener('mouseover', function () {
        if(circle.infoWindowStaying) return;

        marker.setVisible(true);
        infoWindow.setZIndex(++infoWindowZIndex);
        infoWindow.open(map, marker);
        circle.setOptions({
                                // zIndex: zIndex,
                                // strokeColor: clr,
                                strokeOpacity: 1
                                // fillOpacity: fill_opct,
                                // radius: circlesize
                            });

        var e = document.getElementById(pubID);
        e.scrollIntoView();
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
    });

    circle.addListener('mouseout', function (event) {
        if(circle.infoWindowStaying) return;
        marker.setVisible(false);
        infoWindow.close();
        circle.setOptions({strokeOpacity: strk_opct});
        infoWindow.setZIndex(0);

        var e = document.getElementById(pubID);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
    });

    circle.addListener('click', function () {
        circle.infoWindowStaying = !circle.infoWindowStaying;
        var e = document.getElementById(pubID);
        toggleLineFromPublisher(topicNum, pubID, e);
    });

    circle.setVisible(lineVisible);
    publishers[pubID].circle = circle;
}

//add circles on the map
function addDataPointCircle(lat, lon, clr, strk_opct, fill_opct, radius, name, topicNum, count, maxCount) {

    var coord = {
        lat:lat,
        lng:lon};
    var contentString =
        "<h3>" + name + " (count: " + count + "), Topic " + topicNum + "</h3>";
    
    var circleIndex = cityArray[topicNum].length;

    var infoWindow = new google.maps.InfoWindow({
        content: contentString
    });

    // <div id="content">
    //   Hello world!
    // </div>
    // var div = document.createElement('div');
    // var div.innerHTML = contentString;
    // var infoWindow = new CustomPopup(
    //   new google.maps.LatLng(-33.866, 151.196),
    //   div);
    // infoWindow.setMap(map);

    var marker = new google.maps.Marker({
        position: coord,
        map: map,
        title: name + topicNum
    });
    marker.setVisible(false);

    marker.addListener('click', function() {
        infoWindow.setZIndex(++infoWindowZIndex);
    });

    infoWindow.addListener('closeclick', function() {
        cityCircle.infoWindowStaying = false;
        marker.setVisible(false);
        cityCircle.setOptions({strokeOpacity: strk_opct});
        infoWindow.setZIndex(0);
        var id= topicNum + "-" + circleIndex;
        var e = document.getElementById(id);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');

        toggleLineFromTitle(topicNum, circleIndex, cityArray[topicNum][circleIndex].publisherID, e);
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
    cityCircle.infoWindow = infoWindow;
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
        infoWindow.setZIndex(++infoWindowZIndex);
        infoWindow.open(map, marker);
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
    });

    cityCircle.addListener('mouseout', function (event) {
        if(cityCircle.infoWindowStaying) return;
        marker.setVisible(false);
        infoWindow.close();
        cityCircle.setOptions({strokeOpacity: strk_opct});
        infoWindow.setZIndex(0);

        var id= topicNum + "-" + circleIndex;
        var e = document.getElementById(id);
        $(e).toggleClass('item');
        $(e).toggleClass('item-active');
    });

    cityCircle.addListener('click', function () {
        cityCircle.infoWindowStaying = !cityCircle.infoWindowStaying;
        var id= topicNum + "-" + circleIndex;
        var e = document.getElementById(id);
        toggleLineFromTitle(topicNum, circleIndex, cityArray[topicNum][circleIndex].publisherID, e);
    });

    cityArray[topicNum].push({circle: cityCircle, publisherID:[]});
}

function hideCircles(topic) {
    if(topic != -1) {
        cityArray[topic].forEach(function(city) {
            city.circle.setVisible(false);
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

function drawagain(selectedTopic) {
    selectedTopic = Number(selectedTopic);
    
    if(lastTopic == selectedTopic) return;

    deselectAllPublishers();
    deselectAllTitles();

    hideCircles(lastTopic);
    hideLines(lastTopic);

    if(typeof cityArray[selectedTopic] == 'undefined') {
        addDataLayerForTopic(selectedTopic);
    } else {
        if(circleVisible) {
            cityArray[selectedTopic].forEach(function(city) {
                city.circle.setVisible(true);
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

    resizeCirclesForZoom(true);
    
    document.getElementById("wikititles").innerHTML = listWiki[selectedTopic];
    document.getElementById("publishers").innerHTML = listPublisher[selectedTopic];
    document.getElementById("keyWords").innerHTML = listKey[selectedTopic];
    document.getElementById("total").innerHTML = "(Total: " + cityArray[selectedTopic].length + ")";
    lastTopic = selectedTopic;
}

function resizeCirclesForZoom(force = false) {
    var zoomLevel = map.getZoom();

    if(force == false && zoomLevel < 7) return;

    var mapBound = map.getBounds();
    if(typeof cityArray[lastTopic] != 'undefined') {
        for (var i = 0; i < cityArray[lastTopic].length; i++) {
            var cityCircle = cityArray[lastTopic][i].circle;
            var circleBound = cityCircle.getBounds();

            if((mapBound.contains(cityCircle.center)) 
                || (mapBound.intersects(circleBound))
                && (force || (cityCircle.zoomLevel != zoomLevel))) {

                var count = cityCircle.count;
                cityCircle.setRadius(scaleRadiusForZoom(zoomLevel, count));
                cityCircle.zoomLevel = zoomLevel;
            }

            var pubIDs = cityArray[lastTopic][i].publisherID;

            pubIDs.forEach(function(pubID) {
                var pubCircle = publishers[pubID].circle;
                var pubCircleBound = pubCircle.getBounds();

                if((mapBound.contains(pubCircle.center)) 
                    || (mapBound.intersects(pubCircleBound))
                    && (force || (pubCircle.zoomLevel != zoomLevel))) {

                    pubCircle.setRadius(scaleRadiusForZoom(zoomLevel, 0));
                    pubCircle.zoomLevel = zoomLevel;
                }
            });
        }
    }
}

function scaleRadiusForZoom(zoomLevel, count) {
    var radius = unitCirclesize * count + minCirclesize;

    if(zoomLevel >= 7) {
        var x = ((zoomLevel - 7) / 13) * 7;
        x = Math.min(x, 7);
        var scaleFactor = 1 / Math.exp(x);
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

function saveMapToImage(topicNum, mapOnly = true, w, h, xOffset, yOffset) {
    if(mapOnly) {
        map.setOptions({disableDefaultUI: true});
        document.getElementById('legend').hidden = true;
    }

    var wait = (lastTopic == topicNum)? 1 : 500;
    document.getElementById("topicInput").value = topicNum;
    drawagain(topicNum);

    setTimeout(function() {
        var mapDiv = document.getElementById('map');
        var options = {
            useCORS: true
        }

        if(typeof w == 'undefined' && typeof h == 'undefined') {
            // if width or height is an odd number, 
            // the image  has unwanted vertical or horizontal lines in Firefox and Safari,
            w = mapDiv.clientWidth;
            h = mapDiv.clientHeight;
        }

        if(w % 2 == 1) w -= 1;
        if(h % 2 == 1) h -= 1;

        var mapCenterX = mapDiv.clientWidth * 0.5;
        var mapCenterY = mapDiv.clientHeight * 0.5;
        
        if(typeof xOffset == 'undefined') xOffset = mapCenterX - w * 0.5;
        if(typeof yOffset == 'undefined') yOffset = mapCenterY - h * 0.5;
        
        options.x = xOffset;
        options.y = yOffset;
        options.width = w;
        options.height = h;
        
        html2canvas(mapDiv, options).then(function(canvas) {
            var imgURL = canvas.toDataURL();
            downloadImage(imgURL, 'GeoD_Topic' + topicNum + '.png');
        });
    }, wait);

    setTimeout(function() {
        if(mapOnly) {
            map.setOptions({disableDefaultUI: false});
            document.getElementById('legend').hidden = false;
        }
    }, wait + 100);
}

function downloadImage(URL, filename) {
    var a = document.createElement('a');

    if (typeof a.download == 'string') {
        a.href = URL;
        a.download = filename;

        document.body.appendChild(a);

        a.click();

        document.body.removeChild(a);
    } else {
        window.open(URL);
    }
}

function highLight(){
    document.getElementById("window1").style.borderColor = "yellow";
}

function highLightOff(){
    document.getElementById("window1").style.borderColor = "#023e58";
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
    
    CustomPopup = createCustomPopupClass();

    $.ajax({
      dataType: "json",
      url: dataFolder + "map_style.json",
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
    legend.id = 'legend'
    var div = document.createElement('div');
    // div.innerHTML = '<img src="heatmap.gif"> <div class="tooltip">All Topics<div class="tooltipText">Some Tip</div></div><br><br><img src="dataPoint.gif">Title Points';
    div.innerHTML = '<img src="' + imageFolder + 'heatmap.gif">All Topics\' Title Heatmap<br><img src="' + imageFolder + 'dataPoint.gif">Title Points<br><img src="' + imageFolder + 'publisherPoint.gif">Publisher Points';
    legend.appendChild(div);
    map.controls[google.maps.ControlPosition.LEFT_BOTTOM].push(legend);

    var modal = document.getElementById("infoModal");
    var settingWindow = document.getElementById("settingWindow");

    var info = document.getElementById("info");
    var setting = document.getElementById("setting");

    var closeSetting = document.getElementById("close-setting");
    var closeModal = document.getElementById("close-modal");

    let filter = document.getElementById('searchOption');

    info.onclick = function() {
        modal.style.display = "block";
    }

    setting.onclick = function() {
        settingWindow.style.display = "block";
        document.getElementById("windows").className = "active";
    }

    closeModal.onclick = function() {
        modal.style.display = "none";
    }

    closeSetting.onclick = function() {
        settingWindow.style.display = "none";
        document.getElementById("windows").className = "";
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

    filter.onchange = function() {
        isUinonSearch = (filter.value == 1);

        if(selectedPublishers.length || selectedTitles.length) {
            redrawLines();
        }
    }

    document.getElementById('deselectPublishers').onclick = deselectAllPublishers;
    document.getElementById('deselectTitles').onclick = deselectAllTitles;
}

/* CustomPopup code example from https://developers.google.com/maps/documentation/javascript/examples/overlay-popup */
/**
 * Returns the Popup class.
 *
 * Unfortunately, the Popup class can only be defined after
 * google.maps.OverlayView is defined, when the Maps API is loaded.
 * This function should be called by initMap.
 */
function createCustomPopupClass() {
  /**
   * A customized popup on the map.
   * @param {!google.maps.LatLng} position
   * @param {!Element} content The bubble div.
   * @constructor
   * @extends {google.maps.OverlayView}
   */
    function CustomPopup(position, content) {
        this.position = position;

        content.classList.add('popup-bubble');

        // This zero-height div is positioned at the bottom of the bubble.
        var bubbleAnchor = document.createElement('div');
        bubbleAnchor.classList.add('popup-bubble-anchor');
        bubbleAnchor.appendChild(content);

        // This zero-height div is positioned at the bottom of the tip.
        this.containerDiv = document.createElement('div');
        this.containerDiv.classList.add('popup-container');
        this.containerDiv.appendChild(bubbleAnchor);

        // Optionally stop clicks, etc., from bubbling up to the map.
        google.maps.OverlayView.preventMapHitsAndGesturesFrom(this.containerDiv);
    }
    // ES5 magic to extend google.maps.OverlayView.
    CustomPopup.prototype = Object.create(google.maps.OverlayView.prototype);

    /** Called when the popup is added to the map. */
    CustomPopup.prototype.onAdd = function() {
        this.getPanes().floatPane.appendChild(this.containerDiv);
    };

    /** Called when the popup is removed from the map. */
    CustomPopup.prototype.onRemove = function() {
        if (this.containerDiv.parentElement) {
            this.containerDiv.parentElement.removeChild(this.containerDiv);
        }
    };

    /** Called each frame when the popup needs to draw itself. */
    CustomPopup.prototype.draw = function() {
        var divPosition = this.getProjection().fromLatLngToDivPixel(this.position);

        // Hide the popup when it is far out of view.
        var display =
        Math.abs(divPosition.x) < 4000 && Math.abs(divPosition.y) < 4000 ?
        'block' :
        'none';

        if (display === 'block') {
            this.containerDiv.style.left = divPosition.x + 'px';
            this.containerDiv.style.top = divPosition.y + 'px';
        }
        if (this.containerDiv.style.display !== display) {
            this.containerDiv.style.display = display;
        }
    };

    return CustomPopup;
}

