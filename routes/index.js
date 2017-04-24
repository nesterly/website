var express = require('express');
var router = express.Router();

var firebase = require("firebase");
var firebaseConfig;

var aws = require('aws-sdk');
var S3_BUCKET;

if (process.env.NODE_ENV) {
	var config = process.env;
	firebaseConfig = {
	  apiKey: config.firebaseApiKey,
	  authDomain: config.firebaseAuthDomain,
	  databaseURL: config.firebaseDatabaseURL,
	  storageBucket: config.firebaseStorageBucket,
	  messagingSenderId: config.firebaseMessagingSenderId
	};
	AWS_ACCESS_KEY_ID = config.AWS_ACCESS_KEY_ID;
	AWS_SECRET_ACCESS_KEY = config.AWS_SECRET_ACCESS_KEY;
	S3_BUCKET = config.S3_BUCKET;
} else {
	var config = require('../config')['development'];
	firebaseConfig = {
	  apiKey: config.firebase.apiKey,
	  authDomain: config.firebase.authDomain,
	  databaseURL: config.firebase.databaseURL,
	  storageBucket: config.firebase.storageBucket,
	  messagingSenderId: config.firebase.messagingSenderId
	};
	AWS_ACCESS_KEY_ID = config.s3.AWS_ACCESS_KEY_ID;
	AWS_SECRET_ACCESS_KEY = config.s3.AWS_SECRET_ACCESS_KEY;
	S3_BUCKET = config.s3.S3_BUCKET;
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
    price: req.body.price,
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
});

router.get('/listings',function(req, res, next) {
	var ref = database.ref("/listings/");
	ref.once('value').then(function(snapshot) {
		var listings = snapshot.val();
		var listingKeys = Object.keys(listings);
		var summaries = [];
		var walks = [];
		var bikes = [];
		var drives = [];
		var transits = [];
		var prices = [];
		for (var key of listingKeys) {
			info = listings[key];
			summary = {
				id: key,
				title: info.title,
				descShort: info.descShort,
				walk: info.walk,
				bike: info.bike,
				drive: info.drive,
				transit: info.transit,
				price: info.price,
				imageUrl: info.imageUrl,
			};
			summaries.push(summary);
			walks.push(info.walk);
			bikes.push(info.bike);
			drives.push(info.drive);
			transits.push(info.transit);
			prices.push(info.price);
		}
		var maxWalk = Math.max.apply(null,walks);
		var maxBike = Math.max.apply(null,bikes);
		var maxDrive = Math.max.apply(null,drives);
		var maxTransit = Math.max.apply(null,transits);
		var minPrice = Math.min.apply(null,prices);
		var maxPrice = Math.max.apply(null,prices);
		res.render('listings',{
			listingSummaries: summaries,
			maxWalk: maxWalk,
			maxBike: maxBike,
			maxDrive: maxDrive,
			maxTransit: maxTransit,
			maxDist: Math.max.apply(null,[maxWalk,maxBike,maxDrive,maxTransit]),
			minPrice: minPrice,
			maxPrice: maxPrice,
		});
	});
});

router.get('/listings_geo',function(req, res, next) {
	var ref = database.ref("/listings/");
	ref.once("value").then(function(snapshot) {
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
});

router.get('/sign-s3', (req, res) => {
  var s3 = new aws.S3({accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY});
  var fileType = req.query['file-type'];
  var userID = "nesterly-admin";
  var timestamp = new Date().getTime();
  var suffix = Math.floor(Math.random()*400); 
  var fileName = userID+"-"+timestamp+"-"+suffix;
  var s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 60,
    ContentType: fileType,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3Params, (err, data) => {
    if(err){
      console.log(err);
      return res.end();
    }
    var returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
});

function addListing(listingData) {

  var newListingKey = firebase.database().ref().child('listings').push().key;

  var updates = {};
  updates['/listings/' + newListingKey] = listingData;

  return firebase.database().ref().update(updates);
}

module.exports = router;
