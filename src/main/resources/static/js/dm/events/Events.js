goog.provide('dm.events.Events');

goog.require('goog.events.EventType');

/**
 * Populates a list of all dom event types using Google's enumeration
 * Useful for listening for all dom events, and re-firing them on a JS object
 */
dm.events.Events.DOM_EVENT_TYPES = [];
for (var name in goog.events.EventType) {
    var eventType = goog.events.EventType[name];
    
    dm.events.Events.DOM_EVENT_TYPES.push(eventType);
}