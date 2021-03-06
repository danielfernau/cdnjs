/*
 *  cropit - v0.1.5
 *  Customizable crop and zoom.
 *  https://github.com/scottcheng/cropit
 *
 *  Made by Scott Cheng
 *  Based on https://github.com/yufeiliu/simple_image_uploader
 *  Under MIT License
 */
(function($) {
    var Zoomer;
    Zoomer = function() {
        function Zoomer() {}
        Zoomer.prototype.setup = function(imageSize, previewSize, exportZoom, options) {
            var heightRatio, widthRatio;
            if (exportZoom == null) {
                exportZoom = 1;
            }
            widthRatio = previewSize.w / imageSize.w;
            heightRatio = previewSize.h / imageSize.h;
            if ((options != null ? options.fitWidth : void 0) && !(options != null ? options.fitHeight : void 0)) {
                this.minZoom = widthRatio;
            } else if ((options != null ? options.fitHeight : void 0) && !(options != null ? options.fitWidth : void 0)) {
                this.minZoom = heightRatio;
            } else if ((options != null ? options.fitWidth : void 0) && (options != null ? options.fitHeight : void 0)) {
                this.minZoom = widthRatio < heightRatio ? widthRatio : heightRatio;
            } else {
                this.minZoom = widthRatio < heightRatio ? heightRatio : widthRatio;
            }
            return this.maxZoom = this.minZoom < 1 / exportZoom ? 1 / exportZoom : this.minZoom;
        };
        Zoomer.prototype.getZoom = function(sliderPos) {
            if (!(this.minZoom && this.maxZoom)) {
                return null;
            }
            return sliderPos * (this.maxZoom - this.minZoom) + this.minZoom;
        };
        Zoomer.prototype.getSliderPos = function(zoom) {
            if (!(this.minZoom && this.maxZoom)) {
                return null;
            }
            if (this.minZoom === this.maxZoom) {
                return 0;
            } else {
                return (zoom - this.minZoom) / (this.maxZoom - this.minZoom);
            }
        };
        Zoomer.prototype.isZoomable = function() {
            if (!(this.minZoom && this.maxZoom)) {
                return null;
            }
            return this.minZoom !== this.maxZoom;
        };
        Zoomer.prototype.fixZoom = function(zoom) {
            if (zoom < this.minZoom) {
                return this.minZoom;
            }
            if (zoom > this.maxZoom) {
                return this.maxZoom;
            }
            return zoom;
        };
        return Zoomer;
    }();
    var Cropit, defaults;
    defaults = {
        exportZoom: 1,
        imageBackground: false,
        imageBackgroundBorderWidth: 0,
        imageState: null
    };
    Cropit = function() {
        function Cropit(element, options) {
            var dynamicDefaults;
            this.element = element;
            this.$el = $(this.element);
            dynamicDefaults = {
                $fileInput: this.$("input.cropit-image-input"),
                $preview: this.$(".cropit-image-preview"),
                $imageZoomInput: this.$("input.cropit-image-zoom-input"),
                $previewContainer: this.$(".cropit-image-preview-container")
            };
            this.options = $.extend({}, defaults, dynamicDefaults, options);
            this._defaults = defaults;
            this.init();
        }
        Cropit.prototype.init = function() {
            var $previewContainer, imageBgBorderWidth, _ref, _ref1, _ref2, _ref3;
            this.$fileInput = this.options.$fileInput.attr({
                accept: "image/*"
            });
            this.$preview = this.options.$preview.css({
                backgroundRepeat: "no-repeat"
            });
            this.$imageZoomInput = this.options.$imageZoomInput.attr({
                min: 0,
                max: 1,
                step: .01
            });
            this.$hiddenImage = $("<img />").addClass("cropit-image-hidden-preview").attr({
                alt: "",
                style: "display: none;"
            }).appendTo(this.$el);
            this.previewSize = {
                w: this.options.width || this.$preview.width(),
                h: this.options.height || this.$preview.height()
            };
            if (this.options.width) {
                this.$preview.width(this.previewSize.w);
            }
            if (this.options.height) {
                this.$preview.height(this.previewSize.h);
            }
            if (this.options.imageBackground) {
                imageBgBorderWidth = this.options.imageBackgroundBorderWidth;
                $previewContainer = this.options.$previewContainer;
                this.$imageBg = $("<img />").addClass("cropit-image-background").attr("alt", "").css("position", "absolute");
                this.$imageBgContainer = $("<div />").addClass("cropit-image-background-container").css({
                    position: "absolute",
                    zIndex: 0,
                    left: -imageBgBorderWidth + window.parseInt(this.$preview.css("border-left-width")),
                    top: -imageBgBorderWidth + window.parseInt(this.$preview.css("border-top-width")),
                    width: this.previewSize.w + imageBgBorderWidth * 2,
                    height: this.previewSize.h + imageBgBorderWidth * 2
                }).append(this.$imageBg);
                if (imageBgBorderWidth > 0) {
                    this.$imageBgContainer.css({
                        overflow: "hidden"
                    });
                }
                $previewContainer.css("position", "relative").prepend(this.$imageBgContainer);
                this.$preview.css("position", "relative");
            }
            this.initialOffset = {
                x: 0,
                y: 0
            };
            this.initialZoom = 0;
            this.initialSliderPos = 0;
            this.imageLoaded = false;
            this.imageSrc = ((_ref = this.options.imageState) != null ? _ref.src : void 0) || null;
            this.setOffset(((_ref1 = this.options.imageState) != null ? _ref1.offset : void 0) || this.initialOffset);
            this.zoom = ((_ref2 = this.options.imageState) != null ? _ref2.zoom : void 0) || this.initialZoom;
            this.$imageZoomInput.val(this.initialSliderPos);
            this.moveContinue = false;
            this.zoomer = new Zoomer();
            this.$preview.on("mousedown mouseup mouseleave", this.handlePreviewEvent.bind(this));
            this.$fileInput.on("change", this.onFileChange.bind(this));
            this.$imageZoomInput.on("mousedown mouseup mousemove", this.updateSliderPos.bind(this));
            if ((_ref3 = this.options.imageState) != null ? _ref3.src : void 0) {
                return this.loadImage();
            }
        };
        Cropit.prototype.onFileChange = function() {
            var file, fileReader, _base;
            if (typeof (_base = this.options).onFileChange === "function") {
                _base.onFileChange();
            }
            fileReader = new FileReader();
            file = this.$fileInput.get(0).files[0];
            if (file != null ? file.type.match("image") : void 0) {
                this.setImageLoadingClass();
                fileReader.readAsDataURL(file);
                fileReader.onload = this.onFileReaderLoaded.bind(this);
                return fileReader.onerror = this.onFileReaderError.bind(this);
            }
        };
        Cropit.prototype.onFileReaderLoaded = function(e) {
            this.imageSrc = e.target.result;
            this.zoom = this.initialZoom;
            this.offset = this.initialOffset;
            return this.loadImage();
        };
        Cropit.prototype.onFileReaderError = function() {
            var _base;
            return typeof (_base = this.options).onFileReaderError === "function" ? _base.onFileReaderError() : void 0;
        };
        Cropit.prototype.loadImage = function() {
            var _base;
            this.$hiddenImage.attr("src", this.imageSrc);
            if (typeof (_base = this.options).onImageLoading === "function") {
                _base.onImageLoading();
            }
            this.setImageLoadingClass();
            this.$hiddenImage.one("load", this.onImageLoaded.bind(this));
            return this.$hiddenImage.one("error", this.onImageError.bind(this));
        };
        Cropit.prototype.onImageLoaded = function() {
            var _base;
            this.setImageLoadedClass();
            this.setOffset(this.offset);
            this.$preview.css("background-image", "url(" + this.imageSrc + ")");
            if (this.options.imageBackground) {
                this.$imageBg.attr("src", this.imageSrc);
            }
            this.imageSize = {
                w: this.$hiddenImage.width(),
                h: this.$hiddenImage.height()
            };
            this.setupZoomer();
            this.imageLoaded = true;
            return typeof (_base = this.options).onImageLoaded === "function" ? _base.onImageLoaded() : void 0;
        };
        Cropit.prototype.onImageError = function() {
            var _base;
            return typeof (_base = this.options).onImageError === "function" ? _base.onImageError() : void 0;
        };
        Cropit.prototype.setImageLoadingClass = function() {
            return this.$preview.removeClass("cropit-image-loaded").addClass("cropit-image-loading");
        };
        Cropit.prototype.setImageLoadedClass = function() {
            return this.$preview.removeClass("cropit-image-loading").addClass("cropit-image-loaded");
        };
        Cropit.prototype.handlePreviewEvent = function(e) {
            if (!this.imageLoaded) {
                return;
            }
            this.moveContinue = false;
            this.$preview.off("mousemove");
            if (e.type === "mousedown") {
                this.origin = {
                    x: e.clientX,
                    y: e.clientY
                };
                this.moveContinue = true;
                this.$preview.on("mousemove", this.onMove.bind(this));
            } else {
                $(document.body).focus();
            }
            e.stopPropagation();
            return false;
        };
        Cropit.prototype.onMove = function(e) {
            if (this.moveContinue) {
                this.setOffset({
                    x: this.offset.x + e.clientX - this.origin.x,
                    y: this.offset.y + e.clientY - this.origin.y
                });
            }
            this.origin = {
                x: e.clientX,
                y: e.clientY
            };
            e.stopPropagation();
            return false;
        };
        Cropit.prototype.setOffset = function(position) {
            this.offset = this.fixOffset(position);
            this.$preview.css("background-position", "" + this.offset.x + "px " + this.offset.y + "px");
            if (this.options.imageBackground) {
                return this.$imageBg.css({
                    left: this.offset.x + this.options.imageBackgroundBorderWidth,
                    top: this.offset.y + this.options.imageBackgroundBorderWidth
                });
            }
        };
        Cropit.prototype.fixOffset = function(offset) {
            var ret;
            if (!this.imageLoaded) {
                return offset;
            }
            ret = {
                x: offset.x,
                y: offset.y
            };
            if (this.imageSize.w * this.zoom <= this.previewSize.w) {
                ret.x = 0;
            } else if (ret.x > 0) {
                ret.x = 0;
            } else if (ret.x + this.imageSize.w * this.zoom < this.previewSize.w) {
                ret.x = this.previewSize.w - this.imageSize.w * this.zoom;
            }
            if (this.imageSize.h * this.zoom <= this.previewSize.h) {
                ret.y = 0;
            } else if (ret.y > 0) {
                ret.y = 0;
            } else if (ret.y + this.imageSize.h * this.zoom < this.previewSize.h) {
                ret.y = this.previewSize.h - this.imageSize.h * this.zoom;
            }
            ret.x = this.round(ret.x);
            ret.y = this.round(ret.y);
            return ret;
        };
        Cropit.prototype.updateSliderPos = function() {
            var newZoom;
            if (!this.imageLoaded) {
                return;
            }
            this.sliderPos = Number(this.$imageZoomInput.val());
            newZoom = this.zoomer.getZoom(this.sliderPos);
            return this.setZoom(newZoom);
        };
        Cropit.prototype.setupZoomer = function() {
            var _base, _base1;
            this.zoomer.setup(this.imageSize, this.previewSize, this.options.exportZoom, this.options);
            this.zoom = this.fixZoom(this.zoom);
            this.setZoom(this.zoom);
            if (this.isZoomable()) {
                this.$imageZoomInput.removeAttr("disabled");
                return typeof (_base = this.options).onZoomEnabled === "function" ? _base.onZoomEnabled() : void 0;
            } else {
                this.$imageZoomInput.attr("disabled", true);
                return typeof (_base1 = this.options).onZoomDisabled === "function" ? _base1.onZoomDisabled() : void 0;
            }
        };
        Cropit.prototype.setZoom = function(newZoom) {
            var newX, newY, oldZoom, updatedHeight, updatedWidth;
            newZoom = this.fixZoom(newZoom);
            updatedWidth = this.round(this.imageSize.w * newZoom);
            updatedHeight = this.round(this.imageSize.h * newZoom);
            oldZoom = this.zoom;
            newX = this.previewSize.w / 2 - (this.previewSize.w / 2 - this.offset.x) * newZoom / oldZoom;
            newY = this.previewSize.h / 2 - (this.previewSize.h / 2 - this.offset.y) * newZoom / oldZoom;
            this.zoom = newZoom;
            this.setOffset({
                x: newX,
                y: newY
            });
            this.sliderPos = this.zoomer.getSliderPos(this.zoom);
            this.$imageZoomInput.val(this.sliderPos);
            this.$preview.css("background-size", "" + updatedWidth + "px " + updatedHeight + "px");
            if (this.options.imageBackground) {
                return this.$imageBg.css({
                    width: updatedWidth,
                    height: updatedHeight
                });
            }
        };
        Cropit.prototype.fixZoom = function(zoom) {
            return this.zoomer.fixZoom(zoom);
        };
        Cropit.prototype.isZoomable = function() {
            return this.zoomer.isZoomable();
        };
        Cropit.prototype.getCroppedImageData = function(options) {
            var $canvas, canvasContext, croppedSize, exportDefaults, exportZoom;
            if (!this.imageSrc) {
                return null;
            }
            exportDefaults = {
                type: "image/png",
                quality: .75,
                originalSize: false
            };
            options = $.extend({}, exportDefaults, options);
            croppedSize = {
                w: this.previewSize.w,
                h: this.previewSize.h
            };
            if (this.options.fitHeight && !this.options.fitWidth && this.imageSize.w * this.zoom < this.previewSize.w) {
                croppedSize.w = this.imageSize.w * this.zoom;
            } else if (this.options.fitWidth && !this.options.fitHeight && this.imageSize.h * this.zoom < this.previewSize.h) {
                croppedSize.h = this.imageSize.h * this.zoom;
            }
            exportZoom = options.originalSize ? 1 / this.zoom : this.options.exportZoom;
            $canvas = $("<canvas />").attr({
                style: "display: none;",
                width: croppedSize.w * exportZoom,
                height: croppedSize.h * exportZoom
            }).appendTo(this.$el);
            canvasContext = $canvas[0].getContext("2d");
            canvasContext.drawImage(this.$hiddenImage[0], this.offset.x * exportZoom, this.offset.y * exportZoom, this.zoom * exportZoom * this.imageSize.w, this.zoom * exportZoom * this.imageSize.h);
            return $canvas[0].toDataURL(options.type, options.quality);
        };
        Cropit.prototype.getImageState = function() {
            return {
                src: this.imageSrc,
                offset: this.offset,
                zoom: this.zoom
            };
        };
        Cropit.prototype.getImageSrc = function() {
            return this.imageSrc;
        };
        Cropit.prototype.getOffset = function() {
            return this.offset;
        };
        Cropit.prototype.getZoom = function() {
            return this.zoom;
        };
        Cropit.prototype.getImageSize = function() {
            if (!this.imageSize) {
                return null;
            }
            return {
                width: this.imageSize.w,
                height: this.imageSize.h
            };
        };
        Cropit.prototype.getPreviewSize = function() {
            return {
                width: this.previewSize.w,
                height: this.previewSize.h
            };
        };
        Cropit.prototype.setPreviewSize = function(size) {
            if (!((size != null ? size.width : void 0) > 0 && (size != null ? size.height : void 0) > 0)) {
                return;
            }
            this.previewSize = {
                w: size.width,
                h: size.height
            };
            this.$preview.css({
                width: this.previewSize.w,
                height: this.previewSize.h
            });
            if (this.options.imageBackground) {
                this.$imageBgContainer.css({
                    width: this.previewSize.w + this.options.imageBackgroundBorderWidth * 2,
                    height: this.previewSize.h + this.options.imageBackgroundBorderWidth * 2
                });
            }
            if (this.imageLoaded) {
                return this.setupZoomer();
            }
        };
        Cropit.prototype.round = function(x) {
            return Math.round(x * 1e5) / 1e5;
        };
        Cropit.prototype.$ = function(selector) {
            if (!this.$el) {
                return null;
            }
            return this.$el.find(selector);
        };
        return Cropit;
    }();
    var dataKey, methods;
    dataKey = "cropit";
    methods = {
        init: function(options) {
            return this.each(function() {
                var cropit;
                if (!$.data(this, dataKey)) {
                    cropit = new Cropit(this, options);
                    return $.data(this, dataKey, cropit);
                }
            });
        },
        isZoomable: function() {
            var cropit;
            cropit = this.first().data(dataKey);
            return cropit != null ? cropit.isZoomable() : void 0;
        },
        "export": function(options) {
            var cropit;
            cropit = this.first().data(dataKey);
            return cropit != null ? cropit.getCroppedImageData(options) : void 0;
        },
        imageState: function() {
            var cropit;
            cropit = this.first().data(dataKey);
            return cropit != null ? cropit.getImageState() : void 0;
        },
        imageSrc: function() {
            var cropit;
            cropit = this.first().data(dataKey);
            return cropit != null ? cropit.getImageSrc() : void 0;
        },
        offset: function(newOffset) {
            var cropit;
            if (newOffset != null && newOffset.x != null && newOffset.y != null) {
                return this.each(function() {
                    var cropit;
                    cropit = $.data(this, dataKey);
                    return cropit != null ? cropit.setOffset(newOffset) : void 0;
                });
            } else {
                cropit = this.first().data(dataKey);
                return cropit != null ? cropit.getOffset() : void 0;
            }
        },
        zoom: function(newZoom) {
            var cropit;
            if (newZoom != null) {
                return this.each(function() {
                    var cropit;
                    cropit = $.data(this, dataKey);
                    return cropit != null ? cropit.setZoom(newZoom) : void 0;
                });
            } else {
                cropit = this.first().data(dataKey);
                return cropit != null ? cropit.getZoom() : void 0;
            }
        },
        imageSize: function() {
            var cropit;
            cropit = this.first().data(dataKey);
            return cropit != null ? cropit.getImageSize() : void 0;
        },
        previewSize: function(newSize) {
            var cropit;
            if (newSize != null) {
                return this.each(function() {
                    var cropit;
                    cropit = $.data(this, dataKey);
                    return cropit != null ? cropit.setPreviewSize(newSize) : void 0;
                });
            } else {
                cropit = this.first().data(dataKey);
                return cropit != null ? cropit.getPreviewSize() : void 0;
            }
        }
    };
    $.fn.cropit = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, [].slice.call(arguments, 1));
        } else {
            return methods.init.apply(this, arguments);
        }
    };
})(window.jQuery);