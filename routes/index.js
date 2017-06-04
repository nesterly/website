/* Creates an Express router for our server */
var express = require('express');
var router = express.Router();


/////////////////////////////////////////////////////////////////////////////////////
// Setting up dependencies and configurations.
/////////////////////////////////////////////////////////////////////////////////////

/* Reference dependencies for Firebase and AWS */
var firebase = require("firebase");
var firebaseAdmin = require("firebase-admin");
var aws = require('aws-sdk');

var firebaseConfig, serviceAccount; // Will hold configurations for Firebase
var S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY; // Will hold configurations for AWS

/* Set up the configuration for Firebase and AWS */
if (process.env.NODE_ENV) { // Running on production server
	var config = process.env; // Configureation is stored on process environment
	firebaseConfig = {
	  apiKey: config.firebaseApiKey,
	  authDomain: config.firebaseAuthDomain,
	  databaseURL: config.firebaseDatabaseURL,
	  storageBucket: config.firebaseStorageBucket,
	  messagingSenderId: config.firebaseMessagingSenderId
	};

	serviceAccount = { 
		type: "service_account",
	  project_id: "nesterly-website",
    private_key: process.env.FIREBASE_PRIVATE_KEY,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
	  client_id: process.env.FIREBASE_CLIENT_ID,
	  auth_uri: "https://accounts.google.com/o/oauth2/auth",
	  token_uri: "https://accounts.google.com/o/oauth2/token",
	  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
	  client_x509_cert_url: "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-xxz3e%40nesterly-website.iam.gserviceaccount.com"
  };

	AWS_ACCESS_KEY_ID = config.AWS_ACCESS_KEY_ID;
	AWS_SECRET_ACCESS_KEY = config.AWS_SECRET_ACCESS_KEY;
	S3_BUCKET = config.S3_BUCKET;

} else { // Running on local machine
	var config = require('../config')['development']; // Configureation is stored on local config file
	firebaseConfig = {
	  apiKey: config.firebase.apiKey,
	  authDomain: config.firebase.authDomain,
	  databaseURL: config.firebase.databaseURL,
	  storageBucket: config.firebase.storageBucket,
	  messagingSenderId: config.firebase.messagingSenderId
	};

	serviceAccount = require("../serviceAccountKey.json");

	AWS_ACCESS_KEY_ID = config.s3.AWS_ACCESS_KEY_ID;
	AWS_SECRET_ACCESS_KEY = config.s3.AWS_SECRET_ACCESS_KEY;
	S3_BUCKET = config.s3.S3_BUCKET;
}

/* Connect to Firebase with our configuration */
firebase.initializeApp(firebaseConfig);
firebaseAdmin.initializeApp({
  credential: firebaseAdmin.credential.cert(serviceAccount),
  databaseURL: "https://nesterly-website.firebaseio.com"
});

var database = firebase.database(); // Reference to our Firebase database 


/////////////////////////////////////////////////////////////////////////////////////
// Handle GET requests for rendering pages, signing S3 URL, etc.
/////////////////////////////////////////////////////////////////////////////////////

/* Display home page. */
router.get('/', function(req, res, next) {
  res.render('home');
});

/* Display student sign up page. */
router.get('/student_signup', function(req, res, next) {
	res.render('student_signup');
});

/* Display host sign up page. */
router.get('/host_signup', function(req, res, next) {
	res.render('host_signup');
});

/* Display sign in page. */
router.get('/sign_in', function(req, res, next) {
	res.render('sign_in');
});

/* Display listing creation page. */
router.get('/create_listing', function(req, res, next) {
  res.render('create_listing');
});

/* Display listings page. */
router.get('/listings',function(req, res, next) {
	res.render('listings');
});

