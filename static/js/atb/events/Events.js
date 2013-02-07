goog.provide('atb.events.Events');

goog.require('goog.events.EventType');

atb.events.Events = function () {
    
};

/**
 * Populates a list of all dom event types using Google's enumeration
 * Useful for listening for all dom events, and re-firing them on a JS object
 */
atb.events.Events.DOM_EVENT_TYPES = [];
for (var name in goog.events.EventType) {
    var eventType = goog.events.EventType[name];
    
    atb.events.Events.DOM_EVENT_TYPES.push(eventType);
}