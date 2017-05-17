$(document).ready(function(){

  var maxWalk = null;
  var maxBike = null;
  var maxDrive = null;
  var maxTransit = null;
  var maxPrice = null;
  var minPrice = Infinity;

  var listingSummaries;

  $.getJSON("/listings_info",function(data){
    var listings = [];
    for (var summary of data) {
      listings.push(summary.id);
      maxWalk = Math.max(maxWalk,summary.walk);
      maxBike = Math.max(maxBike,summary.bike);
      maxDrive = Math.max(maxDrive,summary.drive);
      maxTransit = Math.max(maxTransit,summary.transit);
      maxPrice = Math.max(maxPrice,summary.price);
      minPrice = Math.min(minPrice,summary.price);
      var wrapper = $('<div class="col-md-6 img-portfolio">').attr('id',summary.id);
      $('<img class="img-responsive img-hover">').attr('src',summary.imageUrl).appendTo(wrapper);
      $('<h3>').text(summary.title).appendTo(wrapper);
      $('<p>').text(summary.descShort).appendTo(wrapper);
      $('<div class="read-more">').text("Learn more about this home").attr('rel',summary.id).appendTo(wrapper);
      wrapper.appendTo('#listings'); 
    };

    updateMap(listings);

    $('.read-more').on('click',function(event){
      window.open('/show_listing'+$(this).attr('rel'));
    })

    $('#price').attr('data-slider-max',maxPrice).attr('data-slider-min',minPrice)
      .attr('data-slider-value',"["+minPrice+","+maxPrice+"]");
    $("#price").slider().on('change',function(event){
      $("#show-plow").text("$"+event.value.newValue[0]);
      $("#show-phigh").text("$"+event.value.newValue[1]);
    });
    $('#distance').attr('data-slider-max',maxWalk).attr('data-slider-value',maxWalk);
    $("#distance").slider().on('change',function(event){
      $("#show-dist").text(event.value.newValue+" min");
    });

    $('#show-dist').text(maxWalk+' min');
    $('#show-phigh').text('$'+maxPrice);
    $('#show-plow').text('$'+minPrice);
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
    removeHomes();
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