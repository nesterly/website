# Website

## Back End Stuff

### bin and app.js = Where some of our server lives

They contain some of the basics for ours server, but I won't go into details because I think you'll end up spending most of the time modifying routes/injex.js

### routes/index.js = Where the rest of our server lives

index.js has three main parts:
1. Setting up dependencies and configurations
2. Dealing with GET requests (e.g. Web browser asks our server for the page at a certain URL)
3. Dealing with POST requests (e.g. Web browser updates our server with information about a new user)
... And some other helper functions for doing one of the above.

#### 1. Dependencies and configurations

index.js currently depends on these npm packages:
- "firebase" and "firebase-admin" for managing Firebase services such as our database and user authentications
- "aws-sdk" for managing AWS services such as photo uploads

Along with these packages, we need our configurations (e.g. access key for our database)
Configurations are found in:
- "process.env" if our server is running in production
- "config.js" (local file) if our server is running on local machine

Need to add/modify configurations on process.env?
https://devcenter.heroku.com/articles/config-vars#setting-up-config-vars-for-a-deployed-application

*** Important! ***
DO NOT share configurations on git repo, especially if it's a public repo.
If configurations need to be accessed locally, store them in an isolated file and add the file name to ".gitignore" (-> this prevents git from pushing the file to the repo.)
Otherwise store them in the environment (e.g. process.env)

#### 2. Handling GET requests

You will see GET requests used most for displaying pages. 

Basic form for handling GET requests in our server is:
```javascript
router.get('REQUESTED_URL', function(req, res, next) {
  res.render('PAGE_TO_DISPLAY');
});
```

**Example** 

Assume our website is deployed at "nesterly.com", REQUESTED_URL = "/123", and PAGE_TO_DISPLAY = "abc". If you open "nesterly.com/123" in your browser, then "abc.hbs" from "views" folder will be displayed. 
Similary if REQUESTED_URL = "/", PAGE_TO_DISPLAY = "def", and you open "nesterly.com", "def.hbs" will be displayed.

**Params** 

