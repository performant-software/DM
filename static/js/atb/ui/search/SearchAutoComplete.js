goog.provide('atb.ui.AutoComplete.Search');

goog.require('atb.ui.search.AutoComplete');
goog.require('goog.events');

/**
 * atb.ui.AutoComplete.Search
 *
 * Implements AutoComplete for the header search field
 *
 * @constructor
 * @extends atb.ui.AutoComplete
 * @param webService {atb.WebService}
 * @param inputField {HTML Element}
 */
atb.ui.AutoComplete.Search = function(webService, inputField) {
    atb.ui.AutoComplete.call(this, webService, inputField, true, false);

    goog.events.listen(this._googAutoComplete.getRenderer(), goog.ui.ac.EventType.SELECT, this.handleSelect, false, this);
    goog.events.listen(this.inputField, goog.events.EventType.KEYUP, this.handleKeyUp, false, this);
};
goog.inherits(atb.ui.AutoComplete.Search, atb.ui.AutoComplete);

atb.ui.AutoComplete.Search.prototype.loadResults = function () {
    //TODO: Implement

    throw "loadResults() not yet implemented";
};

atb.ui.AutoComplete.Search.prototype.handleSelect = function (e) {
    //this.loadResults();
    //console.log('selection made')
};

atb.ui.AutoComplete.Search.prototype.handleKeyUp = function (e) {
    if(e.keyCode == goog.events.KeyCodes.ENTER) {
        e.preventDefault();
        e.stopPropagation();

        //console.log('keyed enter')
    }
};