  $(document).ready(function(){

  var yelpData = function(restaurant) {
    // Begin OAuth signature generation
    // This is based on a post by Mark Nguyen (Udacity Coach) - https://discussions.udacity.com/t/im-having-trouble-getting-started-using-apis/13597/2

    function nonce_generate() {
      return (Math.floor(Math.random() * 1e12).toString());
    }

    var yelp_url = 'https://api.yelp.com/v2/business/' + restaurant.yelpID();
    var YELP_KEY = "L3XxOdBKm-eE4APxDEFocw";
    var YELP_TOKEN = "V-TwTSTGOVqUAWsTL4iEyG0WxCxtbpwS";
    var YELP_KEY_SECRET = "mmoVfufpNvkrizh95TFQKpfxAdY";
    var YELP_TOKEN_SECRET = "164Cz9dbsDNgZBP2w0q-ia_bYqA";

    var oauth_parameters = {
      oauth_consumer_key: YELP_KEY,
      oauth_token: YELP_TOKEN,
      oauth_nonce: nonce_generate(),
      oauth_timestamp: Math.floor(Date.now()/1000),
      oauth_signature_method: 'HMAC-SHA1',
      oauth_version : '1.0',
      callback: 'cb' // This is crucial to include for jsonp implementation in AJAX or else the oauth-signature will be wrong.
    };

    var encodedSignature = oauthSignature.generate('GET',yelp_url, oauth_parameters, YELP_KEY_SECRET, YELP_TOKEN_SECRET);
    oauth_parameters.oauth_signature = encodedSignature;

    // End OAuth signature generation

    // Set Ajax request parameters
    var ajax_parameters = {
      url: yelp_url,
      data: oauth_parameters,
      cache: true, // Prevent jQuery from adding on a cache-buster parameter "_=23489489749837", thus invalidating the oauth-signature
      dataType: 'jsonp',
      success: function(response) {
        // Populate the info window with data from the Yelp API
        $('#' + restaurant.yelpID() + '-img').attr('src', response.image_url).attr('alt', response.name);
        $('#' + restaurant.yelpID() + '-heading').text(response.name);
        $('#' + restaurant.yelpID() + '-rating').attr('src', response.rating_img_url_small).attr('alt', 'Rating: ' + response.rating);
        $('#' + restaurant.yelpID() + '-description').text(response.snippet_text);
        $('#' + restaurant.yelpID() + '-link').attr('href', response.url).removeClass('hidden');
      },
      error: function() {
        // In case there is an error with the request to Yelp API, display this meesage
        $('#' + restaurant.yelpID() + '-description').text('Failed to load Yelp data. Please try later.').addClass("alert-danger");
      }
    };

    // Send Ajax request
    $.ajax(ajax_parameters);
  };

  // This method animates the marker, shows the info window in Google maps and
  // calls the Yelp API to populate the info window with data about the restaurant
  var infoWindowShow = function(restaurant){
    restaurant.infowindow().open(map, restaurant.marker());
    restaurant.marker().setAnimation(google.maps.Animation.BOUNCE);
    window.setTimeout(function() {
      restaurant.marker().setAnimation(null);
    }, 2000);
    yelpData(restaurant);
  };

  var Restaurant = function(data) {
    // The restaurant object where the data is loaded from restaurantsDetails
    var self = this;
    self.name = ko.observable(data.name);
    self.yelpID = ko.observable(data.yelpID);
    self.lat = ko.observable(data.lat);
    self.lng = ko.observable(data.lng);
    // This boolean determines if the restaurant is visible when we filter the list
    self.visible = ko.observable(true);

    // Initialize the map marker
    self.marker = ko.observable(
      new google.maps.Marker({
        position: {lat: self.lat(), lng: self.lng()},
        map: map,
        title: self.name(),
        animation: google.maps.Animation.DROP
      })
    );

    // Initialize the map infowindow that will display the Yelp data
    self.infowindow = ko.observable(
      new google.maps.InfoWindow({
        content:
          '<div class="media">' +
          '  <div class="media-left"><img id="' + self.yelpID() + '-img" class="media-object" src="" alt=""></div>' +
          '  <div class="media-body">' +
          '    <h4 id="' + self.yelpID() + '-heading" class="media-heading">' + self.name() + '</h4>' +
          '    <img id="' + self.yelpID() + '-rating" src="" alt=""><br>' +
          '    <span id="' + self.yelpID() + '-description">Loading Yelp data ... please wait.</span><br>' +
          '    <a id="' + self.yelpID() + '-link" href="" class="hidden" target="_blank">Read more on <b>Yelp</b></a>' +
          '  </div>' +
          '</div>'
      })
    );
  };

  var viewModel = function() {
    var self = this;
    self.appTitle = ko.observable("Veggie Places Barcelona");
    self.restaurants = ko.observableArray([]);
    self.selectedRestaurant = ko.observable();
    self.filtertext = ko.observable("");
    // This tells filtertext to only nofify of a value change every 500ms so it
    // does not call the filterRestaurants method with every character input.
    self.filtertext.extend({
      rateLimit: {
        timeout: 500,
        method: "notifyWhenChangesStop"
      }
    });

    // Populate the restaurants array with Restaurant objects that use data from restaurantsDetails.
    // Also sets a click event on the marker, so when it is clicked it behaves like the list button.
    restaurantsDetails.forEach(function(item){
      var restaurantObj = new Restaurant(item);
      self.restaurants.push(restaurantObj);

      restaurantObj.marker().addListener('click', function() {
        if (self.selectedRestaurant()){
          self.selectedRestaurant().infowindow().close();
        }
        self.selectedRestaurant(restaurantObj);
        infoWindowShow(restaurantObj);
      });
    });

    // If the button in the list is clicked then hide current infowindow (if any)
    // and show the selected restaurant info window
    self.showItem = function(restaurant){
      if (self.selectedRestaurant()){
        self.selectedRestaurant().infowindow().close();
      }
      self.selectedRestaurant(restaurant);
      infoWindowShow(restaurant);
    };

    // This method looks for the user input in each of the restaurants name.
    // If found, it sets the list button visible and the marker on the map,
    // otherwise it hides the list button, the marker and info window (if any).
    self.filterRestaurants = function(){
      self.restaurants().forEach(function (item) {
        var name = item.name();
        var ft = self.filtertext();
        if ( name.toLowerCase().search(ft.toLowerCase()) == -1 ){
          item.visible(false);
          item.infowindow().close();
          item.marker().setVisible(false);
        } else {
          item.visible(true);
          item.marker().setVisible(true);
        }
      });
    }
    // This tells KO to call filterRestaurants each time filtertext is changed
    self.filtertext.subscribe(self.filterRestaurants);
  };

  ko.applyBindings(new viewModel());
});