/* 
	Display listing details page. Listing is identified by ID. 
	For example, "/show_listing1234" will display the listing with ID "1234".
*/
router.get('/show_listing:listing_id',function(req,res,next) {

	var listingID = req.params.listing_id;

	database.ref("/listings/").orderByKey().equalTo(listingID).once("value").then(function(snapshot) {
		var listings = snapshot.val();
		var listingInfo = listings[listingID];

		var sharedSpaces = [];
		var defaultShared = {
			"living_room": "Living room",
			"kitchen": "Kitchen",
			"study": "Study"
		};
		for (var space of listingInfo.shared){
			if (defaultShared.hasOwnProperty(space)) {
				sharedSpaces.push(defaultShared[space]);
			} else {
				space = space.substring(0,1).toUpperCase() + space.substring(1);
				sharedSpaces.push(space);
			}			
		}

		var amenities = [];
		var defaultAmenities = {
			"tv": "TV",
			"wifi": "Wifi",
			"washer_dryer": "Washer and dryer",
			"storage": "Storage",
			"dishwasher": "Dishwasher",
			"yard": "Yard",
			"deck_patio": "Deck/Patio",
			"separate_entrance": "Separate entrance",
			"workout_equipment": "Workout equipment",
			"n/a": "N/A"
		};

		for (var amenity of listingInfo.amenities) {
			if (defaultAmenities.hasOwnProperty(amenity)) {
				amenities.push(defaultAmenities[amenity]);
			} else {
				amenity = amenity.substring(0,1).toUpperCase() + amenity.substring(1);
				amenities.push(amenity);
			}
		}

  	var fullBath = "n/a", halfBath = "n/a";
  	if (listingInfo.privFullBath !== '0') {
  		fullBath = "private";
  	} else if (listingInfo.shareFullBath !== '0') {
  		fullBath = "shared";
  	}
  	if (listingInfo.privHalfBath !== '0') {
  		halfBath = "private";
  	} else if (listingInfo.shareHalfBath !== '0') {
  		halfBath = 'shared';
  	}

		var listingDetails = {
			roomImages: [listingInfo.imageUrl],
			title: listingInfo.title,
			price: listingInfo.price,
			descLong: listingInfo.descLong,
			walk: listingInfo.walk,
			bike: listingInfo.bike,
			drive: listingInfo.drive,
			transit: listingInfo.transit,
			shared: sharedSpaces,
			fullBath: fullBath,
			halfBath: halfBath,
			amenities: amenities,
			houseRule: listingInfo.houseRule,
			descLocale: listingInfo.descLocale,
		};

		var hostID = listingInfo.host;
		database.ref("/hosts/").orderByKey().equalTo(hostID).once("value").then(function(snapshot) {
			var hosts = snapshot.val();
			var hostInfo = hosts[hostID];

			listingDetails.hostName = hostInfo.firstName;
			listingDetails.hostIntro = hostInfo.selfIntro;
			listingDetails.hostImage = hostInfo.imageUrl;

			res.render('listing_details',listingDetails);
		});
	});
});

/* 
	API for listings. 
	This API is used by "/listings" page to get all listings to display.
*/
router.get('/listings_info',function(req, res, next) {
	var ref = database.ref("/listings/");
	ref.once('value').then(function(snapshot) {
		var listings = snapshot.val();
		var listingsInfo = [];
		for (var key of Object.keys(listings)) {
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
				stayMin: info.stayMin,
				stayMax: info.stayMax,
			};
			listingsInfo.push(summary);
		}
		res.json(listingsInfo);
	});
});

/* 
	API for geoJSON of listings. 
	This API is used by "/listings" page to display listings on the map.
*/
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

/* Respond with a signed URL for uploading image to S3 */
router.get('/sign-s3', (req, res) => {
  var s3 = new aws.S3({accessKeyId: AWS_ACCESS_KEY_ID, secretAccessKey: AWS_SECRET_ACCESS_KEY});
  var fileType = req.query['file-type'];

  var userID = "nesterly-admin"; // Change this to the logged-in user's ID
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
    };
    var returnData = {
      signedRequest: data,
      url: `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`
    };
    res.write(JSON.stringify(returnData));
    res.end();
  });
});


/////////////////////////////////////////////////////////////////////////////////////
// Handle POST requests for creating user accounts, listings, etc.
/////////////////////////////////////////////////////////////////////////////////////

/* POST create student account. */
router.post('/create_student_account', function(req, res, next) {
	firebaseAdmin.auth().createUser({
	  email: req.body.email + "@mit.edu",
	  emailVerified: false,
	  password: req.body.password,
	  displayName: req.body.first_name + " " + req.body.last_name,
	  disabled: false
	})
	  .then(function(userRecord) {

	    var language = req.body.language;
			if (!language) {
				language = [];
			} else {
				var languageOther = language.indexOf("other");
				if (languageOther !== -1) {
					language[languageOther] = req.body.language_other;
				}
			}

	    var newGuest = {
	    	firstName: req.body.first_name,
				lastName: req.body.last_name,
				email: req.body.email,
				phone: [
					req.body.phone_area,
					req.body.phone_prefix,
					req.body.phone_line
				],
				school: req.body.school,
				degree: req.body.degree,
				major: req.body.major,
				birthDate: [
					req.body.birth_m,
					req.body.birth_d,
					req.body.birth_y
				],
				imageUrl: req.body.image_url,
				sleepTime: req.body.sleep_time,
				wakeTime: req.body.wake_time,
				schedule: req.body.schedule,
				language: language,
				selfIntro: req.body.self_intro,
				interests: req.body.interests,
				skills: req.body.skills,
				dealBreakers: req.body.deal_breakers,
				petPeeves: req.body.pet_peeves,
				budget: req.body.budget,
			}

			addGuest(userRecord.uid, newGuest);
		  res.redirect('sign_in');
	  })
	  .catch(function(error) {
	    res.send("Error creating new user:", error);
	  });
});

