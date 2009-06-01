//
// Cushion
// A thin persistence layer on top of CouchDB
//
var Cushion = {

	objects : [],
	the_class_map : [],
	afterUpdateByJSON : null,

	onTopOf : function(couchapp, view, view_options, class_map, _afterUpdateByJSON) {
		view_options["success"] = Cushion.updateByJSON;
		couchapp.design.view(view, view_options);
		the_class_map = class_map;
		afterUpdateByJSON = _afterUpdateByJSON;
		$.each(the_class_map, function() {
			var aClass = this;
			aClass.prototype.save = function() {
				var json = this.toJSON();
				couchapp.db.saveDoc(json, {
					success : function(response) {
						//alert("response: " + response);
					}
				});
			}
		});
	},

	//
	// take the JSON from CouchDB and dispatch it as either creation of new objects or updates
	// to existing objects
	//
	updateByJSON : function(json) {
		//
		// for each row of JSON from Stream, either create or update a Stop and a Work
		// updateByJSON expects two types of rows:
		//	1) a row where the value is a Javascript object literal, i.e. { ... }
		//	2) a row where the value is a Javascript array with object literal
		//		elements, i.e. [ { ... }, { ... }, { ... } ]
		// For instance:
		//	stop : { "cushion_type" : "AType", key1 : value1, keyn : valuen}
		//	works : [
		//		{ cushion_type : "AnotherType", key1 : value1, keyn : valuen}.
		//		{ cushion_type : "AThirdType", key1 : value1, keyn : valuen},
		//		{ cushion_type : "AnotherType", key1 : value1, keyn : valuen}
		//	]
		// So, when this code finds an object literal with an key of
		// "cushion_type", then treat the object literal as a request to 
		// instantiate or update Javascript object
		//
		$.each(json.rows, function() {
			//
			// see what the value for this row contains...
			//
			$.each(this.value, function() {
				// is this value an object literal with "cushion_type"?
				if(this.cushion_type != undefined){
					Cushion.dispatch(this);
				} else {
					// assume this value is an array that contains object literals
					$.each(this, function() {
						if(this.cushion_type != undefined){
							Cushion.dispatch(this);
						}
					});
				}
			});
		});

		afterUpdateByJSON();
	},

	//
	// dispatch
	// take the json object literal (with the cushion metadata) and either
	// udpate it if it's already exists or create a new one
	//
	// Assume: the _id field from CouchDB is unique over the whole DB, and as a result
	// we use it as an global instance identifier - for all objects.
	//
	dispatch : function(json) {
		if(json._id == undefined){
			alert("Cushion.dispatch: _id is not defined!");
		} else {
			var cushionObject = Cushion.findById(json._id);
			if(cushionObject == undefined){
				// this one is new to us, so create it

				var aClass = the_class_map[json.cushion_type];
				if(aClass == undefined) {
					alert("don't know how to dispatch " + jsonObjectLiteral.cushion_type);
				} else {
					cushionObject = new aClass(json);
					Cushion.registerById(json._id, cushionObject);
				}

				/*
				if(json.cushion_type == "Stop") {
					cushionObject = new Stop(json);
					Cushion.registerById(json._id, cushionObject);
				} else  if(json.cushion_type == "Work") {
					cushionObject = new Work(json);
					Cushion.registerById(json._id, cushionObject);
				} else {
					alert("don't know how to dispatch " + jsonObjectLiteral.cushion_type);
				}
				*/
			} else {
				// this one is already instantiated, update it
				cushionObject.updateByJSON(json);
			}
		}
	},

	//
	// find an existing object, given the CouchDB id
	// Assume: the _id field from CouchDB is unique over the whole DB, and as a result
	// we use it as an global instance identifier - for all objects.
	//
	findById : function(id) {
		return Cushion.objects[id];
	},

	//
	// register an existing object, given the CouchDB id
	// Assume: the _id field from CouchDB is unique over the whole DB, and as a result
	// we use it as an global instance identifier - for all objects.
	//
	registerById : function(id, object) {
		return Cushion.objects[id] = object;
	}
};
