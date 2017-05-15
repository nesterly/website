$(document).ready(function(){

  var listingSummaries;
  $.getJSON("/listings_info",function(data){
    listingSummaries = data.summaries;
    var listings = [];
    for (var summary of listingSummaries) {
      listings.push(summary.id);
      var wrapper = $('<div class="col-md-6 img-portfolio">').attr('id',summary.id);
      $('<img class="img-responsive img-hover">').attr('src',summary.imageUrl).appendTo(wrapper);
      $('<h3>').text(summary.title).appendTo(wrapper);
      $('<p>').text(summary.descShort).appendTo(wrapper);
      wrapper.appendTo('#listings'); 
    };
    updateMap(listings);
  });

  $("#transportation li a").on('click',function(event){
    $("#selected-mot").attr('rel',$(this).attr('id'));
    $("#selected-mot").text($(this).text());
    $("#transportation li").show();
    $(this).parent("li").hide();
  });

  $("#apply-filter").on('click',function(event){
    var distType = $("#selected-mot").attr('rel'); 
    var dist = $("#distance").data('slider').getValue();
    var priceRange = $("#price").data('slider').getValue();
    var oneDay = 24*60*60*1000; // hours*minutes*seconds*milliseconds
    var dateRegex = /([0-9]+)\/([0-9]+)\/([0-9]+)/g;
    var start = $('input[name="moveindate"]').val();
    var matchStart = dateRegex.exec(start);
    var end = $('input[name="moveoutdate"]').val();
    dateRegex = /([0-9]+)\/([0-9]+)\/([0-9]+)/g;
    var matchEnd = dateRegex.exec(end);
    var startDate = new Date(parseInt(matchStart[3]),parseInt(matchStart[1])-1,parseInt(matchStart[2]));
    var endDate = new Date(parseInt(matchEnd[3]),parseInt(matchEnd[1])-1,parseInt(matchEnd[2]));
    var duration = Math.round((endDate.getTime() - startDate.getTime())/oneDay);
    filter(dist,distType,priceRange[0],priceRange[1],duration);
  });

  function filter(dist,distType,priceL,priceH,duration) {
    var visibleListings = []; 
    for (var summary of listingSummaries) {
      if (summary[distType] <= dist && summary.price >= priceL && summary.price <= priceH 
        && ((summary.stayMin <= duration && duration <= summary.stayMax) || duration === 0)) {
        $("#"+summary.id).removeClass('hidden');
        visibleListings.push(summary.id);
      } else {
        $("#"+summary.id).addClass('hidden');
      }
    }
    $(".img-portfolio").removeClass("listing-selected");
    map.removeLayer(homePoints);
    updateMap(visibleListings);
  }

  // Web map code
  var map = L.map('map',{ center: [42.362432, -71.086086], zoom: 14 });

  // Add tile layer
  L.tileLayer('http://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}').addTo(map);

  // Add custom home icon
  var home_icon = L.icon({
    iconUrl: '/images/home-icon.png',
    shadowUrl: '/images/home-shadow.png',

    iconSize:     [40, 40], // size of the icon
    shadowSize:   [66, 34], // size of the shadow
    iconAnchor:   [20, 20], // point of the icon which will correspond to marker's location
    shadowAnchor: [19, 14],  // the same for the shadow
    popupAnchor:  [0, -20] // point from which the popup should open relative to the iconAnchor
  });

  // Null variable that will hold our data
  var homePoints;

  /* Add visible homes to the map */
  function updateMap(visibleListings) {

    // Add homes to map
    $.getJSON("/listings_geo",function(data){
      homePoints = L.geoJson(data,{
        pointToLayer: function (feature, latlng) {
          if (visibleListings.includes(feature.properties.id)) { 
            return L.marker(latlng, {icon: home_icon});
          }
        },
        onEachFeature: function (feature, layer) {
          var popupContent = feature.properties.NUMERO;
          layer.bindPopup(feature.properties.name);
        }
      }).addTo(map);

      homePoints.on('click', function(e) { 
        var id = e.layer.feature.properties.id;
        highlight(id); 
      });
    });
  }

  /* Highlight listing on left side by ID */
  function highlight(id) {
    $(".img-portfolio").each(function(){
      if ($(this).attr('id') === id) {
        $(this).addClass("listing-selected");
        $("body").animate({
          scrollTop: $(this).offset().top-$(".navbar").height()-120,
        },500);
      } else {
        $(this).removeClass("listing-selected");
      }
    })
  }

  /* Remove all homes from the map */
  function removeHomes(){
    map.removeLayer(homePoints);
  };
})