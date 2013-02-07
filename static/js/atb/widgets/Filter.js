goog.provide('atb.widgets.Filter');
goog.provide('atb.widgets.Filter.FILTERPARAMS');

goog.require('jquery.jQuery');
goog.require('goog.dom');
goog.require('goog.events');
goog.require('goog.ui.DatePicker');

atb.widgets.Filter = function (div, parameters, opt_filterButtonHandler) {
	this.div = goog.dom.getElement(div);
	this.parameters = parameters;

        if (opt_filterButtonHandler) {
            this.applyFilter = opt_filterButtonHandler;
        }
	
	this.filtersDiv = goog.dom.createDom('div', {'class':'atb-filter-filters-div'}, null);
	
	for (var param in parameters) {
		
		if (parameters[param] == 'users') {
			this.addUsers();
		}
		else if (parameters[param] == 'type') {
			this.addTypes();
		}
		else if (parameters[param] == 'terms') {
			this.addTerms();
		}
		else if (parameters[param] == 'createdRange') {
			this.addCreatedRange();
		}
		else if (parameters[param] == 'modifiedRange') {
			this.addModifiedRange();
		}
                else {
                    throw parameters[param] + " is an unrecognized paramater for atb.widgets.Filter";
                }
	
	}
        this.filterButton = goog.dom.createDom('input', {'type':'button', 'value':'Filter'}, null);
        goog.events.listen(this.filterButton, goog.events.EventType.CLICK, this.applyFilter, false, this);
	this.filtersDiv.appendChild(this.filterButton);

	goog.dom.appendChild(this.div, this.filtersDiv);
	goog.dom.appendChild(this.filtersDiv, goog.dom.createDom('div', {'style':'clear:both;'}, null));
};

atb.widgets.Filter.FILTERPARAMS = {
	'USERS': 'users',
	'TYPE': 'type',
	'TERMS': 'terms',
	'CREATEDRANGE': 'createdRange',
	'MODIFIEDRANGE': 'modifiedRange'
};

atb.widgets.Filter.prototype.addUsers = function () {
    var container = goog.dom.createDom('div', {'class':'atb-filter-container'}, null);

    this.usersField = goog.dom.createDom('input', {'type':'text'}, null);

    var label = goog.dom.createDom('span', {'class':'atb-filter-filters-label'}, 'Users ');

    goog.dom.appendChild(container, label);
    goog.dom.appendChild(container, this.usersField);
    goog.dom.appendChild(this.filtersDiv, container);
};

atb.widgets.Filter.prototype.addTypes = function () {
    this.typesDiv = goog.dom.createDom('div', {'class':'atb-widgets-Filter-checkboxes, atb-filter-container'}, null);

    var label = goog.dom.createDom('span', {'class':'atb-filter-filters-label'}, 'Types ');

    this.texts = goog.dom.createDom('input', {'type':'checkbox', 'id':'texts'}, null);
    var textsLabel = goog.dom.createDom('label', {'for':'texts'}, 'Texts');

    this.textHighlights = goog.dom.createDom('input', {'type':'checkbox', 'id':'textHighlights'}, null);
    var textHighlightsLabel = goog.dom.createDom('label', {'for':'textHighlights'}, 'TextHighlights');

    this.annos = goog.dom.createDom('input', {'type':'checkbox', 'id':'annos'}, null);
    var annosLabel = goog.dom.createDom('label', {'for':'annos'}, 'Annotations');

    this.resources = goog.dom.createDom('input', {'type':'checkbox', 'id':'resources'}, null);
    var resourcesLabel = goog.dom.createDom('label', {'for':'resources'}, 'Resources');

    this.markers = goog.dom.createDom('input', {'type':'checkbox', 'id':'markers'}, null);
    var markersLabel = goog.dom.createDom('label', {'for':'markers'}, 'Markers');

    this.typesDiv.appendChild(label);

    this.typesDiv.appendChild(this.texts);
    this.typesDiv.appendChild(textsLabel);

    this.typesDiv.appendChild(this.textHighlights);
    this.typesDiv.appendChild(textHighlightsLabel);

    this.typesDiv.appendChild(this.annos);
    this.typesDiv.appendChild(annosLabel);

    this.typesDiv.appendChild(this.resources);
    this.typesDiv.appendChild(resourcesLabel);

    this.typesDiv.appendChild(this.markers);
    this.typesDiv.appendChild(markersLabel);

    goog.dom.appendChild(this.filtersDiv, this.typesDiv);
};

atb.widgets.Filter.prototype.addTerms = function () {
    var container = goog.dom.createDom('div', {'class':'atb-filter-container'}, null);

    this.termsField = goog.dom.createDom('input', {'type':'text'}, null);

    var label = goog.dom.createDom('span', {'class':'atb-filter-filters-label'}, 'Terms ');

    goog.dom.appendChild(container, label);

    goog.dom.appendChild(container, this.termsField);

    goog.dom.appendChild(this.filtersDiv, container);
};

