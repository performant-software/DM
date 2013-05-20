goog.provide('atb.viewer.AudioViewer');

goog.require('atb.viewer.Viewer');

goog.require('jquery.jQuery');
goog.require('jquery.jPlayer');
goog.require('goog.string');

atb.viewer.AudioViewer = function(clientApp) {
    atb.viewer.Viewer.call(this, clientApp);

    this.isPlayerReady = false;
};
goog.inherits(atb.viewer.AudioViewer, atb.viewer.Viewer);

atb.viewer.AudioViewer.prototype.render = function(div) {
    atb.viewer.Viewer.prototype.render.call(this, div);

    jQuery(this.rootDiv).addClass('atb-AudioViewer');

    this.buildJPlayerDom();
    this.player = jQuery(this.playerDiv).jPlayer({
        supplied: 'mp3',
        cssSelectorAncestor: '#' + this.controlsId,
        solution: 'flash, html',
        swfPath: goog.global.staticUrl + '/swf/Jplayer.swf',
        smoothPlayBar: true,
        ready: function() {
            this.isPlayerReady = true;
        }.bind(this)
    });
};

atb.viewer.AudioViewer.prototype.buildJPlayerDom = function() {
    this.playerDiv = this.domHelper.createDom('div', {'class': 'jp-jplayer'});

    this.controlsId = goog.string.getRandomString();

    this.controlsDiv = this.domHelper.createDom('div', {'class': 'jp-audio', 'id': this.controlsId});

    jQuery(this.controlsDiv).append('<div class="jp-type-single">' + 
            '<div class="jp-gui jp-interface">' + 
                '<ul class="jp-controls">' +
                    '<!-- comment out any of the following <li>s to remove these buttons -->' +
                    '<li><a href="javascript:;" class="jp-play" tabindex="1">play</a></li>' +
                    '<li><a href="javascript:;" class="jp-pause" tabindex="1">pause</a></li>' +
                    '<li><a href="javascript:;" class="jp-stop" tabindex="1">stop</a></li>' +
                    '<li><a href="javascript:;" class="jp-mute" tabindex="1" title="mute">mute</a></li>' +
                    '<li><a href="javascript:;" class="jp-unmute" tabindex="1" title="unmute">unmute</a></li>' +
                    '<li><a href="javascript:;" class="jp-volume-max" tabindex="1" title="max volume">max volume</a></li>' +
                '</ul>' +
                '<!-- you can comment out any of the following <div>s too -->' +
                '<div class="jp-progress">' +
                    '<div class="jp-seek-bar">' +
                        '<div class="jp-play-bar"></div>' +
                    '</div>' +
                '</div>' +
                '<div class="jp-volume-bar">' +
                    '<div class="jp-volume-bar-value"></div>' +
                '</div>' +
                '<div class="jp-current-time"></div>' +
                '<div class="jp-duration"></div>' +
            '</div>' +
            '<div class="jp-no-solution">' +
                '<span>Update Required</span>' +
                'To play the media you will need to either update your browser to a recent version or update your <a href="http://get.adobe.com/flashplayer/" target="_blank">Flash plugin</a>.' +
            '</div>' +
        '</div>');

    this.rootDiv.appendChild(this.playerDiv);
    this.rootDiv.appendChild(this.controlsDiv);
};

atb.viewer.AudioViewer.prototype.loadResourceByUri = function(uri) {
    this.resource = this.databroker.getResource(uri);

    if (this.resource.hasType('dctypes:Audio')) {
        this.setTitle(this.resource.getOneProperty('dc:title') || atb.resource.AudioSummary.findTitleFromUri(this.resource.uri));

        var setMedia = function() {
            this.player.jPlayer('setMedia', {
                mp3: this.resource.uri
            });
        }.bind(this);

        if (!this.isPlayerReady) {
            this.player.bind(jQuery.jPlayer.event.ready, setMedia);
        }
        else {
            setMedia();
        }
    }
    else if (this.resource.hasType('dms:AudioSegment')) {
        this.parentResource = this.databroker.getResource(this.resource.getOneProperty('dcterms:isPartOf'));

        this.setTitle(this.parentResource.getOneProperty('dc:title') || atb.resource.AudioSummary.findTitleFromUri(this.parentResource.uri));

        var audioAttrs = sc.data.DataModel.getConstraintAttrsFromUri(this.resource.uri);

        var setMedia = function() {
            this.player.jPlayer('setMedia', {
                mp3: this.parentResource.uri
            }).jPlayer('pause', audioAttrs.startSeconds);
        }.bind(this);

        if (!this.isPlayerReady) {
            this.player.bind(jQuery.jPlayer.event.ready, setMedia);
        }
        else {
            setMedia();
        }
    }
};