You can add parameters to your GET request. Look at the router.get('/show_listing:listing_id'... in index.js for example. This basically means that you can replace ":listing_id" by anything you want. If you try to open "nesterly.com/show_listing12345" in your browser, our server sees that you replaced ":listing_id" with "12345" (by calling "req.params") and will respond to you with a page specifically for listing "12345".

**Handlebars** 

You can also include additional values to the page you are displaying. Again, take a look at the router.get('/show_listing:listing_id'... for example. Basic idea is that you create a template page (hbs file) and then later populate the page in our server with values of our choice. 

For example, you create a template called "user_profile.hbs", which displayes some user's name and email. You'd have placeholders in your template, "{{name}}" and "{{email}}". We might decide to display Tim's profile, then in our server, we will call 'res.render("user_profile"),{name: "Tim", email: "tim@mit.edu"}' to populate the fields. 

This was a very quieck overview, but this type of template is called Handlebars (hbs), and you can read more documentations here: http://handlebarsjs.com/

There are also many types of templates, and although I picked Handlebars because I think it's pretty intuitive, you may find another one that suits your taste/need more: https://colorlib.com/wp/top-templating-engines-for-javascript/

**APIs** 

Some routes in our server responds with APIs (JSON objects) instead of web pages. You can do this by calling "res.json('SOME_JSON_OBJECT_GOES_HERE')" instead of "res.render('PAGE_TO_DISPLAY')". Take a look at the router.get('/listings_info'... for an example.

**Others** 

There's also the router.get('/sign-s3'... in index.js, that responds with neither a web page nor JSON object. I won't go into too much details, but this one responds with a signed URL for uploading an image to S3 storage. How it's used: When a user tries to upload a photo (e.g. profile photo during sign up), her browser first requests our server for a 'signed' S3 URL, to which her browser is temporarily authorized to directly upload a photo.

#### 3. Handling POST requests

You will see POST requests used most when a user submits a form (to add new information, update something etc.)

Route for handling POST request is in the form of:
```javascript
router.post('REQUESTED_URL', function(req, res, next) {
	// Do something with the POST request
});
```

**Example** 

Your web page might want to take attendance and have a form for that:
```html
<form method="post" action="/sign_me_in">
<input type="text" name="my_name">
<input type="submit" value="Submit">
</form>
```

When Tim enters his name and hits "Submit" button, a POST request will be sent to our server at '/sign_me_in'. So in this case, we'd have a router.post... with 'REQUESTED_URL' = '/sign_me_in'. In our server, from inside the router.post... for '/sign_me_in', we can access Tim's name field by calling "req.body.my_name" and maybe do something with it (e.g. add his name to the database)

**Then What?** 

At the end of handling a POST request, you can usually call:
- "res.redirect('PAGE_TO_REDIRECT_TO')" where 'PAGE_TO_REDIRECT_TO' might be "ABC", if you want to redirect the user by displaying the page "ABC.hbs"
- OR "res.send('SOME_MESSAGE')" where 'SOME_MESSAGE' might be a sucess or error code. The message will be sent to the front end, so your front end code can deal with the success/error accordingly without necessarily redirecting the user to a new page

#### Helper functions

Helper functions in index.js are currently used to update our database. I'm going to list a few basic useful operations for Firebase database, but I recommend going through their documentation if you'd like to know more: https://firebase.google.com/docs/database/web/start

- Adding a new object under dataset (e.g. 'listings', 'users') if you know the ID of new object
```javascript
var updates = {};
updates['/name_of_the_dataset/' + ID_of_new_object] = {newObjectPropA: valueA, newObjectPropB: valueB};
firebase.database().ref().update(updates); 
```

- Same except if you don't know the ID of new object
```javascript
var newObjectID = firebase.database().ref().child('name_of_the_dataset').push().key;
var updates = {};
updates['/name_of_the_dataset/' + newObjectID] = {newObjectPropA: valueA, newObjectPropB: valueB};
firebase.database().ref().update(updates);
```

- Read each of all objects from dataset
```javascript
firebase.database().ref('/name_of_the_dataset/').once('value').then(function(snapshot) {
	var objects = snapshot.val();
	for (var key of Object.keys(objects)) {
		item = objects[key];
		// Do something with item
	}
});
```

- Read one object from dataset, whose ID we know is "objectID"
```javascript
firebase.database().ref('/name_of_the_dataset/').orderByKey().equalTo(objectID).once('value').then(function(snapshot) {
	var objects = snapshot.val();
	var item = objects[objectID];
	// Do something with item
});
```

Also, speaking of Firebase, here's a reference for authenticating and identifying users with Firebase: https://firebase.google.com/docs/auth/web/start

### public = Where our resources live

There are three subfolders:
- public/images contain images that are publicly accesible on our website (e.g. nesterly logo)
- public/javascripts contain js files that are referenced and used on our web pages
- public/stylesheets contain css files that are referenced and used on our web pages

#### Examples for referencing a resource in "public" from a page
1. Reference an image called "picture.png" in public/images:
```html
<img src="images/picture.png">
```
2. Reference a js file called "script.js" in public/javascripts:
```html
<script type="text/javascript" src="javascripts/script.js"></script>
```
3. Reference a css file called "style.css" in public/stylesheets:
```html
<link href="stylesheets/style.css" rel="stylesheet">
```

### package.json = Where you can find a list of dependencies (npm packages)

When you run "npm install" in the root directory from your terminal, npm will look into package.json to see which packages need to be installed and saved under the folder called "node_modules"

*** Important! *** 
- Don't forget to run "npm install" first if you download our code to your local machine from the git repo! (Npm packages are not stored in the repo.) 
- You can add a new npm package as dependency by running "npm instal --save PACKAGE_NAME" 
- Also if you add a new dependency, push code from one local machine, and pull code to another local machine, make sure to run "npm install" again to install the new dependency. 

### node_modules = Where npm packages live

Read above about npm packages.

### .gitignore = List of things you don't want in the git repo

If you add names of folders/files to .gitignore, git will automatically ignore and prevent them from getting pushed to the repo. 

#### Examples of things you may want to include in .gitignore:
- Anything security sensitive that you wouldn't want in a public repo e.g. configurations, access keys
- Anything large that you don't actually need in your repo e.g. node modules

### views = Where our web pages (hbs files) live

Handlebars (hbs) files are pretty much the same as html files, except for the rendering functionality. You can refer to "Handlebars" under "2. Handling GET requests" for more.

## Front End Stuff

### Plugins (Dependencies)

- Slider: http://seiyria.com/bootstrap-slider/
- Date range picker: http://www.daterangepicker.com/
- Photo cropper: https://fengyuanchen.github.io/cropper/

### Suggestions and TODOs

- Filter by date (listings page)
-- Allow empty (unselected) date range
-- Maybe find another date range picker plugin that works better for our UI?

- Add click event to the listing images (listings page)
-- Click event on image -> Check the listing ID -> Pop up the corresponding listing on the map

- Distance filter (listings page)
-- Change the upper limit distance based on mode of transportation
-- You could create a distance filter for each mode of transportation and hide ones that are not selected in the dropdown