atb.widgets.Filter.prototype.addCreatedRange = function () {
    this.createdRangeFilter = goog.dom.createDom('div', {'class':'atb-filter-created-range, atb-filter-container'}, null);

    this.createdRangeStart = new goog.ui.DatePicker(null, goog.i18n.DateTimeSymbols_en_US);
    this.createdRangeEnd = new goog.ui.DatePicker(null, goog.i18n.DateTimeSymbols_en_US);

    this.createdRangeStart.setUseNarrowWeekdayNames(true);
    this.createdRangeEnd.setUseNarrowWeekdayNames(true);

    var startDiv = goog.dom.createDom('div', {'class':'atb-widgets-Filter-datePicker'}, null);
    var endDiv = goog.dom.createDom('div', {'class':'atb-widgets-Filter-datePicker'}, null);

    var label = goog.dom.createDom('span', {'class':'atb-filter-filters-label'}, 'Created between ');
    goog.dom.appendChild(this.createdRangeFilter, label);

    goog.dom.appendChild(this.createdRangeFilter, startDiv);
    goog.dom.appendChild(this.createdRangeFilter, endDiv);

    goog.dom.appendChild(this.createdRangeFilter, goog.dom.createDom('div', {'style':'clear:both;'}));

    goog.dom.appendChild(this.filtersDiv, this.createdRangeFilter);

    this.createdRangeStart.decorate(startDiv);
    this.createdRangeEnd.decorate(endDiv);
};

atb.widgets.Filter.prototype.addModifiedRange = function () {
	this.modifiedRangeFilter = goog.dom.createDom('div', {'class':'atb-filter-modified-range, atb-filter-container'}, null)
	
	this.modifiedRangeStart = new goog.ui.DatePicker(null, goog.i18n.DateTimeSymbols_en_US);
	this.modifiedRangeEnd = new goog.ui.DatePicker(null, goog.i18n.DateTimeSymbols_en_US);
	
	this.modifiedRangeStart.setUseNarrowWeekdayNames(true);
	this.modifiedRangeEnd.setUseNarrowWeekdayNames(true);
	
	var startDiv = goog.dom.createDom('div', {'class':'atb-widgets-Filter-datePicker'}, null);
	var endDiv = goog.dom.createDom('div', {'class':'atb-widgets-Filter-datePicker'}, null);

        var label = goog.dom.createDom('span', {'class':'atb-filter-filters-label'}, 'Modified between ');
        goog.dom.appendChild(this.modifiedRangeFilter, label);
	
	goog.dom.appendChild(this.modifiedRangeFilter, startDiv);
	goog.dom.appendChild(this.modifiedRangeFilter, endDiv);
	
        goog.dom.appendChild(this.modifiedRangeFilter, goog.dom.createDom('div', {'style':'clear:both;'}));
	
	goog.dom.appendChild(this.filtersDiv, this.modifiedRangeFilter);
	
	this.modifiedRangeStart.decorate(startDiv);
	this.modifiedRangeEnd.decorate(endDiv);
};

atb.widgets.Filter.prototype.getParams = function () {
	var params = {};

	if (this.usersField) {
		params.users = this.tokenizeString_(this.usersField.value);
	}
        
        if (this.termsField) {
            params.terms = this.tokenizeString_(this.termsField.value);
        }

        if (this.typesDiv) {
            params.types = '';

            if (this.texts.checked) {
                params.types += 'texts,';
            }
            if (this.textHighlights.checked) {
                params.types += 'textHighlights,';
            }
            if (this.annos.checked) {
                params.types += 'annotations,';
            }
            if (this.resources.checked) {
                params.types += 'resources,';
            }
            if(this.markers.checked) {
                params.types += 'markers,'
            }

            params.types = params.types.substring(0, params.types.length - 1);
        }
	
	if (this.createdRangeFilter) {
		params.createdAfter = this.createdRangeStart.getDate().getTime();
		params.createdBefore = this.createdRangeStart.getDate().getTime() + 86400; //Includes end of day
	}
	
	if (this.modifiedRangeFilter) {
		params.modifiedAfter = this.modifiedRangeStart.getDate().getTime();
		params.modifiedBefore = this.modifiedRangeStart.getDate().getTime() + 86400; //86,400 seconds - how do you measure, measure a day?
	}

	return params;
};

atb.widgets.Filter.prototype.tokenizeString_ = function (string) {
	var array = string.split(',');
	
	for (var x in array) {
		array[x] = jQuery.trim(array[x]);
	}
	
	return array;
};

atb.widgets.Filter.prototype.applyFilter = function () {
    //TODO
    //console.log('applyFilter');
}