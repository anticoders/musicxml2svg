var balanceDep = new Tracker.Dependency();
var balance = 0;

Meteor.startup(function() {
    $("html")
        .on("dragenter", function() {
            balanceDep.changed();
            balance += 1;
        }).on("dragleave", function() {
            balanceDep.changed();
            balance -= 1;
        });
});

Template.droparea.helpers({
    active: function() {
        balanceDep.depend();
        return balance > 0 ? 'active' : '';
    }
});

Template.droparea.events({
    'dragenter .dropzone': function(e) {
        e.preventDefault();
        return true;
    },
    'dragover .dropzone': function(e) {
        e.preventDefault();
        return true;
    },
    'drop .dropzone': function(e) {
        if (balance !== 0) {
            balance = 0;
            balanceDep.changed();
        }
        e.preventDefault();
        return true;
    },
});
