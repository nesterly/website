var express = require('express');
var router = express.Router();

var firebase = require("firebase");
var firebaseConfig;
if (process.env.NODE_ENV) {
	var config = process.env;
	firebaseConfig = {
	  apiKey: config.firebaseApiKey,
	  authDomain: config.firebaseAuthDomain,
	  databaseURL: config.firebaseDatabaseURL,
	  storageBucket: config.firebaseStorageBucket,
	  messagingSenderId: config.firebaseMessagingSenderId
	};
} else {
	var config = require('../config')['development'];
	firebaseConfig = {
	  apiKey: config.firebase.apiKey,
	  authDomain: config.firebase.authDomain,
	  databaseURL: config.firebase.databaseURL,
	  storageBucket: config.firebase.storageBucket,
	  messagingSenderId: config.firebase.messagingSenderId
	};
}
firebase.initializeApp(firebaseConfig);

var database = firebase.database();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('home');
});

router.get('/154bkj372bfme_ab16', function(req, res, next) {
  res.render('create_listing');
});

router.post('/add_listing', function(req, res, next) {

	var bldgType;
	if (req.body.bldg_type === "other") {
		bldgType = req.body.bldg_type_other;
	} else {
		bldgType = req.body.bldg_type;
	}

	var bed;
	if (req.body.bed === "other") {
		bed = req.body.bed_other;
	} else {
		bed = req.body.bed;
	}
	
	var furniture = req.body.furniture;
	if (!furniture) {
		furniture = [];
	} else {
		var furniture_other = furniture.indexOf("other");
		if (furniture_other !== -1) {
			furniture[furniture_other] = req.body.furniture_other;
		} 
	}

	var amenities = req.body.amenities;
	if (!amenities) {
		amenities = [];
	} else {
		var amenities_other = amenities.indexOf("other");
		if (amenities_other !== -1) {
			amenities[amenities_other] = req.body.amenities_other;
		} 
	}

	var shared = req.body.shared;
	if (!shared) {
		shared = [];
	} else {
		var shared_other = shared.indexOf("other");
		if (shared_other !== -1) {
			shared[shared_other] = req.body.shared_other;
		} 
	}
	
	var newListing = {
    title: req.body.title,
   	descShort: req.body.desc_short,
    descLong: req.body.desc_long,
    bldgType: bldgType,
    address: req.body.address,
    lat: req.body.lat,
    long: req.body.long,
    descLocale: req.body.desc_locale,
    walk: req.body.walk,
    bike: req.body.bike,
    drive: req.body.drive,
    transit: req.body.transit,
    imageUrl: req.body.image_url,
    area: req.body.area,
    bed: bed,
    furniture: furniture,
    amenities: amenities,
    shared: shared,
    shareHalfBath: req.body.share_half_bath,
    shareFullBath: req.body.share_full_bath,
    privHalfBath: req.body.priv_half_bath,
    privFullBath: req.body.priv_full_bath,
    parkSt: req.body.park_st,
    parkOffst: req.body.park_offst,
    parkGarage: req.body.park_garage,
    houseRule: req.body.house_rule,
    stayMin: req.body.stay_min,
    stayMax: req.body.stay_max,
  };

  var result = addListing(newListing);
  res.redirect('154bkj372bfme_ab16');
});

router.get('/278hnf2736jgi_hr25', function(req, res, next) {
	var listingsInfo = [];
	var ref = database.ref("/listings/");
	ref.once('value').then(function(snapshot) {
		var listings = snapshot.val();
		var listingKeys = Object.keys(listings);
		for (var key of listingKeys) {
			listingsInfo.push(listings[key]);
		}
		res.send(listingsInfo);
	});
})

router.get('/listings',function(req, res, next) {
	var ref = database.ref("/listings/");
	ref.once('value').then(function(snapshot) {
		var listings = snapshot.val();
		var listingKeys = Object.keys(listings);
		var summaries = [];
		for (var key of listingKeys) {
			info = listings[key];
			summary = {
				key: key,
				title: info.title,
				descShort: info.descShort,
			};
			summaries.push(summary);
		}
		res.render('listings',{listings:summaries});
	});
})

router.get('/listings_geo',function(req, res, next) {
	var ref = database.ref("/listings/");
	ref.once('value').then(function(snapshot) {
		var listings = snapshot.val();
		var listingKeys = Object.keys(listings);
		var features = [];
		for (var key of listingKeys) {
			info = listings[key];
			feature = {
				"type":"Feature",
				"properties":{"id":key,"name":info.title},
				"geometry":{"type":"Point","coordinates":[info.long,info.lat]}
			};
			features.push(feature);
		}
		geo = {"type":"FeatureCollection","features":features};
		res.json(geo);
	});
})

function addListing(listingData) {

  var newListingKey = firebase.database().ref().child('listings').push().key;

  var updates = {};
  updates['/listings/' + newListingKey] = listingData;

  return firebase.database().ref().update(updates);
}

module.exports = router;