/* POST create host account. */
router.post('/create_host_account', function(req, res, next) {
	firebaseAdmin.auth().createUser({
	  email: req.body.email,
	  emailVerified: false,
	  password: req.body.password,
	  displayName: req.body.first_name + " " + req.body.last_name,
	  disabled: false
	})
	  .then(function(userRecord) {

	    var language = req.body.language;
			if (!language) {
				language = [];
			} else {
				var languageOther = language.indexOf("other");
				if (languageOther !== -1) {
					language[languageOther] = req.body.language_other;
				}
			};

	    var newHost = {
	    	firstName: req.body.first_name,
				lastName: req.body.last_name,
				email: req.body.email,
				phone: [
					req.body.phone_area,
					req.body.phone_prefix,
					req.body.phone_line
				],
				jobType: req.body.job_type,
				employer: req.body.employer,
				birthDate: [
					req.body.birth_m,
					req.body.birth_d,
					req.body.birth_y
				],
				imageUrl: req.body.image_url,
				sleepTime: req.body.sleep_time,
				wakeTime: req.body.wake_time,
				schedule: req.body.schedule,
				language: language,
				selfIntro: req.body.self_intro,
				dealBreakers: req.body.deal_breakers,
				petPeeves: req.body.pet_peeves,
			};

			addHost(userRecord.uid, newHost);
		  res.redirect('sign_in');
	  })
	  .catch(function(error) {
	    res.send("Error creating new user:", error);
	  });
});

/* POST authenticate user. */
router.post('/auth_account', function(req, res, next) {
	var email = req.body.email;
	var password = req.body.password;

	firebase.auth().signInWithEmailAndPassword(email, password)
		.then(function() {
			console.log("Current user is:", firebase.auth().currentUser.uid);

			res.send("Success!");
		})
		.catch(function(error) {
		  var errorCode = error.code;
		  var errorMessage = error.message;
	  	
	  	console.log(error);
	  	res.send("Error");
		});
});

/* POST create a new listing. */
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
		furniture = ["n/a"];
	} else {
		if (typeof(furniture) === "string") {
			furniture = [furniture];
		}
		var furnitureOther = furniture.indexOf("other");
		if (furnitureOther !== -1) {
			furniture[furnitureOther] = req.body.furniture_other;
		} 
	}

	var amenities = req.body.amenities;
	if (!amenities) {
		amenities = ["n/a"];
	} else {
		if (typeof(amenities) === "string") {
			amenities = [amenities];
		}
		var amenitiesOther = amenities.indexOf("other");
		if (amenitiesOther !== -1) {
			amenities[amenitiesOther] = req.body.amenities_other;
		} 
	}

	var shared = req.body.shared;
	if (!shared) {
		shared = ["n/a"];
	} else {
		if (typeof(shared) === "string") {
			shared = [shared];
		}
		var sharedOther = shared.indexOf("other");
		if (sharedOther !== -1) {
			shared[sharedOther] = req.body.shared_other;
		} 
	}
	
	var newListing = {
    title: req.body.title,
    host: req.body.host,
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

  addListing(newListing);
  res.redirect('listings');
});


/////////////////////////////////////////////////////////////////////////////////////
// Helper functions
/////////////////////////////////////////////////////////////////////////////////////

/* Add new guest to firebase DB. */
function addGuest(userID, guestData) {
  var updates = {};
  updates['/guests/' + userID] = guestData;
  return firebase.database().ref().update(updates);
}

/* Add new host to firebase DB. */
function addHost(userID, hostData) {
  var updates = {};
  updates['/hosts/' + userID] = hostData;
  return firebase.database().ref().update(updates);
}

/* Add new listing to firebase DB. */
function addListing(listingData) {
  var newListingKey = firebase.database().ref().child('listings').push().key;
  var updates = {};
  updates['/listings/' + newListingKey] = listingData;
  return firebase.database().ref().update(updates);
}

module.exports = router;
