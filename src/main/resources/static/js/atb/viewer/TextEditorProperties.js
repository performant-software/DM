goog.provide('atb.viewer.TextEditorProperties');

goog.require('goog.dom');
goog.require('goog.ui.ComboBox');
goog.require('goog.ui.ComboBoxItem');
goog.require('goog.ui.CustomButton');

/**
 * @param editor {atb.viewer.TextEditor}
 */
atb.viewer.TextEditorProperties = function (editor) {
    this.editor = editor;
    this.clientApp = editor.clientApp;
    this.domHelper = editor.domHelper;
    
    this.div = this.domHelper.createDom(
        'div',
        {
            'class': 'atb-Editor-propertiesPane'
        }
    );
        
    this.renderInternal();
};

atb.viewer.TextEditorProperties.prototype.render = function (div) {
    div.appendChild(this.div);
};

atb.viewer.TextEditorProperties.prototype.renderInternal = function () {
    this.titleDiv = goog.dom.createDom(
        'div',
        {
            'class': 'atb-Editor-propertiesPane-Title'
        },
        'Document properties:'
    );
    
    this.div.appendChild(this.titleDiv);
    
    this.renderPurpose();
    
    this.renderDoneButton();
};

atb.viewer.TextEditorProperties.prototype.renderPurpose = function () {
    this.purposeDiv = goog.dom.createDom(
        'div',
        {
            'class': 'atb-Editor-propertiesPane-property'
        }
    );
    this.purposeLabel = goog.dom.createDom('span', {}, 'Type: ');
    
    this.purposeOptions = new goog.ui.ComboBox();
    this.purposeOptions.setUseDropdownArrow(true);
    
    for (var purpose in this.purposeValuesByText) {
        this.purposeOptions.addItem(new goog.ui.ComboBoxItem(purpose));
    }
    
    this.purposeDiv.appendChild(this.purposeLabel);
    this.purposeOptions.render(this.purposeDiv);
    
    this.div.appendChild(this.purposeDiv);
};

atb.viewer.TextEditorProperties.prototype.renderDoneButton = function () {
    var doneButtonDiv = goog.dom.createDom(
        'div',
        {
            'class': 'atb-Editor-propertiesPane-doneHolder'
        }
    );
    
    var doneButton = new goog.ui.CustomButton('Done');
    doneButton.setTooltip('Return to editing the document');
    doneButton.render(doneButtonDiv);
    
    goog.events.listen(doneButton, goog.ui.Component.EventType.ACTION, function (e) {
        e.stopPropagation();
        
        this.editor.hidePropertiesPane();
    }, false, this);
    
    this.div.appendChild(doneButtonDiv);
};

atb.viewer.TextEditorProperties.prototype.purposeValuesByText = 
{
    'Annotation': 'anno',
    'Transcription': 'trans',
    'Other': 'other'
};

atb.viewer.TextEditorProperties.prototype.purposeTextsByValue = {
    'anno': 'Annotation',
    'trans': 'Transcription',
    'other': 'Other'
};

atb.viewer.TextEditorProperties.prototype.purposeTextToValue = function (text) {
    return this.purposeValuesByText[text];
};

atb.viewer.TextEditorProperties.prototype.purposeValueToText = function (value) {
    return this.purposeTextsByValue[value];
};

atb.viewer.TextEditorProperties.prototype.getUnescapedProperties = function () {
    var properties = {};
    
    var purpose = this.purposeOptions.getValue();
    
    if (purpose) {
        properties.purpose = this.purposeTextToValue(purpose);
    }
    
    return properties;
};

atb.viewer.TextEditorProperties.prototype.setProperties = function (properties) {
    if (properties.purpose) {
        this.purposeOptions.setValue(this.purposeValueToText(properties.purpose));
    }
};