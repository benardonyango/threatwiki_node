var express = require("express");
var util = require("util");
var time = require('time')(Date);

function generateDevUser(UserModel) {
  user = new UserModel({
    name: "developer"+Date.now(),
    email: "dev@outerspace.com"+Date.now(),
    created : Date.now(),
    modified: Date.now()
  });
  user.save(function (err) {
    if (!err) {
      console.log("created");
      return user;
    } else {
      console.log("Could not Save: " + err);
      return res.send(500);
    }
  });
}

// authenticate user based on the incoming request
function authenticate(req, res, UserModel, callback) {
  if (req.session.auth && req.session.auth.loggedIn) {
    UserModel.findOne({'email':req.session.auth.google.user.email}).run(function (err, user) {
      this.user = user;
      if(!err && user){
        callback(this.user);
        return this.user;
      } else {
        console.log(err);
        return res.send(null);
      }
    });
    return true;
  } else {
    console.log("Can't create a new datapoint if currently not logged in");
    return res.send(401);
  }
}

function load_tagApi(app, TagModel,DataPointModel,UserModel) {

  // retrieve all
  app.get('/api/tag', function (req, res){
    return TagModel.find().populate('createdBy',['name']).run(function (err, tags) {
      if (!err && tags) {
        return res.send(tags);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by id
  app.get('/api/tag/:id', function (req, res) {
    return TagModel.findById(req.params.id).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by soc name
  app.get('/api/tag/soc/:soc', function (req, res) {
	console.log('TAG_API:SOC:Search by ' + req.params.soc);
    return TagModel.find({ soc: req.params.soc}).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve all tags that have this title
  app.get('/api/tag/title/:title', function (req, res) {
	console.log('TAG_API:TITLE:Search by ' + req.params.title);
    return TagModel.find({ title: req.params.title}).populate('createdBy',['name']).run( function (err, tag) {
      if (!err && tag) {
        console.log("Tag found: %o", tag);
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve all tags inside a datapoint
  app.get('/api/tag/datapoint/:datapointid', function (req, res) {
    console.log('TAG_API:DatapointId:Search by ' + req.params.datapointid);
    var datapoint = DataPointModel.findById(req.params.datapointid, function (err, datapoint) {
      if (!err && datapoint) {
         console.log('TAG_API:Id:Search by ' + datapoint.tags);
          return TagModel.find({ _id: {$in: datapoint.tags }}).populate('createdBy',['name']).run(function (err, tag) {
            if (!err && tag) {
              console.log("Tag found: %o", tag);
              return res.send(tag);
            } else {
              console.log(err);
              return res.send(null);
            }
          });
        } else {
            console.log(err);
            return res.send({});
        }
       });
  });

  // retrieve by date, date format is milliseconds since 1970/01/01
  app.get('/api/tag/date/:date', function (req, res) {
    var d_small = new Date(parseInt(req.params.date,10));
    var d_big = d_small;
    d_small.setHours(0,0,0,0);
    d_big.setHours(23,59,59,59);
    return TagModel.find({created: {$gte : d_small, $lt : d_big}}).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by date after, date format is milliseconds since 1970/01/01
  app.get('/api/tag/date/after/:date', function (req, res) {
    var d_small = new Date(parseInt(req.params.date,10));
    d_small.setHours(0,0,0,0);
    return TagModel.find({created: {$gte : d_small}}).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by date before, date format is milliseconds since 1970/01/01
  app.get('/api/tag/date/before/:date', function (req, res) {
    var d_big = new Date(parseInt(req.params.date,10));
    d_big.setHours(23,59,59,59);
    return TagModel.find({created: {$lt : d_big}}).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by date range, date format is milliseconds since 1970/01/01
  app.get('/api/tag/date/range/:date_start/:date_end', function (req, res) {
    console.log("Search between range");
    console.log("Range start: " + req.params.date_start);
    console.log("Range end: " + req.params.date_end);
    var d_start = new Date(parseInt(req.params.date_start,10));
    var d_end = new Date(parseInt(req.params.date_end,10));
    d_start.setHours(0,0,0,0);
    d_end.setHours(23,59,59,59);
    return TagModel.find({created: {$gte : d_start, $lt : d_end}}).populate('createdBy',['name']).run(function (err, tag) {
      if (!err && tag) {
        return res.send(tag);
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // retrieve by user email
  app.get('/api/tag/user/:email', function (req, res) {
    // first retrieve user based on user_name
    var user = UserModel.find({ email: req.params.email}, function (err, user) {
      if (!err && user) {
        console.log("User found at " + user._id);
        // search tag for the user_id that we just found
        return TagModel.find({createdBy: user._id}).populate('createdBy',['name']).run(function (err, tag) {
          if (!err && tag) {
            return res.send(tag);
          } else {
            console.log(err);
            return res.send(null);
          }
        });
      } else {
        console.log(err);
        return res.send(null);
      }
    });
  });

  // create
  app.post('/api/tag', function (req, res) {
    var tag;
    console.log("POST: ");
    console.log(req.body);

    var date_now = new Date();
    date_now.setTimezone('UTC');

    function save_tag (req, date_now, user) {
      tag = new TagModel({
        title: req.body.title,
        description: req.body.description,
        soc: req.body.soc,
        created: date_now,
        modified: date_now,
        createdBy: user._id
      });

      tag.save(function (err) {
        if (!err) {
          console.log("tagcreated");
          return res.send(tag);
        } else {
          console.log(err);
          return res.send(500);
        }
      });
    }

    if((app.settings.env == 'development')) {
      save_tag(req, date_now, generateDevUser(UserModel));
    } else {
      authenticate(req, res, UserModel, function(user) {
        save_tag(req, date_now, user);
      });
    }
  });

  // update
  app.put('/api/tag/:id', function (req, res) {
    return TagModel.findById(req.params.id, function (err, tag) {
      if (!err && tag){
        var date_now = new Date();
        date_now.setTimezone('UTC');

        tag.title = req.body.title;
        tag.description = req.body.description;
        tag.soc = req.body.soc;
        tag.modified = date_now;

        return tag.save(function (err) {
          if (!err) {
            console.log("updated");
          } else {
            console.log(err);
            return res.send(500);
          }
          return res.send(tag);
        });
    } else {
      console.log(err);
      return res.send(null);
    }
    });
  });

  // delete by id
  app.get('/api/tag/delete/:id', function (req, res) {
    return TagModel.findById(req.params.id, function (err, tag) {
      if (!err && tag){
        return tag.remove(function (err) {
          if (!err) {
            console.log("removed");
            return res.send(204);
          } else {
            console.log(err);
            return res.send(500);
          }
        });
    } else {
      console.log(err);
      return res.send(null);
    }
    });
  });
}

exports.load_tagApi = load_tagApi;